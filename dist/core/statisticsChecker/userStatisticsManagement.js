import { Op } from "sequelize";
import { dungeonsTriumphHashes } from "../../configs/roleRequirements.js";
import { activityRoles, guardianRankRoles, seasonalRoles, statisticsRoles, trialsRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import { sendApiRequest } from "../../utils/api/sendApiRequest.js";
import { getEndpointStatus } from "../../utils/api/statusCheckers/statusTracker.js";
import { destinyActivityChecker } from "../../utils/general/destinyActivityChecker.js";
import { pause } from "../../utils/general/utilities.js";
import { bungieNames, clanOnline, longOffline, userTimezones } from "../../utils/persistence/dataStore.js";
import { AuthData, AutoRoleData, UserActivityData } from "../../utils/persistence/sequelize.js";
import clanMembersManagement from "../clanMembersManagement.js";
import assignDlcRoles from "./assignDlcRoles.js";
const throttleSet = new Set();
const dungeonRoles = await AutoRoleData.findAll({ where: { category: 8 } }).then((rolesData) => {
    return rolesData.filter((roleData) => dungeonsTriumphHashes.includes(roleData.triumphRequirement)).map((r) => r.roleId);
});
async function checkUserStatisticsRoles({ platform, discordId, bungieId, accessToken, displayName, roleCategoriesBits, UserActivityData: userActivity }, member, roleDataFromDatabase, isEasyCheck = false) {
    console.debug("Checking", member.displayName);
    const roleIdsForAdding = [];
    const roleIdForRemoval = [];
    const hasRole = (roleId) => member.roles.cache.has(roleId);
    const hasAnyRole = (roleIds) => member.roles.cache.hasAny(...roleIds);
    const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,900,1100`, accessToken);
    if (!response) {
        console.error(`[Error code: 1751] Received error for ${platform}/${bungieId} ${displayName}`);
        return;
    }
    try {
        const profileData = response.profile.data;
        if (profileData != null) {
            const { dateLastPlayed, userInfo, currentGuardianRank, seasonHashes, versionsOwned } = profileData;
            console.debug("Continuing to checking", bungieNames.get(discordId));
            if (!bungieNames.get(discordId)) {
                console.debug("Found that", discordId, "doesn't have a saved bungie name");
                const { displayName, bungieGlobalDisplayName: bungieName, bungieGlobalDisplayNameCode: bungieNameCode } = userInfo;
                const bungieCode = (bungieNameCode ?? "0000").toString().padStart(4, "0");
                bungieNames.set(discordId, `${bungieName ?? displayName}#${bungieCode}`);
            }
            const lastPlayedDate = new Date(dateLastPlayed).getTime();
            if (Date.now() - lastPlayedDate > 1000 * 60 * 60 * 2)
                longOffline.add(member.id);
            if (!hasRole(process.env.VERIFIED))
                roleIdsForAdding.push(process.env.VERIFIED);
            try {
                const userGuardianRank = currentGuardianRank;
                const guardianRankRoleId = (guardianRankRoles.ranks[userGuardianRank - 1] || guardianRankRoles.ranks[0]).roleId;
                if (!hasRole(guardianRankRoleId)) {
                    roleIdsForAdding.push(guardianRankRoleId);
                    roleIdForRemoval.push(...guardianRankRoles.allRoles.filter((roleId) => roleId !== guardianRankRoleId));
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
                    roleIdForRemoval.push(seasonalRoles.nonCurrentSeasonRole);
            }
            else {
                if (!hasNonCurrentSeasonRole)
                    roleIdsForAdding.push(seasonalRoles.nonCurrentSeasonRole);
                if (hasCurrentSeasonRole)
                    roleIdForRemoval.push(seasonalRoles.currentSeasonRole);
            }
            await assignDlcRoles({
                addRoles: roleIdsForAdding,
                member,
                removeRoles: roleIdForRemoval,
                versionsOwned,
            });
        }
        else {
            console.error("[Error code: 2022] Profile data is null", response);
        }
        async function triumphsChecker() {
            if (roleCategoriesBits & 1 && response.profileRecords.data) {
                const activeTriumphs = response.profileRecords.data.activeScore;
                for (const step of statisticsRoles.active) {
                    if (activeTriumphs >= step.triumphScore) {
                        if (!hasRole(process.env.STATISTICS_CATEGORY))
                            roleIdsForAdding.push(process.env.STATISTICS_CATEGORY);
                        if (!hasRole(step.roleId)) {
                            roleIdsForAdding.push(step.roleId);
                            roleIdForRemoval.push(...statisticsRoles.allActive.filter((r) => r !== step.roleId));
                        }
                        break;
                    }
                }
            }
            if (!response.profileRecords.data)
                return;
            roleDataFromDatabase.forEach(async (role) => {
                if (!response.profileRecords.data)
                    return;
                if (role.category === 4 && !(roleCategoriesBits & 4))
                    return;
                if (role.category === 8 && !(roleCategoriesBits & 8))
                    return;
                if (role.gildedTriumphRequirement) {
                    if (response.profileRecords.data.records[role.gildedTriumphRequirement]) {
                        const triumphRecord = response.profileRecords.data.records[role.gildedTriumphRequirement];
                        if (triumphRecord && triumphRecord.completedCount && triumphRecord.completedCount > 0) {
                            const index = triumphRecord.completedCount;
                            if (role.gildedRoles && role.gildedRoles.at(index - 1) && role.gildedRoles.at(index - 1).toLowerCase() !== "null") {
                                if (!hasRole(process.env.TITLE_CATEGORY))
                                    roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                                if (!hasRole(role.gildedRoles.at(index - 1))) {
                                    roleIdsForAdding.push(role.gildedRoles.at(index - 1));
                                    roleIdForRemoval.push(role.roleId, ...role.gildedRoles.filter((r) => r !== role.gildedRoles.at(index - 1)));
                                    if (role.available && role.available > 0) {
                                        if (role.available === 1) {
                                            await AutoRoleData.update({ available: 0 }, { where: { roleId: role.roleId } });
                                        }
                                        else {
                                            await AutoRoleData.decrement("available", { by: 1, where: { roleId: role.roleId } });
                                        }
                                    }
                                }
                            }
                            else {
                                var lastKnownRole = role.roleId;
                                for (let i = 0; i < index; i++) {
                                    const element = role.gildedRoles[i];
                                    if ((!element || element?.toLowerCase() === "null") && i === index - 1) {
                                        const nonGuildedRole = member.guild.roles.cache.get(role.roleId);
                                        if (nonGuildedRole &&
                                            member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`) !== undefined) {
                                            if (!hasRole(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id)) {
                                                roleIdsForAdding.push(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id);
                                                roleIdForRemoval.push(role.roleId, ...role.gildedRoles.filter((r) => r !== member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id));
                                                return;
                                            }
                                            else {
                                                return;
                                            }
                                        }
                                        else if (!nonGuildedRole) {
                                            return console.error(`[Error code: 1089] Not found previous role of ${role.triumphRequirement}`, lastKnownRole, nonGuildedRole);
                                        }
                                        const createdRole = await member.guild.roles.create({
                                            name: `⚜️${nonGuildedRole.name} ${i + 1}`,
                                            color: "#ffb300",
                                            permissions: [],
                                            position: nonGuildedRole.position,
                                            reason: "Auto auto-role creation",
                                        });
                                        const dbRoleUpdated = await AutoRoleData.findOne({
                                            where: { gildedTriumphRequirement: role.gildedTriumphRequirement },
                                        });
                                        if (!dbRoleUpdated)
                                            return console.error("[Error code: 1756] No information about role in database");
                                        dbRoleUpdated.gildedRoles[i] = createdRole.id;
                                        for (let i = 0; i < index || i < dbRoleUpdated.gildedRoles.length; i++) {
                                            const element = dbRoleUpdated.gildedRoles ? dbRoleUpdated.gildedRoles[i] : undefined;
                                            if (!element || element === undefined || element?.toLowerCase() === "null")
                                                dbRoleUpdated.gildedRoles[i] = "null";
                                        }
                                        if (!hasRole(process.env.TITLE_CATEGORY))
                                            roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                                        roleIdsForAdding.push(createdRole.id);
                                        roleIdForRemoval.push(role.roleId, ...dbRoleUpdated.gildedRoles.filter((r) => r !== createdRole.id));
                                        await AutoRoleData.update({ gildedRoles: dbRoleUpdated.gildedRoles }, { where: { gildedTriumphRequirement: dbRoleUpdated.gildedTriumphRequirement } });
                                        break;
                                    }
                                    else if (element && element.toLowerCase() !== "null") {
                                        lastKnownRole = element;
                                    }
                                    else {
                                        role.gildedRoles[i] = "null";
                                    }
                                }
                            }
                        }
                        else if (response.profileRecords.data.records[Number(role.triumphRequirement)]) {
                            const notGuidedTriumphRecord = response.profileRecords.data.records[Number(role.triumphRequirement)];
                            if (notGuidedTriumphRecord.objectives
                                ? notGuidedTriumphRecord.objectives?.pop()?.complete === true
                                : notGuidedTriumphRecord.intervalObjectives?.pop()?.complete === true) {
                                if (!hasRole(role.roleId)) {
                                    if (role.category & 4 && !hasRole(process.env.TITLE_CATEGORY))
                                        roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                                    roleIdsForAdding.push(role.roleId);
                                }
                            }
                        }
                    }
                    else {
                        console.error(`[Error code: 1090] Profile record ${role.gildedTriumphRequirement} not found for ${member.displayName}`);
                    }
                }
                else if (response.characterRecords.data) {
                    const triumphHash = role.triumphRequirement;
                    const triumphRecord = response.profileRecords.data.records[triumphHash] ||
                        response.characterRecords.data[Object.keys(response.characterRecords.data)[0]].records[triumphHash];
                    const objective = triumphRecord.objectives
                        ? triumphRecord.objectives[triumphRecord.objectives.length - 1]
                        : triumphRecord.intervalObjectives[triumphRecord.intervalObjectives.length - 1];
                    if (dungeonsTriumphHashes.includes(triumphHash)) {
                        if (objective.complete === true) {
                            if (hasRole(process.env.DUNGEON_MASTER_ROLE)) {
                                return;
                            }
                            if (member.roles.cache.hasAll(...dungeonRoles) && !roleIdsForAdding.includes(process.env.DUNGEON_MASTER_ROLE)) {
                                roleIdsForAdding.push(process.env.DUNGEON_MASTER_ROLE);
                                roleIdForRemoval.push(...dungeonRoles);
                            }
                        }
                        else {
                            if (hasRole(process.env.DUNGEON_MASTER_ROLE)) {
                                roleIdForRemoval.push(process.env.DUNGEON_MASTER_ROLE);
                                if (!roleIdsForAdding.includes(role.roleId)) {
                                    roleIdsForAdding.push(role.roleId);
                                }
                            }
                        }
                    }
                    if (objective && objective.complete === true) {
                        if (role.category === 4 && !hasRole(process.env.TITLE_CATEGORY))
                            roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                        if (role.category === 8 && !hasRole(process.env.TRIUMPHS_CATEGORY))
                            roleIdsForAdding.push(process.env.TRIUMPHS_CATEGORY);
                        if (role.category === 16 && !hasRole(activityRoles.category))
                            roleIdsForAdding.push(activityRoles.category);
                        if (!hasRole(role.roleId))
                            roleIdsForAdding.push(role.roleId);
                    }
                    else if (hasRole(role.roleId)) {
                        roleIdForRemoval.push(role.roleId);
                    }
                }
            });
        }
        if (!isEasyCheck) {
            await triumphsChecker();
            if (roleCategoriesBits & 2 && response.metrics.data) {
                const metrics = response.metrics.data.metrics["1765255052"]?.objectiveProgress.progress;
                if (metrics == null || isNaN(metrics)) {
                    console.error(`[Error code: 1227] ${metrics} ${member.displayName}`, response.metrics.data.metrics["1765255052"]?.objectiveProgress);
                    return;
                }
                if (metrics > 0) {
                    for (const step of trialsRoles.roles) {
                        if (step.totalFlawless <= metrics) {
                            if (!hasRole(trialsRoles.category))
                                roleIdsForAdding.push(trialsRoles.category);
                            if (!hasRole(step.roleId)) {
                                roleIdsForAdding.push(step.roleId);
                                roleIdForRemoval.push(...trialsRoles.allRoles.filter((r) => r != step.roleId));
                            }
                            break;
                        }
                    }
                }
            }
            if (roleCategoriesBits & 16) {
                if (!userActivity) {
                    if (hasAnyRole(activityRoles.allVoice))
                        roleIdForRemoval.push(...activityRoles.allVoice);
                    if (hasAnyRole(activityRoles.allMessages))
                        roleIdForRemoval.push(...activityRoles.allMessages);
                    if (hasRole(activityRoles.category))
                        roleIdForRemoval.push(activityRoles.category);
                }
                else {
                    for (const step of activityRoles.voice) {
                        if (step.voiceMinutes <= userActivity.voice) {
                            if (!hasRole(step.roleId)) {
                                if (!hasRole(activityRoles.category))
                                    roleIdsForAdding.push(activityRoles.category);
                                roleIdsForAdding.push(step.roleId);
                                roleIdForRemoval.push(...activityRoles.allVoice.filter((r) => r != step.roleId));
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
                                roleIdForRemoval.push(...activityRoles.allMessages.filter((r) => r != step.roleId));
                            }
                            break;
                        }
                    }
                }
            }
        }
        if (roleIdForRemoval.length > 0) {
            await member.roles
                .remove(roleIdForRemoval, "Role(s) removed by autorole system")
                .catch((e) => console.error(`[Error code: 1226] Error during removing roles`, e, roleIdForRemoval));
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
    try {
        const request = await sendApiRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
        if (!request) {
            throttleSet.add(member.id);
            return;
        }
        if (!request.mergedAllCharacters || !request.mergedAllCharacters?.results) {
            throttleSet.add(member.id);
            console.error(`[Error code: 1634] Got error ${request?.ErrorStatus} during checking KD of ${member.displayName}`);
            return;
        }
        if (!request.mergedAllCharacters.results.allPvP.allTime ||
            !request?.mergedAllCharacters?.results?.allPvP?.allTime?.killsDeathsRatio?.basic.value)
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
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1219] ${e.statusCode} error for ${bungieId}`);
        else {
            throttleSet.add(member.id);
            console.error("[Error code: 1016]", e.error?.message || e.message || e.error?.name || e.name, bungieId, e.statusCode || e, e?.ErrorStatus);
        }
    }
}
async function handleMemberStatistics() {
    console.debug("Started to check users");
    (async () => {
        try {
            const userDatabaseData = await AuthData.findAll({
                attributes: ["discordId", "platform", "bungieId", "clan", "timezone", "accessToken", "roleCategoriesBits"],
            });
            const autoRoleData = await AutoRoleData.findAll({
                where: {
                    available: {
                        [Op.or]: {
                            [Op.gte]: 1,
                            [Op.eq]: -99,
                        },
                    },
                },
            });
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
            const autoRoleData = await AutoRoleData.findAll({
                where: {
                    available: {
                        [Op.or]: {
                            [Op.gte]: 1,
                            [Op.eq]: -99,
                        },
                    },
                },
            });
            const rawDatabaseData = await AuthData.findAll({
                attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "accessToken", "roleCategoriesBits"],
                include: UserActivityData,
            });
            const cachedMembers = client.getCachedMembers();
            const notFoundUsersOnServer = rawDatabaseData
                .filter((data) => !cachedMembers.has(data.discordId))
                .map((val, ind) => {
                return ind < 5 ? `[Error code: 1021] ${val.displayName}/${val.discordId} not found on server` : null;
            });
            if (notFoundUsersOnServer.length > 0 && process.env.NODE_ENV !== "development") {
                console.error("[Error code: 1755]", notFoundUsersOnServer.filter((_, ind) => ind < 5));
            }
            const validatedDatabaseData = rawDatabaseData.filter((data) => cachedMembers.has(data.discordId));
            if (!validatedDatabaseData || validatedDatabaseData.length === 0) {
                return console.error(`[Error code: 1022] DB is ${validatedDatabaseData ? `${validatedDatabaseData.length} size` : "not available"}`);
            }
            clanMembersManagement(validatedDatabaseData);
            if (getEndpointStatus("account") === 1) {
                for (let i = 0; i < validatedDatabaseData.length; i++) {
                    const userDatabaseData = validatedDatabaseData[i];
                    const { discordId, displayName, roleCategoriesBits } = userDatabaseData;
                    const randomValue = Math.floor(Math.random() * 100);
                    console.debug("Processing with checking", displayName, randomValue);
                    if (throttleSet.has(discordId))
                        return throttleSet.delete(discordId);
                    if (longOffline.has(discordId)) {
                        if (randomValue >= 90 || clanOnline.has(discordId))
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
                        (userDatabaseData.UserActivityData &&
                            (userDatabaseData.UserActivityData.voice > 120 || userDatabaseData.UserActivityData.messages > 5))) {
                        const randomValue = Math.floor(Math.random() * 100);
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
                    function checkUserStats() {
                        console.debug("Starting to check user stats of", member.displayName);
                        checkUserStatisticsRoles(userDatabaseData, member, autoRoleData);
                    }
                    function checkUserKDRatioStats() {
                        if (roleCategoriesBits & 1) {
                            checkUserKDRatio(userDatabaseData, member);
                        }
                    }
                    function checkCompletedRaidStats() {
                        if (member.roles.cache.hasAny(process.env.CLANMEMBER, process.env.MEMBER)) {
                            destinyActivityChecker({ authData: userDatabaseData, member, mode: 4 });
                        }
                    }
                    function checkTrialsKDStats() {
                        if (roleCategoriesBits & 2 &&
                            !member.roles.cache.has(trialsRoles.wintrader) &&
                            member.roles.cache.has(trialsRoles.category)) {
                            destinyActivityChecker({ authData: userDatabaseData, member, mode: 84 });
                        }
                    }
                }
            }
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
    const member = await client.getAsyncMember(typeof user === "string" ? user : user.id);
    const memberAuthData = await AuthData.findOne({
        where: { discordId: member.id },
        attributes: ["discordId", "bungieId", "platform", "accessToken", "displayName", "roleCategoriesBits"],
        include: UserActivityData,
    });
    const autoRoleData = await AutoRoleData.findAll({
        where: {
            available: {
                [Op.or]: {
                    [Op.gte]: 1,
                    [Op.eq]: -99,
                },
            },
        },
    });
    if (!member || !memberAuthData) {
        console.error(`[Error code: 1737]`, member.id);
        return;
    }
    await checkUserStatisticsRoles(memberAuthData, member, autoRoleData, true);
    await destinyActivityChecker({ authData: memberAuthData, member, mode: 4, count: 250 });
}
export { checkIndiviualUserStatistics };
export default handleMemberStatistics;
//# sourceMappingURL=userStatisticsManagement.js.map