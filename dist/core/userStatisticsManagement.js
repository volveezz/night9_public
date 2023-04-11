import { ActivityType } from "discord.js";
import { Op } from "sequelize";
import NightRoleCategory from "../configs/RoleCategory.js";
import { dungeonsTriumphHashes } from "../configs/roleRequirements.js";
import { activityRoles, clanJoinDateRoles, dlcRoles, dungeonMasterRole, guardianRankRoles, seasonalRoles, statisticsRoles, statusRoles, titleCategory, trialsRoles, triumphsCategory, } from "../configs/roles.js";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import { fetchRequest } from "../utils/api/fetchRequest.js";
import { destinyActivityChecker } from "../utils/general/destinyActivityChecker.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { updateClanRolesWithLogging } from "../utils/logging/logger.js";
import { AuthData, AutoRoleData, UserActivityData, database } from "../utils/persistence/sequelize.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export const userCharactersId = new Map();
export const longOffline = new Set();
export const bungieNames = new Map();
export const userTimezones = new Map();
export const clanOnline = new Map();
const clanJoinDateCheck = new Set();
const throttleSet = new Set();
const dungeonRoles = await AutoRoleData.findAll({ where: { category: 8 } }).then((rolesData) => {
    return rolesData.filter((roleData) => dungeonsTriumphHashes.includes(Number(roleData.triumphRequirement))).map((r) => r.roleId);
});
async function checkUserStatisticsRoles({ platform, discordId, bungieId, accessToken, displayName, roleCategoriesBits, UserActivityData: userActivity }, member, roleDataFromDatabase) {
    const addRoles = [];
    const removeRoles = [];
    const memberRoles = member.roles.cache;
    const destinyProfileResponse = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,900,1100`, accessToken);
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
            console.error(`[Error code: 1644]`, error);
        }
        async function DLCChecker(version) {
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
                                            return console.error("Информация о роли не найдена в БД", dbRoleUpdated);
                                        dbRoleUpdated.gildedRoles[i] = createdRole.id;
                                        for (let i = 0; i < index || i < dbRoleUpdated.gildedRoles.length; i++) {
                                            const element = dbRoleUpdated.gildedRoles ? dbRoleUpdated.gildedRoles[i] : undefined;
                                            if (!element || element === undefined || element?.toLowerCase() === "null")
                                                dbRoleUpdated.gildedRoles[i] = "null";
                                        }
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
                        else if (destinyProfileResponse.profileRecords.data.records[role.triumphRequirement]) {
                            const notGuidedTriumphRecord = destinyProfileResponse.profileRecords.data.records[role.triumphRequirement];
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
                    if (dungeonsTriumphHashes.includes(Number(triumphHash))) {
                        if (memberRoles.hasAll(...dungeonRoles) && !memberRoles.has(dungeonMasterRole) && !addRoles.includes(dungeonMasterRole)) {
                            addRoles.push(dungeonMasterRole);
                            removeRoles.push(...dungeonRoles);
                            return;
                        }
                        else if (memberRoles.has(dungeonMasterRole) && memberRoles.hasAny(...dungeonRoles)) {
                            removeRoles.push(...dungeonRoles);
                        }
                        else if (memberRoles.has(dungeonMasterRole)) {
                            return;
                        }
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
        DLCChecker(destinyProfileResponse.profile.data.versionsOwned).catch((e) => console.error(`[Error code: 1092] dlc_rolesChecker`, { e }, member.displayName));
        triumphsChecker().catch((e) => console.error(`[Error code: 1093] triumphsChecker`, { e }, member.displayName));
        if (roleCategoriesBits & NightRoleCategory.Trials) {
            const metrics = destinyProfileResponse.metrics.data.metrics["1765255052"]?.objectiveProgress.progress;
            if (metrics == null || isNaN(metrics))
                return console.error(`[Error code: 1227] ${metrics} ${member.displayName}`, destinyProfileResponse.metrics.data.metrics["1765255052"]?.objectiveProgress);
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
                .catch((e) => console.error(`[Error code: 1097] [Autorole error]`, e, rolesForGiving));
        }
    }
    catch (e) {
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1229] ${e.statusCode}`);
        else
            console.error("[Error code: 1230]", e.error?.stack || e.error || e, e.statusCode);
    }
}
async function changeUserNickname(discordId, name) {
    try {
        client.getCachedMembers().get(discordId)?.setNickname(name, "GlobalNickname changed");
    }
    catch (error) {
        console.error("[Error code: 1098] Name change error", error);
    }
}
async function manageClanMembers(bungie_array) {
    try {
        const clanList = await fetchRequest("Platform/GroupV2/4123712/Members/?memberType=None");
        if (!clanList) {
            console.log("[Error code: 1013] [Clan checker]", clanList);
            return;
        }
        if (clanList?.ErrorCode !== undefined && clanList.ErrorCode !== apiStatus.status) {
            apiStatus.status = clanList.ErrorCode;
        }
        else if (apiStatus.status !== 1 && clanList?.results && clanList.results.length >= 1) {
            apiStatus.status = 1;
        }
        if (client.user.presence.activities[0].name.startsWith("🔁")) {
            client.stopUpdatingPresence();
        }
        if (!clanList.results || !clanList.results?.length) {
            console.error(`[Error code: 1118]`, clanList.ErrorStatus, clanList.Message);
            if (clanList.ErrorCode === 5)
                client.user.setPresence({
                    activities: [
                        { name: `BungieAPI отключено`, type: ActivityType.Listening },
                        { name: "Destiny API не отвечает", type: ActivityType.Listening },
                    ],
                    status: "online",
                });
            return;
        }
        if (clanList.results?.length < 5) {
            console.error("[Error code: 1015]", clanList?.results?.length);
            return;
        }
        clanOnline.clear();
        const onlineCounter = clanList.results.filter((f) => f.isOnline === true).length;
        if (onlineCounter === 0) {
            client.user.setActivity(`${clanList.results.length} участников в клане`, { type: 3 });
        }
        else {
            client.user.setActivity(`${onlineCounter} онлайн из ${clanList.results.length}`, { type: 3 });
        }
        const t = await database.transaction();
        await Promise.all(clanList.results.map(async (result) => {
            const membershipId = result.destinyUserInfo.membershipId;
            if (bungie_array.some((e) => e.bungieId === membershipId)) {
                const [memberAuthData] = bungie_array.splice(bungie_array.findIndex((e) => e.bungieId === membershipId), 1);
                if (result.isOnline) {
                    clanOnline.set(memberAuthData.discordId, {
                        platform: result.destinyUserInfo.membershipType,
                        membershipId,
                    });
                }
                if (!clanJoinDateCheck.has(membershipId)) {
                    await timer(1000);
                    if (!(memberAuthData.roleCategoriesBits & NightRoleCategory.Triumphs))
                        return clanJoinDateCheck.add(membershipId);
                    const member = client.getCachedMembers().get(memberAuthData.discordId);
                    if (!member)
                        return console.error(`[Error code: 1087] Member not found ${memberAuthData.discordId}/${memberAuthData.displayName}`);
                    for (const step of clanJoinDateRoles.roles) {
                        if (step.days <= Math.trunc((Date.now() - new Date(result.joinDate).getTime()) / 1000 / 60 / 60 / 24)) {
                            if (!member.roles.cache.has(step.roleId)) {
                                try {
                                    if (!member.roles.cache.has(triumphsCategory))
                                        await member.roles.add(triumphsCategory);
                                    await member.roles.add(step.roleId).catch((e) => console.error(`[Error code: 1239] Error catched`, { e }));
                                    setTimeout(async () => {
                                        await member.roles.remove(clanJoinDateRoles.allRoles.filter((r) => r !== step.roleId));
                                    }, 1500);
                                }
                                catch (error) {
                                    console.error(`[Error code: 1238] Error during clanJoinDate role managment`, { error });
                                }
                            }
                            break;
                        }
                    }
                    clanJoinDateCheck.add(membershipId);
                }
                if (memberAuthData.displayName !== result.destinyUserInfo.bungieGlobalDisplayName &&
                    !memberAuthData.displayName.startsWith("⁣")) {
                    await AuthData.update({
                        displayName: result.destinyUserInfo.bungieGlobalDisplayName,
                    }, {
                        where: {
                            bungieId: membershipId,
                        },
                        transaction: t,
                    });
                    changeUserNickname(memberAuthData.discordId, result.destinyUserInfo.bungieGlobalDisplayName);
                }
                if (memberAuthData.clan === false) {
                    await AuthData.update({ clan: true }, {
                        where: {
                            bungieId: membershipId,
                        },
                        transaction: t,
                    });
                    updateClanRolesWithLogging(memberAuthData, true);
                }
            }
        }));
        await Promise.all(bungie_array.map(async (result) => {
            if (result.clan === true) {
                await AuthData.update({ clan: false }, { where: { bungieId: result.bungieId }, transaction: t });
                updateClanRolesWithLogging(result, false);
            }
        }));
        try {
            await t.commit();
        }
        catch (error) {
            t.rollback();
            console.error("[Error code: 1220] Clan checker commit error", { error });
        }
    }
    catch (e) {
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1221] ${e.statusCode} error during clan checking`);
        else
            console.error("[Error code: 1222]", e.error?.stack || e.error || e, e.statusCode);
    }
}
async function checkUserKDRatio({ platform, bungieId, accessToken }, member) {
    try {
        const request = await fetchRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
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
    if (process.env.DEV_BUILD === "dev")
        return;
    setTimeout(() => {
        const firstRun = AuthData.findAll({ attributes: ["discordId", "bungieId", "platform", "timezone", "accessToken"] });
        firstRun.then(async (authData) => {
            for (const data of authData) {
                const member = client.getCachedMembers().get(data.discordId);
                if (!member)
                    continue;
                if (data.timezone)
                    userTimezones.set(data.discordId, data.timezone);
                await timer(1000).then((r) => destinyActivityChecker(data, member, 4));
            }
        });
    }, 3000);
    setInterval(async () => {
        const t = await database.transaction();
        const autoRoleData = await AutoRoleData.findAll({
            where: {
                available: {
                    [Op.or]: {
                        [Op.gte]: 1,
                        [Op.eq]: -99,
                    },
                },
            },
            transaction: t,
        });
        const dbNotFiltred = await AuthData.findAll({
            attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "accessToken", "roleCategoriesBits"],
            transaction: t,
            include: UserActivityData,
        });
        try {
            await t.commit();
        }
        catch (error) {
            return console.error("[Error code: 1020]", error);
        }
        const dbNotFoundUsers = dbNotFiltred
            .filter((data) => !client.getCachedMembers().has(data.discordId))
            .map((val, ind) => {
            return ind < 5 ? `[Error code: 1021] ${val.displayName}/${val.discordId} not found on server` : null;
        });
        dbNotFoundUsers.length > 0 && process.env.DEV_BUILD !== "dev" ? console.error(dbNotFoundUsers.filter((val, ind) => ind < 5)) : [];
        const databaseData = dbNotFiltred.filter((data) => client.getCachedMembers().has(data.discordId));
        if (!databaseData || (databaseData.length === 0 && !process.env.DEV_BUILD)) {
            return console.error(`[Checker] [Error code: 1022] DB is ${databaseData ? `${databaseData}${databaseData?.length} size` : `not avaliable`}`);
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
        manageClanMembers(databaseData);
    }, 1000 * 60 * 2);
    async function updateMemberNicknames() {
        if (apiStatus.status !== 1)
            return;
        const dbData = await AuthData.findAll({
            attributes: ["discordId", "displayName", "timezone"],
        });
        const verifiedGuildMembers = client.getCachedMembers().filter((member) => member.roles.cache.has(statusRoles.verified));
        verifiedGuildMembers.forEach((member) => {
            const userDbData = dbData.find((d) => d.discordId === member.id);
            if (!userDbData)
                return;
            const { timezone, displayName: userDbName } = userDbData;
            if (nameCleaner(member.displayName) !== userDbName && !userDbName.startsWith("⁣")) {
                if (!member.permissions.has("Administrator")) {
                    member
                        .setNickname(userDbData.timezone != null ? `[+${timezone}] ${userDbName}` : userDbName)
                        .catch((e) => console.error("[Error code: 1030] Name autochange error", e));
                }
            }
        });
    }
    setInterval(async () => {
        await updateMemberNicknames();
    }, 1000 * 60 * 60);
}
export default handleMemberStatistics;
