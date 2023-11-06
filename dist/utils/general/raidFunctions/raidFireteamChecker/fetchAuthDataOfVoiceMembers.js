import { Op } from "sequelize";
import tokenRefresher from "../../../../structures/tokenRefresher.js";
import { cachedRaidMembers } from "../../../persistence/dataStore.js";
import { AuthData } from "../../../persistence/sequelizeModels/authData.js";
async function fetchRaidVoiceChannelMembersAuthData(raidId, memberIds) {
    const cachedRaid = cachedRaidMembers.get(raidId);
    const latestRefreshTime = tokenRefresher.getLatestRefreshTime();
    if (cachedRaid) {
        const { lastCheckedTime, userDataList } = cachedRaid;
        if (lastCheckedTime === latestRefreshTime &&
            userDataList.length === memberIds.length &&
            userDataList.every((userData) => memberIds.includes(userData.discordId))) {
            return userDataList;
        }
        cachedRaidMembers.delete(raidId);
    }
    if (!latestRefreshTime) {
        console.error("[Error Code: 1994] The timestamp of the last token refresh was not found.");
    }
    const userDataList = await AuthData.findAll({
        where: {
            discordId: {
                [Op.in]: memberIds,
            },
        },
        attributes: ["platform", "bungieId", "discordId", "accessToken"],
    });
    cachedRaidMembers.set(raidId, { userDataList, lastCheckedTime: latestRefreshTime || 0 });
    return userDataList;
}
export default fetchRaidVoiceChannelMembersAuthData;
//# sourceMappingURL=fetchAuthDataOfVoiceMembers.js.map