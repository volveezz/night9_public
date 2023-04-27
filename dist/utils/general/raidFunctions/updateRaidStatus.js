import { ChannelType, EmbedBuilder } from "discord.js";
import { schedule } from "node-cron";
import { Op, Sequelize } from "sequelize";
import colors from "../../../configs/colors.js";
import { channelIds } from "../../../configs/ids.js";
import { client } from "../../../index.js";
import { fetchRequest } from "../../api/fetchRequest.js";
import { AuthData, RaidEvent } from "../../persistence/sequelize.js";
import { addButtonComponentsToMessage } from "../addButtonsToMessage.js";
import nameCleaner from "../nameClearer.js";
import { updatePrivateRaidMessage, updateRaidMessage } from "../raidFunctions.js";
const MINUTES_AFTER_RAID = 5;
const checkingRaids = new Set();
schedule("0 23 * * *", () => {
    updateRaidStatus();
});
async function updateRaidStatus() {
    const ongoingRaids = await getOngoingRaids();
    ongoingRaids.forEach((raidEvent) => {
        if (checkingRaids.has(raidEvent.id))
            return;
        checkingRaids.add(raidEvent.id);
        const startTime = new Date(raidEvent.time * 1000);
        const raidStartTimePlus5 = new Date(startTime.getTime() + MINUTES_AFTER_RAID * 60 * 1000);
        console.debug(`Checking raid ID: ${raidEvent.id}, time: ${raidEvent.time}, time + 5: ${Math.floor(raidStartTimePlus5.getTime() / 1000)}`);
        const checkFireteamStatus = async () => {
            const raidStillExists = await RaidEvent.findOne({ where: { id: raidEvent.id, time: raidEvent.time }, attributes: ["id"] });
            if (!raidStillExists) {
                console.debug(`Raid with ID: ${raidEvent.id} was deleted or time was changed`);
                return false;
            }
            const voiceChannels = (await client.getCachedGuild().channels.fetch()).filter((channel) => channel && channel.type === ChannelType.GuildVoice);
            if (!voiceChannels) {
                console.error(`[Error code: 1727]`, raidEvent.id);
                return false;
            }
            const raidVoiceChannel = voiceChannels.find((channel) => channel.members.hasAny(...raidEvent.joined));
            if (!raidVoiceChannel) {
                console.debug(`Raid voice channel was not found with joined members of raid id: ${raidEvent.id}`);
                return false;
            }
            const voiceChannelMembersAuthData = await getVoiceChannelMembersAuthData(raidVoiceChannel.members.map((member) => member.id));
            const fireteamData = await checkFireteamRoster(voiceChannelMembersAuthData);
            if (!fireteamData) {
                console.error(`[Error code: 1719]`, raidEvent.id);
                return false;
            }
            const { joinability, transitoryData: partyMembers } = fireteamData;
            console.debug("Joinability:", joinability);
            const fireteamBungieIds = partyMembers.map((member) => member.membershipId);
            const raidMemberBungieIds = voiceChannelMembersAuthData.map((record) => record.bungieId);
            const matchingBungieIds = fireteamBungieIds.filter((id) => raidMemberBungieIds.includes(id));
            const minMembers = Math.ceil(raidEvent.joined.length / 2);
            if (matchingBungieIds.length < minMembers) {
                console.debug(`Not enough matching Bungie IDs for raid ID: ${raidEvent.id}`);
                return false;
            }
            for (const memberAuthData of voiceChannelMembersAuthData) {
                const discordId = memberAuthData.discordId;
                const userInFireteam = partyMembers.some((member) => member.membershipId === memberAuthData.bungieId);
                const updateRaidDatabase = async (raidEvent) => {
                    const updatedData = userInFireteam && !raidEvent.joined.includes(discordId)
                        ? await updateRaidJoinedRoster(true, raidEvent, discordId)
                        : !userInFireteam && raidEvent.joined.includes(discordId)
                            ? await updateRaidJoinedRoster(false, raidEvent, discordId)
                            : null;
                    const updatedRaidEvent = updatedData ? updatedData[1][0] : raidEvent;
                    await Promise.all([
                        sendChannelEmbed(updatedRaidEvent),
                        updateRaidMessageEmbed(updatedRaidEvent),
                        updatePrivateRaidMessageEmbed(updatedRaidEvent),
                    ]);
                    return updatedData ? updatedData[0] : 0;
                };
                const sendChannelEmbed = async (raidEvent) => {
                    const member = await client.getAsyncMember(discordId);
                    const userAlreadyWasHotJoined = raidEvent.hotJoined.includes(discordId);
                    const userAlreadyWasAlt = raidEvent.alt.includes(discordId);
                    const userPreviousState = `${userAlreadyWasAlt ? "[Возможный участник]" : userAlreadyWasHotJoined ? "[Запас]" : "❌"}`;
                    const userNewState = `${userInFireteam ? "[Участник]" : "❌"}`;
                    const actionState = `${userPreviousState} -> ${userNewState}`;
                    const footerText = userInFireteam ? (userAlreadyWasHotJoined || userAlreadyWasAlt ? `перезаписан` : `записан`) : `выписан`;
                    const embed = new EmbedBuilder()
                        .setColor(userInFireteam ? colors.success : colors.error)
                        .setAuthor({
                        name: `${nameCleaner(member?.displayName || "неизвестный пользователь")}: ${actionState}`,
                        iconURL: member?.displayAvatarURL(),
                    })
                        .setFooter({
                        text: `Пользователь ${footerText} системой слежки за составом`,
                    });
                    const raidChannel = await client.getAsyncTextChannel(raidEvent.channelId);
                    raidChannel.send({ embeds: [embed] });
                    if (userInFireteam && !raidEvent.joined.includes(discordId)) {
                        raidChannel.permissionOverwrites.create(discordId, { ViewChannel: true });
                    }
                    else if (!userInFireteam && raidEvent.joined.includes(discordId)) {
                        raidChannel.permissionOverwrites.delete(discordId);
                    }
                };
                const updateRaidMessageEmbed = async (raidEvent) => {
                    const raidMessage = (await client.getAsyncTextChannel(channelIds.raid)).messages.fetch(raidEvent.messageId);
                    const updatedMessageOptions = await updateRaidMessage(raidEvent);
                    if (updatedMessageOptions) {
                        const { embeds, components } = updatedMessageOptions;
                        return (await raidMessage).edit({ embeds, components: await addButtonComponentsToMessage(components) });
                    }
                    return null;
                };
                const updatePrivateRaidMessageEmbed = async (raidEvent) => {
                    return await updatePrivateRaidMessage({ raidEvent });
                };
                const isUserAdded = await updateRaidDatabase(raidEvent);
                if (isUserAdded === 1) {
                    console.debug(`User ${discordId} was added to raid ${raidEvent.id}`);
                }
                else if (isUserAdded === 0) {
                    console.debug(`User ${discordId} was removed from raid ${raidEvent.id}`);
                }
                else {
                    console.error(`[Error code: 1718]`, raidEvent.id);
                    return;
                }
            }
        };
        setTimeout(() => {
            const interval = setInterval(async () => {
                console.debug(`Checking fireteam status for raid ID: ${raidEvent.id}`, raidStartTimePlus5.getTime() - Date.now());
                const checkFireteam = await checkFireteamStatus();
                if (checkFireteam === false) {
                    console.debug(`Interval cleared for raid ID: ${raidEvent.id}`);
                    clearInterval(interval);
                    checkingRaids.delete(raidEvent.id);
                }
            }, 1000 * 60 * 5);
        }, raidStartTimePlus5.getTime() - Date.now());
    });
}
async function getOngoingRaids() {
    return RaidEvent.findAll({
        where: {
            [Op.and]: [
                { time: { [Op.gt]: Math.floor(Date.now() / 1000) } },
                { time: { [Op.lte]: Math.floor(Math.floor(Date.now() / 1000) + 25 * 60 * 60) } },
            ],
        },
        attributes: ["id", "time", "joined", "hotJoined", "alt", "channelId", "inChannelMessageId", "messageId"],
    });
}
async function getVoiceChannelMembersAuthData(voiceChannelMemberIds) {
    console.debug(`Fetching auth data for ${voiceChannelMemberIds.length} members`);
    return AuthData.findAll({
        where: {
            discordId: {
                [Op.in]: voiceChannelMemberIds,
            },
        },
        attributes: ["platform", "bungieId", "discordId"],
    });
}
async function checkFireteamRoster(voiceChannelMembersAuthData) {
    for (const authData of voiceChannelMembersAuthData) {
        const destinyProfile = await fetchRequest(`Destiny2/${authData.platform}/Profile/${authData.bungieId}/?components=1000`);
        const transitoryData = destinyProfile?.profileTransitoryData?.data?.partyMembers;
        if (!transitoryData)
            return null;
        return { transitoryData, joinability: destinyProfile.profileTransitoryData.data.joinability };
    }
    return null;
}
async function updateRaidJoinedRoster(joined, raidEvent, discordId) {
    const updateOptions = joined
        ? {
            joined: Sequelize.fn("array_append", Sequelize.col("joined"), discordId),
            hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), discordId),
            alt: Sequelize.fn("array_remove", Sequelize.col("alt"), discordId),
        }
        : { joined: Sequelize.fn("array_remove", Sequelize.col("joined"), discordId) };
    const updatedData = await RaidEvent.update(updateOptions, {
        where: {
            id: raidEvent.id,
        },
        limit: 1,
        returning: true,
    });
    return updatedData;
}
export default updateRaidStatus;
