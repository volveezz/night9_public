import { Op } from "sequelize";
import { activityRoles, guardianRankRoles, seasonalRoles, statisticsRoles, trialsRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import BungieAPIError from "../../structures/BungieAPIError.js";
import { sendApiRequest } from "../../utils/api/sendApiRequest.js";
import { getEndpointStatus, updateEndpointStatus } from "../../utils/api/statusCheckers/statusTracker.js";
import { destinyActivityChecker } from "../../utils/general/destinyActivityChecker.js";
import { pause } from "../../utils/general/utilities.js";
import { bungieNames, clanOnline, longOffline, userTimezones } from "../../utils/persistence/dataStore.js";
import { AuthData } from "../../utils/persistence/sequelizeModels/authData.js";
import { AutoRoleData } from "../../utils/persistence/sequelizeModels/autoRoleData.js";
import { UserActivityData } from "../../utils/persistence/sequelizeModels/userActivityData.js";
import clanMembersManagement from "../clanMembersManagement.js";
import assignDlcRoles from "./assignDlcRoles.js";
import { triumphsChecker } from "./checkUserTriumphs.js";
let isThrottleRequired = false;
async function checkUserStatisticsRoles({ platform, discordId, bungieId, accessToken, displayName, roleCategoriesBits, UserActivityData: userActivity }, member, roleDataFromDatabase, isEasyCheck = false) {
    const roleIdsForAdding = [];
    const roleIdsForRemoval = [];
    const hasRole = (roleId) => member.roles.cache.has(roleId);
    const hasAnyRole = (roleIds) => member.roles.cache.hasAny(...roleIds);
    const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,900,1100`, accessToken);
    if (!response) {
        console.error(`[Error code: 1751] Received error for ${platform}/${bungieId} ${displayName}`);
        isThrottleRequired = true;
        return;
    }
    try {
        const profileData = response.profile.data;
        if (profileData != null) {
            const { dateLastPlayed, userInfo, currentGuardianRank, seasonHashes, versionsOwned } = profileData;
            if (!bungieNames.get(discordId)) {
                const { displayName, bungieGlobalDisplayName: bungieName, bungieGlobalDisplayNameCode: bungieNameCode } = userInfo;
                const bungieCode = (bungieNameCode ?? "0000").toString().padStart(4, "0");
                bungieNames.set(discordId, `${bungieName ?? displayName}#${bungieCode}`);
            }
            const lastPlayedDate = new Date(dateLastPlayed).getTime();
            if (Date.now() - lastPlayedDate > 1000 * 60 * 60)
                longOffline.add(member.id);
            if (!hasRole(process.env.VERIFIED))
                roleIdsForAdding.push(process.env.VERIFIED);
            try {
                const userGuardianRank = currentGuardianRank;
                const guardianRankRoleId = (guardianRankRoles.ranks[userGuardianRank - 1] || guardianRankRoles.ranks[0]).roleId;
                if (!hasRole(guardianRankRoleId)) {
                    roleIdsForAdding.push(guardianRankRoleId);
                    roleIdsForRemoval.push(...guardianRankRoles.allRoles.filter((roleId) => roleId !== guardianRankRoleId));
                }
            }
            catch (error) {
                console.error("[Error code: 1644]", error);
            }
            const hasCurrentSeasonRole = hasRole(seasonalRoles.currentSeasonRole);
            const hasNonCurrentSeasonRole = hasRole(seasonalRoles.nonCurrentSeasonRole);
            const includesCurrentSeasonHash = seasonHashes.includes(profileData.currentSeasonHash);
            if (includesCurrentSeasonHash) {
                if (!hasCurrentSeasonRole)
                    roleIdsForAdding.push(seasonalRoles.currentSeasonRole);
                if (hasNonCurrentSeasonRole)
                    roleIdsForRemoval.push(seasonalRoles.nonCurrentSeasonRole);
            }
            else {
                if (!hasNonCurrentSeasonRole)
                    roleIdsForAdding.push(seasonalRoles.nonCurrentSeasonRole);
                if (hasCurrentSeasonRole)
                    roleIdsForRemoval.push(seasonalRoles.currentSeasonRole);
            }
            await assignDlcRoles({
                addRoles: roleIdsForAdding,
                member,
                removeRoles: roleIdsForRemoval,
                versionsOwned,
            });
        }
        else {
            console.error("[Error code: 2022] Profile data is null", response);
        }
        if (!isEasyCheck) {
            if (response.profileRecords.data) {
                await triumphsChecker({
                    hasRole,
                    member,
                    profileResponse: response.profileRecords.data,
                    roleCategoriesBits,
                    characterResponse: response.characterRecords.data,
                    roleData: roleDataFromDatabase,
                    roleIdsForAdding,
                    roleIdsForRemoval,
                });
            }
            if (roleCategoriesBits & 2 && response.metrics.data) {
                const metrics = response.metrics.data.metrics["1765255052"]?.objectiveProgress?.progress;
                if (metrics == null || isNaN(metrics)) {
                    console.error(`[Error code: 1227] ${metrics} ${member.displayName}`, response.metrics.data.metrics["1765255052"]?.objectiveProgress);
                    return;
                }
                else if (metrics > 0) {
                    for (const step of trialsRoles.roles) {
                        if (step.totalFlawless <= metrics) {
                            if (!hasRole(trialsRoles.category))
                                roleIdsForAdding.push(trialsRoles.category);
                            if (!hasRole(step.roleId)) {
                                roleIdsForAdding.push(step.roleId);
                                roleIdsForRemoval.push(...trialsRoles.allRoles.filter((r) => r != step.roleId));
                            }
                            break;
                        }
                    }
                }
            }
            if (roleCategoriesBits & 16) {
                if (!userActivity) {
                    if (hasAnyRole(activityRoles.allVoice))
                        roleIdsForRemoval.push(...activityRoles.allVoice);
                    if (hasAnyRole(activityRoles.allMessages))
                        roleIdsForRemoval.push(...activityRoles.allMessages);
                    if (hasRole(activityRoles.category))
                        roleIdsForRemoval.push(activityRoles.category);
                }
                else {
                    for (const step of activityRoles.voice) {
                        if (step.voiceMinutes <= userActivity.voice) {
                            if (!hasRole(step.roleId)) {
                                if (!hasRole(activityRoles.category))
                                    roleIdsForAdding.push(activityRoles.category);
                                roleIdsForAdding.push(step.roleId);
                                roleIdsForRemoval.push(...activityRoles.allVoice.filter((r) => r != step.roleId));
                            }
                            break;
                        }
                    }
                    for (const step of activityRoles.messages) {
                        if (step.messageCount <= userActivity.messages) {
                            if (!hasRole(step.roleId)) {
                                if (!hasRole(activityRoles.category))
                                    roleIdsForAdding.push(activityRoles.category);
                                roleIdsForAdding.push(step.roleId);
                                roleIdsForRemoval.push(...activityRoles.allMessages.filter((r) => r != step.roleId));
                            }
                            break;
                        }
                    }
                }
            }
        }
        if (roleIdsForRemoval.length > 0) {
            await member.roles
                .remove(roleIdsForRemoval, "Role(s) removed by autorole system")
                .catch((e) => console.error(`[Error code: 1226] Error during removing roles`, e, roleIdsForRemoval));
        }
        if (roleIdsForAdding.length > 0) {
            await member.roles
                .add(roleIdsForAdding, "Role(s) added by autorole system")
                .catch((e) => console.error("[Error code: 1097] Error during adding roles", e, roleIdsForAdding));
        }
    }
    catch (e) {
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1229] ${e.statusCode}`);
        else
            console.error("[Error code: 1230]", e.error?.stack || e.error || e, e.statusCode);
    }
}
async function checkUserKDRatio({ platform, bungieId, accessToken }, member) {
    if (getEndpointStatus("account") !== 1)
        return;
    try {
        const request = await sendApiRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
        if (!request) {
            isThrottleRequired = true;
            return;
        }
        if (!request.mergedAllCharacters?.results) {
            isThrottleRequired = true;
            console.error(`[Error code: 1634] Got error ${request?.ErrorStatus} during checking KD of ${member.displayName}`);
            return;
        }
        if (!request.mergedAllCharacters.results.allPvP.allTime ||
            !request.mergedAllCharacters.results.allPvP.allTime.killsDeathsRatio?.basic?.value)
            return await member.roles.add([statisticsRoles.allKd[statisticsRoles.allKd.length - 1], process.env.STATISTICS_CATEGORY]);
        for (const step of statisticsRoles.kd) {
            if (step.kd <= request?.mergedAllCharacters?.results?.allPvP?.allTime?.killsDeathsRatio?.basic.value) {
                const hasRole = (roleId) => member.roles.cache.has(roleId);
                const hasAnyRole = (roleIds) => member.roles.cache.hasAny(...roleIds);
                const addedRoles = [];
                if (!hasRole(process.env.STATISTICS_CATEGORY)) {
                    addedRoles.push(process.env.STATISTICS_CATEGORY);
                }
                const rolesExceptTheNeeded = statisticsRoles.allKd.filter((r) => r !== step.roleId);
                if (hasAnyRole(rolesExceptTheNeeded)) {
                    await member.roles.remove(rolesExceptTheNeeded);
                }
                if (!hasRole(step.roleId)) {
                    await member.roles.add([step.roleId, ...addedRoles]);
                }
                break;
            }
        }
    }
    catch (e) {
        if (e instanceof BungieAPIError && e.errorCode) {
            console.error(`[Error code: 2049] Received ${e.errorCode}/${e.errorStatus} error during checking KD of ${member.displayName}`);
            updateEndpointStatus("account", e.errorCode);
        }
        else if (e.statusCode >= 400 || e.statusCode <= 599) {
            console.error(`[Error code: 1219] ${e.statusCode} error for ${bungieId}`);
        }
        else {
            isThrottleRequired = true;
            console.error("[Error code: 1016]", e.error?.message || e.message || e.error?.name || e.name, bungieId, e.statusCode || e, e?.ErrorStatus);
        }
    }
}
async function handleMemberStatistics() {
    (async () => {
        try {
            const userDatabaseDataPromise = AuthData.findAll({
                attributes: ["discordId", "platform", "bungieId", "clan", "timezone", "accessToken", "roleCategoriesBits"],
            });
            const autoRoleDataPromise = AutoRoleData.findAll({
                where: {
                    available: {
                        [Op.or]: {
                            [Op.gte]: 1,
                            [Op.eq]: -99,
                        },
                    },
                },
            });
            const [userDatabaseData, autoRoleData] = await Promise.all([userDatabaseDataPromise, autoRoleDataPromise]);
            const cachedMembers = client.getCachedMembers();
            for (const userData of userDatabaseData) {
                const cachedMember = cachedMembers.get(userData.discordId);
                if (!userData.clan && cachedMember) {
                    checkUserStatisticsRoles(userData, cachedMember, autoRoleData, true);
                }
                if (userData.timezone) {
                    userTimezones.set(userData.discordId, userData.timezone);
                }
                if (!cachedMember)
                    continue;
                await pause(1000);
                destinyActivityChecker({ authData: userData, member: cachedMember, mode: 4, count: 250 });
            }
        }
        catch (error) {
            console.error("[Error code: 1918]", error);
        }
    })();
    async function startStatisticsChecking() {
        try {
            const autoRoleDataPromise = AutoRoleData.findAll({
                where: {
                    available: {
                        [Op.or]: {
                            [Op.gte]: 1,
                            [Op.eq]: -99,
                        },
                    },
                },
            });
            const rawDatabaseDataPromise = AuthData.findAll({
                attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "accessToken", "roleCategoriesBits"],
                include: UserActivityData,
            });
            const cachedMembers = client.getCachedMembers();
            const [autoRoleData, rawDatabaseData] = await Promise.all([autoRoleDataPromise, rawDatabaseDataPromise]);
            rawDatabaseData
                .filter((data) => !cachedMembers.has(data.discordId))
                .forEach((val) => {
                console.debug(`[Error code: 1021] ${val.displayName}/${val.discordId} not found on server`);
            });
            const validatedDatabaseData = rawDatabaseData.filter((data) => cachedMembers.has(data.discordId));
            if (!validatedDatabaseData || validatedDatabaseData.length === 0) {
                return console.error(`[Error code: 1022] DB is ${validatedDatabaseData ? `${validatedDatabaseData.length} size` : "not available"}`);
            }
            async function processUsers() {
                if (getEndpointStatus("account") !== 1)
                    return;
                for (const userData of validatedDatabaseData) {
                    const { discordId, displayName, roleCategoriesBits } = userData;
                    const randomValue = Math.floor(Math.random() * 100);
                    if (isThrottleRequired) {
                        isThrottleRequired = false;
                        return;
                    }
                    else if (longOffline.has(discordId)) {
                        if (randomValue > 90 || clanOnline.has(discordId))
                            longOffline.delete(discordId);
                        continue;
                    }
                    const member = cachedMembers.get(discordId);
                    if (!member) {
                        await client.getCachedGuild().members.fetch();
                        console.error(`[Error code: 1023] Member ${displayName} not found`);
                        continue;
                    }
                    if (member.roles.cache.has(process.env.CLANMEMBER) ||
                        (userData.UserActivityData && (userData.UserActivityData.voice > 120 || userData.UserActivityData.messages > 5))) {
                        switch (true) {
                            case randomValue <= 30:
                                checkUserStats();
                                checkCompletedRaidStats();
                                break;
                            case randomValue <= 45:
                                checkUserStats();
                                break;
                            case randomValue < 60:
                                checkUserStats();
                                checkTrialsKDStats();
                                break;
                            case randomValue <= 80:
                                checkUserStats();
                                break;
                            default:
                                checkUserKDRatioStats();
                                break;
                        }
                        await pause(1000);
                    }
                    else if (!userData.UserActivityData) {
                        console.error("[Error code: 2114] User has no user activity data", userData.discordId);
                    }
                    function checkUserStats() {
                        checkUserStatisticsRoles(userData, member, autoRoleData);
                    }
                    function checkUserKDRatioStats() {
                        if (roleCategoriesBits & 1) {
                            checkUserKDRatio(userData, member);
                        }
                    }
                    function checkCompletedRaidStats() {
                        if (member.roles.cache.hasAny(process.env.CLANMEMBER, process.env.MEMBER)) {
                            destinyActivityChecker({ authData: userData, member, mode: 4 });
                        }
                    }
                    function checkTrialsKDStats() {
                        if (roleCategoriesBits & 2 &&
                            !member.roles.cache.has(trialsRoles.wintrader) &&
                            member.roles.cache.has(trialsRoles.category)) {
                            destinyActivityChecker({ authData: userData, member, mode: 84 });
                        }
                    }
                }
            }
            await Promise.all([processUsers(), clanMembersManagement(validatedDatabaseData)]);
        }
        catch (error) {
            console.error("[Error code: 1921]", error.stack || error);
        }
        finally {
            setTimeout(startStatisticsChecking, 1000 * 60 * 2);
        }
    }
    setTimeout(startStatisticsChecking, 1000 * 60 * 2);
}
async function checkIndiviualUserStatistics(user) {
    const userId = typeof user === "string" ? user : user.id;
    const memberPromise = client.getMember(userId);
    const databasePromise = AuthData.findOne({
        where: { discordId: userId },
        attributes: ["discordId", "bungieId", "platform", "accessToken", "displayName", "roleCategoriesBits"],
        include: UserActivityData,
    });
    const autoRoleDataPromise = AutoRoleData.findAll({
        where: {
            available: {
                [Op.or]: {
                    [Op.gte]: 1,
                    [Op.eq]: -99,
                },
            },
        },
    });
    const [databaseData, member, autoRoleData] = await Promise.all([databasePromise, memberPromise, autoRoleDataPromise]);
    if (!member || !databaseData) {
        console.error(`[Error code: 1737]`, member.id);
        return;
    }
    await checkUserStatisticsRoles(databaseData, member, autoRoleData, true);
    await destinyActivityChecker({ authData: databaseData, member, mode: 4, count: 250 });
}
export { checkIndiviualUserStatistics };
export default handleMemberStatistics;
//# sourceMappingURL=userStatisticsManagement.js.map