import { ChannelType, EmbedBuilder } from "discord.js";
import { Sequelize } from "sequelize";
import colors from "../../../../configs/colors.js";
import { client } from "../../../../index.js";
import { sendApiRequest } from "../../../api/sendApiRequest.js";
import { getEndpointStatus } from "../../../api/statusCheckers/statusTracker.js";
import { RaidEvent } from "../../../persistence/sequelize.js";
import nameCleaner from "../../nameClearer.js";
import { getRaidNameFromHash, updateRaidMessage } from "../../raidFunctions.js";
import updatePrivateRaidMessage from "../privateMessage/updatePrivateMessage.js";
import getVoiceChannelMembersAuthData, { previouslyCheckedFireteamMembers } from "./getAuthDataOfVoiceMembers.js";
import raidFireteamChecker from "./raidFireteamChecker.js";
const countOfChecksMap = new Map();
async function checkFireteamStatus(raidData) {
    const { id: raidId, time: initialRaidTime } = raidData;
    let badCheckAttempt = countOfChecksMap.get(raidId) || 0;
    const raidEvent = await RaidEvent.findByPk(raidId, {
        attributes: ["id", "time", "joined", "hotJoined", "alt", "channelId", "inChannelMessageId", "messageId", "raid"],
    });
    if (!raidEvent || raidEvent.time != initialRaidTime) {
        if (raidEvent) {
            setTimeout(() => {
                raidFireteamChecker(raidEvent.id);
            }, 1000);
            console.debug(`Raid with ID: ${raidId} has changed time, rescheduling update`);
        }
        return false;
    }
    else if (!raidEvent.time || !initialRaidTime) {
        console.trace("[Error code: 1989]", raidEvent.id, raidEvent.time, raidId, initialRaidTime);
    }
    const voiceChannels = (await client.getCachedGuild().channels.fetch()).filter((channel) => channel && channel.type === ChannelType.GuildVoice);
    if (!voiceChannels) {
        console.error("[Error code: 1727]", raidEvent.id);
        return false;
    }
    const raidVoiceChannel = voiceChannels.find((channel) => channel.members.hasAny(...raidEvent.joined));
    if (!raidVoiceChannel) {
        console.debug(`Raid voice channel was not found with joined members of raid id: ${raidEvent.id}`);
        return false;
    }
    const userIds = [...new Set([...raidEvent.joined, ...raidVoiceChannel.members.map((member) => member.id)])];
    const voiceChannelMembersAuthData = await getVoiceChannelMembersAuthData(raidId, userIds);
    const partyMembers = await checkFireteamRoster(voiceChannelMembersAuthData, raidEvent.raid, raidId);
    if (!partyMembers) {
        console.error("[Error code: 2021] Didn't managed to get the fireteam activity data", partyMembers, raidEvent.raid, raidId);
        if (badCheckAttempt < 9) {
            countOfChecksMap.set(raidId, badCheckAttempt + 1);
            return true;
        }
        return false;
    }
    const fireteamBungieIds = partyMembers.map((member) => member.membershipId);
    const raidMemberBungieIds = voiceChannelMembersAuthData.map((record) => record.bungieId);
    const matchingBungieIds = fireteamBungieIds.filter((id) => raidMemberBungieIds.includes(id));
    const minMembers = Math.ceil(raidEvent.joined.length / 2);
    if (matchingBungieIds.length < minMembers) {
        console.debug(`Not enough matching Bungie IDs for raid ID: ${raidEvent.id}`);
        if (badCheckAttempt < 5) {
            countOfChecksMap.set(raidId, badCheckAttempt + 1);
            return true;
        }
        return false;
    }
    if (badCheckAttempt != 0) {
        badCheckAttempt = 0;
        countOfChecksMap.delete(raidId);
    }
    for (const memberAuthData of voiceChannelMembersAuthData) {
        const { discordId, bungieId } = memberAuthData;
        const userInFireteam = partyMembers.some((member) => member.membershipId === bungieId);
        if ((raidEvent.joined.includes(discordId) && userInFireteam) ||
            (raidEvent.hotJoined.includes(discordId) && !userInFireteam) ||
            (!raidEvent.joined.includes(discordId) && !userInFireteam))
            continue;
        const updateRaidDatabase = async (raidEvent) => {
            const updatedData = userInFireteam && !raidEvent.joined.includes(discordId)
                ? await updateRaidJoinedRoster(true, raidEvent, discordId)
                : !userInFireteam && raidEvent.joined.includes(discordId)
                    ? await updateRaidJoinedRoster(false, raidEvent, discordId)
                    : null;
            const updatedRaidEvent = updatedData ? updatedData[1][0] : raidEvent;
            await Promise.all([sendChannelEmbed(), updateRaidMessageEmbed(updatedRaidEvent), updatePrivateRaidMessage(updatedRaidEvent)]);
            return updatedData ? updatedData[0] : 0;
        };
        const sendChannelEmbed = async () => {
            const member = await client.getAsyncMember(discordId);
            const userAlreadyWasJoined = raidEvent.joined.includes(member.id);
            const userAlreadyWasHotJoined = raidEvent.hotJoined.includes(member.id);
            const userAlreadyWasAlt = raidEvent.alt.includes(member.id);
            const userPreviousState = `${userAlreadyWasAlt ? "[Возможный участник]" : userAlreadyWasHotJoined ? "[Запас]" : userAlreadyWasJoined ? "[Участник]" : "❌"}`;
            const userNewState = `${userInFireteam ? "[Участник]" : "❌"}`;
            const actionState = `${userPreviousState} -> ${userNewState}`;
            const footerText = userInFireteam ? (userAlreadyWasHotJoined || userAlreadyWasAlt ? "перезаписан" : "записан") : "выписан";
            const embed = new EmbedBuilder()
                .setColor(userInFireteam ? colors.success : colors.error)
                .setAuthor({
                name: `${nameCleaner(member?.displayName || "неизвестный пользователь")}: ${actionState}`,
                iconURL: member?.displayAvatarURL(),
            })
                .setFooter({
                text: `Пользователь ${footerText} системой слежки за составом`,
            });
            const raidChannel = client.getCachedTextChannel(raidEvent.channelId);
            await raidChannel.send({ embeds: [embed] });
            if (userInFireteam && !raidEvent.joined.includes(discordId)) {
                await raidChannel.permissionOverwrites.create(discordId, { ViewChannel: true });
            }
            else if (!userInFireteam && raidEvent.joined.includes(discordId)) {
                await raidChannel.permissionOverwrites.delete(discordId);
            }
        };
        const updateRaidMessageEmbed = async (raidEvent) => {
            console.debug("Updating raid message embed");
            const updatedMessageOptions = await updateRaidMessage({ raidEvent });
            return updatedMessageOptions;
        };
        const isUserAdded = await updateRaidDatabase(raidEvent);
        if (isUserAdded === 1) {
            console.debug(`User ${discordId} was updated in the raid ${raidEvent.id}`);
        }
        else if (isUserAdded === 0) {
            console.debug(`User ${discordId} wasn't changed in the raid ${raidEvent.id}`);
        }
        else {
            console.error("[Error code: 1718]", raidEvent.id);
            return;
        }
    }
}
async function checkFireteamRoster(voiceChannelMembersAuthData, raidName, raidId) {
    if (getEndpointStatus("account") !== 1)
        return null;
    for (const authData of voiceChannelMembersAuthData) {
        try {
            const destinyProfile = await sendApiRequest(`/Platform/Destiny2/${authData.platform}/Profile/${authData.bungieId}/?components=204,1000`, authData.accessToken);
            const partyMembers = destinyProfile?.profileTransitoryData?.data?.partyMembers;
            const characterActivities = destinyProfile.characterActivities.data;
            if (!partyMembers || !characterActivities)
                continue;
            for (const characterId in characterActivities) {
                const { currentActivityHash, currentActivityModeType, currentActivityModeTypes } = characterActivities[characterId];
                if (currentActivityHash === 82913930 || currentActivityHash === 0)
                    continue;
                if ((currentActivityModeType && currentActivityModeType === 4) ||
                    (currentActivityModeTypes && currentActivityModeTypes.includes(4)) ||
                    (!currentActivityModeType && getRaidNameFromHash(currentActivityHash) !== "unknown")) {
                    const activityName = getRaidNameFromHash(currentActivityHash).replace("Master", "");
                    if (activityName !== raidName) {
                        continue;
                    }
                    return partyMembers;
                }
            }
        }
        catch (error) {
            console.error("[Error code: 2020]", error);
            previouslyCheckedFireteamMembers.delete(raidId);
        }
    }
    return null;
}
async function updateRaidJoinedRoster(joined, raidEvent, discordId) {
    console.debug(`Updating raid ID: ${raidEvent.id} joined roster`);
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
        returning: ["id", "time", "joined", "hotJoined", "alt", "channelId", "inChannelMessageId", "messageId", "raid", "difficulty"],
    });
    return updatedData;
}
export default checkFireteamStatus;
//# sourceMappingURL=checkFireteamStatus.js.map