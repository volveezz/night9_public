import { Op } from "sequelize";
import NightRoleCategory from "../configs/RoleCategory.js";
import { dungeonsTriumphHashes } from "../configs/roleRequirements.js";
import { activityRoles, dlcRoles, guardianRankRoles, seasonalRoles, statisticsRoles, trialsRoles } from "../configs/roles.js";
import { client } from "../index.js";
import { GetApiStatus, SetApiStatus } from "../structures/apiStatus.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
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
    const destinyProfileResponse = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,900,1100`, accessToken);
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
            if (ErrorResponse?.ErrorCode === 5) {
                return SetApiStatus("account", 5);
            }
            if (ErrorResponse?.ErrorCode === 1688 ||
                ErrorResponse?.ErrorCode === 1672 ||
                ErrorResponse?.ErrorCode === 1618) {
                if (ErrorResponse?.ErrorCode === 1618)
                    longOffline.add(member.id);
                console.error(`[Error code: 1081] ${ErrorResponse.ErrorStatus} for ${displayName}`);
                throttleSet.add(member.id);
                return;
            }
            return console.error("[Error code: 1039]", displayName, !destinyProfileResponse, !destinyProfileResponse?.metrics, !destinyProfileResponse?.profileRecords?.data?.activeScore != null, !destinyProfileResponse?.characterRecords, !destinyProfileResponse?.profile, !destinyProfileResponse?.profile?.data);
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
        if (!member.roles.cache.has(process.env.VERIFIED))
            addRoles.push(process.env.VERIFIED);
        try {
            const userGuardianRank = destinyProfileResponse.profile.data.currentGuardianRank;
            const guardianRankRoleId = (guardianRankRoles.ranks[userGuardianRank - 1] || guardianRankRoles.ranks[0]).roleId;
            if (!member.roles.cache.has(guardianRankRoleId)) {
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
            if (version > 7 && member.roles.cache.has(dlcRoles.vanilla)) {
                removeRoles.push(dlcRoles.vanilla);
            }
            else if (version <= 7 && !member.roles.cache.has(dlcRoles.vanilla)) {
                addRoles.push(dlcRoles.vanilla);
                removeRoles.push(Object.values(dlcRoles)
                    .filter((a) => a !== dlcRoles.vanilla)
                    .toString());
            }
            if (version & 8 && !member.roles.cache.has(dlcRoles.frs))
                addRoles.push(dlcRoles.frs);
            if (version & 32 && !member.roles.cache.has(dlcRoles.sk))
                addRoles.push(dlcRoles.sk);
            if (version & 64 && !member.roles.cache.has(dlcRoles.bl))
                addRoles.push(dlcRoles.bl);
            if (version & 128 && !member.roles.cache.has(dlcRoles.anni))
                addRoles.push(dlcRoles.anni);
            if (version & 256 && !member.roles.cache.has(dlcRoles.twq))
                addRoles.push(dlcRoles.twq);
            if (version & 512 && !member.roles.cache.has(dlcRoles.lf))
                addRoles.push(dlcRoles.lf);
        }
        async function triumphsChecker() {
            if (roleCategoriesBits & NightRoleCategory.Stats) {
                const activeTriumphs = destinyProfileResponse.profileRecords.data.activeScore;
                for (const step of statisticsRoles.active) {
                    if (activeTriumphs >= step.triumphScore) {
                        if (!member.roles.cache.has(process.env.STATISTICS_CATEGORY))
                            addRoles.push(process.env.STATISTICS_CATEGORY);
                        if (!member.roles.cache.has(step.roleId)) {
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
                                if (!member.roles.cache.has(process.env.TITLE_CATEGORY))
                                    addRoles.push(process.env.TITLE_CATEGORY);
                                if (!member.roles.cache.has(role.gildedRoles.at(index - 1))) {
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
                                            if (!member.roles.cache.has(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id)) {
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
                                        if (!member.roles.cache.has(process.env.TITLE_CATEGORY))
                                            addRoles.push(process.env.TITLE_CATEGORY);
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
                                if (!member.roles.cache.has(role.roleId)) {
                                    if (role.category & NightRoleCategory.Titles && !member.roles.cache.has(process.env.TITLE_CATEGORY))
                                        addRoles.push(process.env.TITLE_CATEGORY);
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
                    const triumphRecord = destinyProfileResponse.profileRecords.data.records[triumphHash] ||
                        destinyProfileResponse.characterRecords.data[Object.keys(destinyProfileResponse.characterRecords.data)[0]].records[triumphHash];
                    const objective = triumphRecord.objectives
                        ? triumphRecord.objectives[triumphRecord.objectives.length - 1]
                        : triumphRecord.intervalObjectives[triumphRecord.intervalObjectives.length - 1];
                    if (dungeonsTriumphHashes.includes(triumphHash)) {
                        if (objective.complete === true) {
                            if (member.roles.cache.has(process.env.DUNGEON_MASTER_ROLE)) {
                                return;
                            }
                            if (member.roles.cache.hasAll(...dungeonRoles) && !addRoles.includes(process.env.DUNGEON_MASTER_ROLE)) {
                                addRoles.push(process.env.DUNGEON_MASTER_ROLE);
                                removeRoles.push(...dungeonRoles);
                            }
                        }
                        else {
                            if (member.roles.cache.has(process.env.DUNGEON_MASTER_ROLE)) {
                                removeRoles.push(process.env.DUNGEON_MASTER_ROLE);
                                if (!addRoles.includes(role.roleId)) {
                                    addRoles.push(role.roleId);
                                }
                            }
                        }
                    }
                    if (objective && objective.complete === true) {
                        if (role.category === NightRoleCategory.Titles && !member.roles.cache.has(process.env.TITLE_CATEGORY))
                            addRoles.push(process.env.TITLE_CATEGORY);
                        if (role.category === NightRoleCategory.Triumphs && !member.roles.cache.has(process.env.TRIUMPHS_CATEGORY))
                            addRoles.push(process.env.TRIUMPHS_CATEGORY);
                        if (role.category === NightRoleCategory.Activity && !member.roles.cache.has(activityRoles.category))
                            addRoles.push(activityRoles.category);
                        if (!member.roles.cache.has(role.roleId))
                            addRoles.push(role.roleId);
                    }
                    else if (member.roles.cache.has(role.roleId)) {
                        removeRoles.push(role.roleId);
                    }
                }
            });
        }
        if (destinyProfileResponse.profile.data.seasonHashes.includes(destinyProfileResponse.profile.data.currentSeasonHash)) {
            if (!member.roles.cache.has(seasonalRoles.curSeasonRole))
                addRoles.push(seasonalRoles.curSeasonRole);
            if (member.roles.cache.has(seasonalRoles.nonCurSeasonRole))
                removeRoles.push(seasonalRoles.nonCurSeasonRole);
        }
        else {
            if (!member.roles.cache.has(seasonalRoles.nonCurSeasonRole))
                addRoles.push(seasonalRoles.nonCurSeasonRole);
            if (member.roles.cache.has(seasonalRoles.curSeasonRole))
                removeRoles.push(seasonalRoles.curSeasonRole);
        }
        dlcChecker(destinyProfileResponse.profile.data.versionsOwned).catch((e) => console.error(`[Error code: 1092] ${member.displayName}`, e));
        if (!isEasyCheck) {
            triumphsChecker().catch((e) => console.error("[Error code: 1093]", member.displayName, e));
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
                    if (member.roles.cache.hasAny(...activityRoles.allVoice))
                        removeRoles.push(...activityRoles.allVoice);
                    if (member.roles.cache.hasAny(...activityRoles.allMessages))
                        removeRoles.push(...activityRoles.allMessages);
                    if (member.roles.cache.has(activityRoles.category))
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
            if (addRoles.filter((r) => r && r.length <= 10)?.length > 0) {
                console.error(`[Error code: 1096] Error during giving roles [ ${addRoles} ] for ${member.displayName}`);
            }
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
        const request = await sendApiRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
        if (request === undefined || request instanceof Error) {
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
            return await member.roles.add([statisticsRoles.allKd[statisticsRoles.allKd.length - 1], process.env.STATISTICS_CATEGORY]);
        for (const step of statisticsRoles.kd) {
            if (step.kd <= request?.mergedAllCharacters?.results?.allPvP?.allTime?.killsDeathsRatio?.basic.value) {
                const addedRoles = [];
                if (!member.roles.cache.has(process.env.STATISTICS_CATEGORY))
                    addedRoles.push(process.env.STATISTICS_CATEGORY);
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
                if (userData.timezone) {
                    userTimezones.set(userData.discordId, userData.timezone);
                }
                if (!cachedMember)
                    continue;
                await timer(1000);
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
            if (GetApiStatus("account") === 1) {
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
                        if (member.roles.cache.hasAny(process.env.CLANMEMBER, process.env.MEMBER)) {
                            destinyActivityChecker({ authData: userDatabaseData, member, mode: 4 });
                        }
                    }
                    function checkTrialsKDStats() {
                        if (userDatabaseData.roleCategoriesBits & NightRoleCategory.Trials &&
                            !member.roles.cache.has(trialsRoles.wintrader) &&
                            member.roles.cache.has(trialsRoles.category)) {
                            destinyActivityChecker({ authData: userDatabaseData, member, mode: 84 });
                        }
                    }
                }
            }
            await clanMembersManagement(databaseData);
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
}
export { checkIndiviualUserStatistics };
export default handleMemberStatistics;
//# sourceMappingURL=userStatisticsManagement.js.map