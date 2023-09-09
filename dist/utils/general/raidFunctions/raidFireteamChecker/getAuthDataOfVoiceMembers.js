import { Op } from "sequelize";
import tokenRefresher from "../../../../structures/tokenRefresher.js";
import { AuthData } from "../../../persistence/sequelize.js";
export const previouslyCheckedFireteamMembers = new Map();
async function getVoiceChannelMembersAuthData(raidId, voiceChannelMemberIds) {
    const previouslyCheckedRaid = previouslyCheckedFireteamMembers.get(raidId);
    const lastRefreshTime = tokenRefresher.getLatestRefreshTime();
    if (previouslyCheckedRaid) {
        const { lastRequestTime, usersData } = previouslyCheckedRaid;
        if (lastRequestTime === lastRefreshTime &&
            usersData.length === voiceChannelMemberIds.length &&
            usersData.every((r) => voiceChannelMemberIds.includes(r.discordId))) {
            return usersData;
        }
        previouslyCheckedFireteamMembers.delete(raidId);
        console.debug(`Saved authData of users in ${raidId} was deleted as it became old`);
    }
    if (!lastRefreshTime) {
        console.error("[Error code: 1994] Time of the last token refresh wasn't found");
    }
    const usersData = await AuthData.findAll({
        where: {
            discordId: {
                [Op.in]: voiceChannelMemberIds,
            },
        },
        attributes: ["platform", "bungieId", "discordId", "accessToken"],
    });
    previouslyCheckedFireteamMembers.set(raidId, { usersData, lastRequestTime: lastRefreshTime || 0 });
    return usersData;
}
export default getVoiceChannelMembersAuthData;
//# sourceMappingURL=getAuthDataOfVoiceMembers.js.map