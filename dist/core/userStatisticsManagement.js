import { Op } from "sequelize";
import NightRoleCategory from "../configs/RoleCategory.js";
import { dungeonsTriumphHashes } from "../configs/roleRequirements.js";
import { activityRoles, dlcRoles, dungeonMasterRole, guardianRankRoles, seasonalRoles, statisticsRoles, statusRoles, titleCategory, trialsRoles, triumphsCategory, } from "../configs/roles.js";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import { fetchRequest } from "../utils/api/fetchRequest.js";
import { destinyActivityChecker } from "../utils/general/destinyActivityChecker.js";
import { AuthData, AutoRoleData, UserActivityData } from "../utils/persistence/sequelize.js";
import clanMembersManagement from "./clanMembersManagement.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export const userCharactersId = new Map();
export const longOffline = new Set();
export const bungieNames = new Map();
export const userTimezones = new Map();
export const clanOnline = new Map();
const throttleSet = new Set();
const dungeonRoles = await AutoRoleData.findAll({ where: { category: 8 } }).then((rolesData) => {
    return rolesData.filter((roleData) => dungeonsTriumphHashes.includes(roleData.triumphRequirement)).map((r) => r.roleId);
});
async function checkUserStatisticsRoles({ platform, discordId, bungieId, accessToken, displayName, roleCategoriesBits, UserActivityData: userActivity }, member, roleDataFromDatabase, isEasyCheck = false) {
    const addRoles = [];
    const removeRoles = [];
    const memberRoles = member.roles.cache;
    const destinyProfileResponse = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,900,1100`, accessToken);
    if (!destinyProfileResponse) {
        console.error(`[Error code: 1751] Received error for ${platform}/${bungieId} [${displayName}]`);
        return;
    }
    try {
        if (destinyProfileResponse == null ||
            !destinyProfileResponse?.metrics ||
            destinyProfileResponse?.profileRecords.data?.activeScore == null ||
            !destinyProfileResponse?.characterRecords ||
            !destinyProfileResponse?.profile ||
            !destinyProfileResponse?.profile.data) {
            const ErrorResponse = destinyProfileResponse;
            if (ErrorResponse?.ErrorCode === 5)
                return (apiStatus.status = ErrorResponse.ErrorStatus);
            if (ErrorResponse?.ErrorCode === 1688 ||
                ErrorResponse?.ErrorCode === 1672 ||
                ErrorResponse?.ErrorCode === 1618) {
                if (ErrorResponse?.ErrorCode === 1618)
                    longOffline.add(member.id);
                console.error(`[Error code: 1081] ${ErrorResponse.ErrorStatus} for ${displayName}`);
                throttleSet.add(member.id);
                return;
            }
            return console.error("[Error code: 1039]", displayName, !destinyProfileResponse, !destinyProfileResponse.metrics, !destinyProfileResponse.profileRecords.data?.activeScore != null, !destinyProfileResponse.characterRecords, !destinyProfileResponse.profile, !destinyProfileResponse.profile.data);
        }
        if (!bungieNames.get(discordId)) {
            let bungieCode = (destinyProfileResponse.profile.data.userInfo.bungieGlobalDisplayNameCode ?? "0000").toString();
            if (bungieCode.length === 3)
                bungieCode = "0" + bungieCode;
            bungieNames.set(discordId, `${destinyProfileResponse.profile.data.userInfo.bungieGlobalDisplayName ??
                destinyProfileResponse.profile.data.userInfo.displayName}#${bungieCode}`);
        }
        if (Date.now() - new Date(destinyProfileResponse.profile.data.dateLastPlayed).getTime() > 1000 * 60 * 60 * 2)
            longOffline.add(member.id);
        if (!memberRoles.has(statusRoles.verified))
            addRoles.push(statusRoles.verified);
        try {
            const userGuardianRank = destinyProfileResponse.profile.data.currentGuardianRank;
            const guardianRankRoleId = (guardianRankRoles.ranks[userGuardianRank - 1] || guardianRankRoles.ranks[0]).roleId;
            if (!memberRoles.has(guardianRankRoleId)) {
                addRoles.push(guardianRankRoleId);
                removeRoles.push(...guardianRankRoles.allRoles.filter((roleId) => roleId !== guardianRankRoleId));
            }
        }
        catch (error) {
            console.error("[Error code: 1644]", error);
        }
        async function dlcChecker(version) {
            if (!version)
                return;
            if (version > 7 && memberRoles.has(dlcRoles.vanilla)) {
                removeRoles.push(dlcRoles.vanilla);
            }
            else if (version <= 7 && !memberRoles.has(dlcRoles.vanilla)) {
                addRoles.push(dlcRoles.vanilla);
                removeRoles.push(Object.values(dlcRoles)
                    .filter((a) => a !== dlcRoles.vanilla)
                    .toString());
            }
            if (version & 8 && !memberRoles.has(dlcRoles.frs))
                addRoles.push(dlcRoles.frs);
            if (version & 32 && !memberRoles.has(dlcRoles.sk))
                addRoles.push(dlcRoles.sk);
            if (version & 64 && !memberRoles.has(dlcRoles.bl))
                addRoles.push(dlcRoles.bl);
            if (version & 128 && !memberRoles.has(dlcRoles.anni))
                addRoles.push(dlcRoles.anni);
            if (version & 256 && !memberRoles.has(dlcRoles.twq))
                addRoles.push(dlcRoles.twq);
            if (version & 512 && !memberRoles.has(dlcRoles.lf))
                addRoles.push(dlcRoles.lf);
        }
        async function triumphsChecker() {
            if (roleCategoriesBits & NightRoleCategory.Stats) {
                const activeTriumphs = destinyProfileResponse.profileRecords.data.activeScore;
                for (const step of statisticsRoles.active) {
                    if (activeTriumphs >= step.triumphScore) {
                        if (!memberRoles.has(statisticsRoles.category))
                            addRoles.push(statisticsRoles.category);
                        if (!memberRoles.has(step.roleId)) {
                            addRoles.push(step.roleId);
                            removeRoles.push(statisticsRoles.allActive.filter((r) => r !== step.roleId).toString());
                        }
                        break;
                    }
                }
            }
            roleDataFromDatabase.forEach(async (role) => {
                if (role.category === NightRoleCategory.Titles && !(roleCategoriesBits & NightRoleCategory.Titles))
                    return;
                if (role.category === NightRoleCategory.Triumphs && !(roleCategoriesBits & NightRoleCategory.Triumphs))
                    return;
                if (role.gildedTriumphRequirement) {
                    if (destinyProfileResponse.profileRecords.data.records[role.gildedTriumphRequirement]) {
                        const triumphRecord = destinyProfileResponse.profileRecords.data.records[role.gildedTriumphRequirement];
                        if (triumphRecord && triumphRecord.completedCount && triumphRecord.completedCount > 0) {
                            const index = triumphRecord.completedCount;
                            if (role.gildedRoles && role.gildedRoles.at(index - 1) && role.gildedRoles.at(index - 1).toLowerCase() !== "null") {
                                if (!memberRoles.has(titleCategory))
                                    addRoles.push(titleCategory);
                                if (!memberRoles.has(role.gildedRoles.at(index - 1))) {
                                    addRoles.push(role.gildedRoles.at(index - 1));
                                    removeRoles.push(role.roleId, role.gildedRoles
                                        .filter((r) => r && r !== null && r.toLowerCase() !== "null" && r !== role.gildedRoles.at(index - 1))
                                        .toString());
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
                                            if (!memberRoles.has(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id)) {
                                                addRoles.push(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id);
                                                removeRoles.push(role.roleId, role
                                                    .gildedRoles.filter((r) => r &&
                                                    r.toLowerCase() !== "null" &&
                                                    r !==
                                                        member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id)
                                                    .toString());
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
                                        if (!memberRoles.has(titleCategory))
                                            addRoles.push(titleCategory);
                                        addRoles.push(createdRole.id);
                                        removeRoles.push(role.roleId, dbRoleUpdated
                                            .gildedRoles.filter((r) => r && r.toLowerCase() !== "null" && r !== createdRole.id)
                                            .toString());
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
                        else if (destinyProfileResponse.profileRecords.data.records[Number(role.triumphRequirement)]) {
                            const notGuidedTriumphRecord = destinyProfileResponse.profileRecords.data.records[Number(role.triumphRequirement)];
                            if (notGuidedTriumphRecord.objectives
                                ? notGuidedTriumphRecord.objectives?.pop()?.complete === true
                                : notGuidedTriumphRecord.intervalObjectives?.pop()?.complete === true) {
                                if (!memberRoles.has(role.roleId)) {
                                    if (role.category & NightRoleCategory.Titles && !memberRoles.has(titleCategory))
                                        addRoles.push(titleCategory);
                                    addRoles.push(role.roleId);
                                }
                            }
                        }
                    }
                    else {
                        console.error(`[Error code: 1090] Profile record ${role.gildedTriumphRequirement} not found for ${member.displayName}`);
                    }
                }
                else {
                    const triumphHash = role.triumphRequirement;
                    if (dungeonsTriumphHashes.includes(triumphHash)) {
                        if (memberRoles.hasAll(...dungeonRoles) && !memberRoles.has(dungeonMasterRole) && !addRoles.includes(dungeonMasterRole)) {
                            addRoles.push(dungeonMasterRole);
                            removeRoles.push(...dungeonRoles);
                        }
                        else if (memberRoles.has(dungeonMasterRole) && memberRoles.hasAny(...dungeonRoles)) {
                            removeRoles.push(...dungeonRoles);
                        }
                        return;
                    }
                    const triumphRecord = destinyProfileResponse.profileRecords.data.records[Number(triumphHash)] ||
                        destinyProfileResponse.characterRecords.data[Object.keys(destinyProfileResponse.characterRecords.data)[0]].records[Number(triumphHash)];
                    if (triumphRecord) {
                        if ((triumphRecord.objectives && triumphRecord.objectives[triumphRecord.objectives.length - 1].complete === true) ||
                            (triumphRecord.intervalObjectives &&
                                triumphRecord.intervalObjectives[triumphRecord.intervalObjectives.length - 1].complete === true)) {
                            if (role.category === NightRoleCategory.Titles && !memberRoles.has(titleCategory))
                                addRoles.push(titleCategory);
                            if (role.category === NightRoleCategory.Triumphs && !memberRoles.has(triumphsCategory))
                                addRoles.push(triumphsCategory);
                            if (role.category === NightRoleCategory.Activity && !memberRoles.has(activityRoles.category))
                                addRoles.push(activityRoles.category);
                            if (!memberRoles.has(role.roleId))
                                addRoles.push(role.roleId);
                        }
                        else {
                            if (memberRoles.has(role.roleId))
                                removeRoles.push(role.roleId);
                        }
                    }
                }
            });
        }
        if (destinyProfileResponse.profile.data.seasonHashes.includes(destinyProfileResponse.profile.data.currentSeasonHash)) {
            if (!memberRoles.has(seasonalRoles.curSeasonRole))
                addRoles.push(seasonalRoles.curSeasonRole);
            if (memberRoles.has(seasonalRoles.nonCurSeasonRole))
                removeRoles.push(seasonalRoles.nonCurSeasonRole);
        }
        else {
            if (!memberRoles.has(seasonalRoles.nonCurSeasonRole))
                addRoles.push(seasonalRoles.nonCurSeasonRole);
            if (memberRoles.has(seasonalRoles.curSeasonRole))
                removeRoles.push(seasonalRoles.curSeasonRole);
        }
        dlcChecker(destinyProfileResponse.profile.data.versionsOwned).catch((e) => console.error(`[Error code: 1092] ${member.displayName}`, e));
        if (!isEasyCheck) {
            triumphsChecker().catch((e) => console.error(`[Error code: 1093] ${member.displayName}`, e));
            if (roleCategoriesBits & NightRoleCategory.Trials) {
                const metrics = destinyProfileResponse.metrics.data.metrics["1765255052"]?.objectiveProgress.progress;
                if (metrics == null || isNaN(metrics)) {
                    console.error(`[Error code: 1227] ${metrics} ${member.displayName}`, destinyProfileResponse.metrics.data.metrics["1765255052"]?.objectiveProgress);
                    return;
                }
                if (metrics >= 1) {
                    for (const step of trialsRoles.roles) {
                        if (step.totalFlawless <= metrics) {
                            if (!member.roles.cache.has(trialsRoles.category))
                                addRoles.push(trialsRoles.category);
                            if (!member.roles.cache.has(step.roleId)) {
                                addRoles.push(step.roleId);
                                removeRoles.push(...trialsRoles.allRoles.filter((r) => r != step.roleId));
                            }
                            break;
                        }
                    }
                }
            }
            if (roleCategoriesBits & NightRoleCategory.Activity) {
                if (!userActivity) {
                    if (memberRoles.hasAny(...activityRoles.allVoice))
                        removeRoles.push(...activityRoles.allVoice);
                    if (memberRoles.hasAny(...activityRoles.allMessages))
                        removeRoles.push(...activityRoles.allMessages);
                    if (memberRoles.has(activityRoles.category))
                        removeRoles.push(activityRoles.category);
                }
                else {
                    for (const step of activityRoles.voice) {
                        if (step.voiceMinutes <= userActivity.voice) {
                            if (!member.roles.cache.has(step.roleId)) {
                                if (!member.roles.cache.has(activityRoles.category))
                                    addRoles.push(activityRoles.category);
                                addRoles.push(step.roleId);
                                removeRoles.push(...activityRoles.allVoice.filter((r) => r != step.roleId));
                            }
                            break;
                        }
                    }
                    for (const step of activityRoles.messages) {
                        if (step.messageCount <= userActivity.messages) {
                            if (!member.roles.cache.has(step.roleId)) {
                                if (!member.roles.cache.has(activityRoles.category))
                                    addRoles.push(activityRoles.category);
                                addRoles.push(step.roleId);
                                removeRoles.push(activityRoles.allMessages.filter((r) => r != step.roleId).toString());
                            }
                            break;
                        }
                    }
                }
            }
        }
        if (removeRoles.length > 0) {
            const rolesForRemoving = removeRoles
                .join()
                .split(",")
                .filter((r) => r.length > 10);
            if (rolesForRemoving.filter((r) => r.length <= 10).length > 0)
                console.error(`[Error code: 1225] Error during removin roles [ ${rolesForRemoving} ] from ${member.displayName}`);
            await member.roles
                .remove(rolesForRemoving, "Role(s) removed by autorole system")
                .catch((e) => console.error(`[Error code: 1226] Error during removing roles: ${rolesForRemoving}`));
        }
        if (addRoles.length > 0) {
            const rolesForGiving = addRoles
                .join()
                .split(",")
                .filter((r) => r.length > 10);
            if (addRoles.filter((r) => r.length <= 10).length > 0)
                console.error(`[Error code: 1096] Error during giving roles [ ${addRoles} ] for ${member.displayName}`);
            await member.roles
                .add(rolesForGiving, "Role(s) added by autorole system")
                .catch((e) => console.error("[Error code: 1097] [Autorole error]", e, rolesForGiving));
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
        const request = await fetchRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
        if (request === undefined) {
            throttleSet.add(member.id);
            return;
        }
        if (!request || !request.mergedAllCharacters || !request.mergedAllCharacters.results) {
            throttleSet.add(member.id);
            console.error(`[Error code: 1634] Got error ${request?.ErrorStatus} during checking KD of ${member.displayName}`);
            return;
        }
        if (!request.mergedAllCharacters.results.allPvP.allTime ||
            !request?.mergedAllCharacters?.results?.allPvP?.allTime?.killsDeathsRatio?.basic.value)
            return await member.roles.add([statisticsRoles.allKd[statisticsRoles.allKd.length - 1], statisticsRoles.category]);
        for (const step of statisticsRoles.kd) {
            if (step.kd <= request?.mergedAllCharacters?.results?.allPvP?.allTime?.killsDeathsRatio?.basic.value) {
                const addedRoles = [];
                if (!member.roles.cache.has(statisticsRoles.category))
                    addedRoles.push(statisticsRoles.category);
                if (!member.roles.cache.has(step.roleId)) {
                    await member.roles.remove(statisticsRoles.allKd.filter((r) => r !== step.roleId)).then(async (_) => {
                        await member.roles.add([step.roleId, ...addedRoles]);
                    });
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
    (async () => {
        try {
            await timer(3000);
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
            for (const userData of userDatabaseData) {
                const cachedMember = client.getCachedMembers().get(userData.discordId);
                if (!userData.clan && cachedMember) {
                    checkUserStatisticsRoles(userData, cachedMember, autoRoleData, true);
                }
                if (!cachedMember || !userData.timezone)
                    continue;
                userTimezones.set(userData.discordId, userData.timezone);
                await timer(1000);
                destinyActivityChecker(userData, cachedMember, 4);
            }
        }
        catch (error) {
            console.error("[Error code: 1918]", error);
        }
    })();
    async function startStatisticsChecking() {
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
        const dbNotFiltred = await AuthData.findAll({
            attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "accessToken", "roleCategoriesBits"],
            include: UserActivityData,
        });
        const dbNotFoundUsers = dbNotFiltred
            .filter((data) => !client.getCachedMembers().has(data.discordId))
            .map((val, ind) => {
            return ind < 5 ? `[Error code: 1021] ${val.displayName}/${val.discordId} not found on server` : null;
        });
        dbNotFoundUsers.length > 0 && process.env.DEV_BUILD !== "dev"
            ? console.error("[Error code: 1755]", dbNotFoundUsers.filter((val, ind) => ind < 5))
            : [];
        const databaseData = dbNotFiltred.filter((data) => client.getCachedMembers().has(data.discordId));
        if (!databaseData || (databaseData.length === 0 && !process.env.DEV_BUILD)) {
            return console.error(`[Error code: 1022] DB is ${databaseData ? `${databaseData}${databaseData?.length} size` : "not avaliable"}`);
        }
        if (apiStatus.status === 1) {
            for (let i = 0; i < databaseData.length; i++) {
                const userDatabaseData = databaseData[i];
                const randomValue = Math.floor(Math.random() * 100);
                if (throttleSet.has(userDatabaseData.discordId))
                    return throttleSet.delete(userDatabaseData.discordId);
                if (longOffline.has(userDatabaseData.discordId)) {
                    if (randomValue >= 90)
                        longOffline.delete(userDatabaseData.discordId);
                    continue;
                }
                const member = client.getCachedMembers().get(userDatabaseData.discordId);
                if (member == null) {
                    await client.getCachedGuild().members.fetch();
                    console.error("[Error code: 1023] destinyUsestatisticsRolesChecker, member not found", userDatabaseData.displayName);
                    continue;
                }
                if (member.roles.cache.has(statusRoles.clanmember) ||
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
                    await timer(1000);
                }
                function checkUserStats() {
                    checkUserStatisticsRoles(userDatabaseData, member, autoRoleData);
                }
                function checkUserKDRatioStats() {
                    if (userDatabaseData.roleCategoriesBits & NightRoleCategory.Stats) {
                        checkUserKDRatio(userDatabaseData, member);
                    }
                }
                function checkCompletedRaidStats() {
                    if (member.roles.cache.hasAny(statusRoles.clanmember, statusRoles.member)) {
                        destinyActivityChecker(userDatabaseData, member, 4);
                    }
                }
                function checkTrialsKDStats() {
                    if (userDatabaseData.roleCategoriesBits & NightRoleCategory.Trials &&
                        !member.roles.cache.has(trialsRoles.wintrader) &&
                        member.roles.cache.has(trialsRoles.category)) {
                        destinyActivityChecker(userDatabaseData, member, 84);
                    }
                }
            }
        }
        await clanMembersManagement(databaseData);
        setTimeout(startStatisticsChecking, 1000 * 60 * 2);
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
    const autoRoleData = await AutoRoleData.findAll();
    if (!member || !memberAuthData) {
        console.error(`[Error code: 1737]`, member.id);
        return;
    }
    await checkUserStatisticsRoles(memberAuthData, member, autoRoleData, true);
}
export { checkIndiviualUserStatistics };
export default handleMemberStatistics;
