import { Op } from "sequelize";
import { channelIds } from "../../../configs/ids.js";
import { client } from "../../../index.js";
import { fetchRequest } from "../../api/fetchRequest.js";
import { AuthData, RaidEvent } from "../../persistence/sequelize.js";
import { timer } from "../utilities.js";
const MINUTES_AFTER_RAID = 5;
const checkingUsers = new Set();
async function getOngoingRaids() {
    return RaidEvent.findAll({
        where: {
            time: {
                [Op.lt]: (Date.now() - MINUTES_AFTER_RAID * 60 * 1000) / 1000,
            },
        },
    });
}
async function getVoiceChannelMembersAuthData(voiceChannelMemberIds) {
    console.debug(`Fetching auth data for ${voiceChannelMemberIds.length} members`);
    return AuthData.findAll({ where: { discordId: { [Op.in]: voiceChannelMemberIds } } });
}
async function findMatchingRaid(voiceChannelMemberIds, ongoingRaids) {
    console.debug(`Finding matching raid for ${voiceChannelMemberIds.length} members`);
    for (const event of ongoingRaids) {
        const commonMembers = event.joined.filter((memberId) => voiceChannelMemberIds.includes(memberId));
        console.debug(`Found matching raid`, event.id);
        return event;
    }
    return null;
}
async function updateRaidStatus(oldState, newState) {
    if (checkingUsers.has((oldState || newState).id)) {
        return;
    }
    const discordId = (newState || oldState).id;
    checkingUsers.add((oldState || newState).id);
    console.debug(`CHECK STARTED FOR ${(oldState || newState).member?.displayName}`);
    if (oldState.channelId === newState.channelId || (newState.channel && newState.channel.parentId !== channelIds.raidCategory)) {
        return stopChecking();
    }
    const member = client.getCachedMembers().get((newState || oldState).id) || (await client.getCachedGuild().members.fetch((newState || oldState).id));
    if (!member) {
        console.error(`[Error code: 1714]`, newState);
        return stopChecking();
    }
    await timer(1000 * 30);
    await initiateChecking(true);
    async function initiateChecking(isFirstCheck) {
        console.debug(`CHECK INITIATED FOR ${(oldState || newState).member?.displayName}`);
        const voiceChannel = (await client.getCachedGuild().channels.fetch(newState.channelId || oldState.channelId));
        const voiceChannelMembers = voiceChannel.members;
        const voiceChannelMemberIds = voiceChannelMembers.map((member) => member.id);
        if (!voiceChannelMemberIds.includes(discordId)) {
            voiceChannelMemberIds.push(discordId);
        }
        const ongoingRaids = await getOngoingRaids();
        const raidEvent = await findMatchingRaid(voiceChannelMemberIds, ongoingRaids);
        if (!raidEvent) {
            console.debug(`Exit at point 3`);
            return stopChecking();
        }
        const voiceChannelMembersAuthData = await getVoiceChannelMembersAuthData(voiceChannelMemberIds);
        const userAuthData = voiceChannelMembersAuthData.find((record) => record.discordId === discordId);
        if (!userAuthData) {
            console.debug(`Exit at point 5`);
            return stopChecking();
        }
        const { platform, bungieId: membershipId } = userAuthData;
        const fireteamData = await checkFireteamRoster(userAuthData);
        if (!fireteamData) {
            console.error(`[Error code: 1719]`, membershipId, platform);
            return stopChecking();
        }
        const { partyMembers: fireteamMembers } = fireteamData;
        const userInFireteam = fireteamMembers.some((member) => member.membershipId === membershipId);
        const fireteamBungieIds = fireteamMembers.map((member) => member.membershipId);
        const raidMemberBungieIds = voiceChannelMembersAuthData.map((record) => record.bungieId);
        const matchingBungieIds = fireteamBungieIds.filter((id) => raidMemberBungieIds.includes(id));
        console.debug(`CHECK INITIATED FOR ${(oldState || newState).member?.displayName}`);
        if (userInFireteam && !raidEvent.joined.includes(discordId)) {
            console.debug(`Exit at point 6`);
            return stopChecking();
        }
        else if (!userInFireteam && raidEvent.joined.includes(discordId)) {
            console.debug(`Exit at point 7`);
            return stopChecking();
        }
        else if (userInFireteam && raidEvent.joined.includes(discordId)) {
            console.debug(`Exit at point 8`);
            return stopChecking();
        }
        else if (isFirstCheck) {
            initiateChecking(false);
        }
        else {
            console.debug(`Exit at point 9`);
            return stopChecking();
        }
    }
    async function doubleCheckRaidInDatabase(raidEvent) {
        console.debug(`DOUBLE CHECKED RAID IN DATABASE FOR ${(oldState || newState).member?.displayName}`);
        if (!raidEvent) {
            console.debug(`Exit at point 2`);
            return false;
        }
        const raidStillExists = await RaidEvent.findOne({ where: { time: raidEvent.time, id: raidEvent.id }, attributes: ["id"] });
        return !!raidStillExists;
    }
    async function checkFireteamRoster({ platform, bungieId: membershipId, accessToken, }) {
        console.debug(`CHECKED FIRETEAM ROSTER FOR ${(oldState || newState).member?.displayName}`);
        const fireteamData = await fetchRequest(`/Platform/Destiny2/${platform}/Profile/${membershipId}/?components=204,1000`, accessToken);
        if (!fireteamData || !fireteamData.characterActivities?.data) {
            console.error(`[Error code: 1717]`, fireteamData);
            return false;
        }
        if (!fireteamData.profileTransitoryData.data) {
            console.debug(`Exit at point 1 for ${(oldState || newState).member?.displayName}`);
            return false;
        }
        const characterIds = Object.keys(fireteamData.characterActivities.data);
        if (!fireteamData.characterActivities.data || characterIds.length === 0) {
            console.error(`[Error code: 1718]`, fireteamData);
            return false;
        }
        for (const characterId of characterIds) {
            const character = fireteamData.characterActivities.data[characterId];
            if (character.currentActivityModeType !== 4 || character.currentActivityModeHash !== 2043403989) {
                if (characterId === characterIds[characterIds.length - 1]) {
                    return false;
                }
                continue;
            }
            else {
                break;
            }
        }
        return fireteamData.profileTransitoryData.data;
    }
    function stopChecking() {
        console.debug(`Check ended for ${(newState || oldState).member?.displayName}`);
        checkingUsers.delete(discordId);
        return false;
    }
}
export default updateRaidStatus;
