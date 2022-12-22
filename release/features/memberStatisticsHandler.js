import { AuthData, database, UserActivityData, AutoRoleData } from "../handlers/sequelize.js";
import { Op } from "sequelize";
import { statusRoles, seasonalRoles, dlcRoles, statisticsRoles, titleCategory, triumphsCategory, activityRoles, trialsRoles, clanJoinDateRoles, } from "../configs/roles.js";
import NightRoleCategory from "../enums/RoleCategory.js";
import { updateClanRolesWithLogging } from "../functions/logger.js";
import { fetchRequest } from "../functions/fetchRequest.js";
import { client } from "../index.js";
import { Feature } from "../structures/feature.js";
import { apiStatus } from "../structures/apiStatus.js";
import { destinyActivityChecker } from "../functions/activitiesChecker.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export const completedRaidsData = new Map();
export const character_data = new Map();
export const longOffline = new Set();
export const bungieNames = new Map();
const clanJoinDateCheck = new Set();
const throttleSet = new Set();
async function destinyUserStatisticsRolesChecker({ platform, discordId, bungieId, accessToken, displayName, roleCategoriesBits, UserActivityData: userActivity }, member, role_db) {
    const give_roles = [];
    const remove_roles = [];
    const memberRoles = member.roles.cache;
    const destinyProfileResponse = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,900,1100`, accessToken);
    try {
        if (!destinyProfileResponse ||
            !destinyProfileResponse.metrics ||
            !destinyProfileResponse.profileRecords.data?.activeScore ||
            !destinyProfileResponse.characterRecords ||
            !destinyProfileResponse.profile ||
            !destinyProfileResponse.profile.data) {
            const ErrorResponse = destinyProfileResponse;
            if (ErrorResponse?.ErrorCode === 5)
                return (apiStatus.status = ErrorResponse.ErrorStatus);
            if (ErrorResponse?.ErrorCode === 1688 || ErrorResponse?.ErrorCode === 1672 || ErrorResponse?.ErrorCode === 1618) {
                if (ErrorResponse?.ErrorCode === 1618)
                    longOffline.add(member.id);
                console.error(`[Error code: 1081] ${ErrorResponse.ErrorStatus} for ${displayName}`);
                throttleSet.add(member.id);
                return;
            }
            return console.error("[Error code: 1039]", displayName, ErrorResponse);
        }
        if (!bungieNames.get(discordId)) {
            let bungieCode = (destinyProfileResponse.profile.data.userInfo.bungieGlobalDisplayNameCode ?? "0000").toString();
            if (bungieCode.length === 3)
                bungieCode = "0" + bungieCode;
            bungieNames.set(discordId, `${destinyProfileResponse.profile.data.userInfo.bungieGlobalDisplayName ?? destinyProfileResponse.profile.data.userInfo.displayName}#${bungieCode}`);
        }
        if (new Date().getTime() - new Date(destinyProfileResponse.profile.data.dateLastPlayed).getTime() > 1000 * 60 * 60)
            longOffline.add(member.id);
        if (!memberRoles.has(statusRoles.verified))
            give_roles.push(statusRoles.verified);
        async function seasonalRolesChecker() {
            if (destinyProfileResponse.profile.data.seasonHashes.includes(destinyProfileResponse.profile.data.currentSeasonHash)) {
                if (!memberRoles.has(seasonalRoles.curSeasonRole))
                    give_roles.push(seasonalRoles.curSeasonRole);
                if (memberRoles.has(seasonalRoles.nonCurSeasonRole))
                    remove_roles.push(seasonalRoles.nonCurSeasonRole);
                return [true];
            }
            else {
                if (!memberRoles.has(seasonalRoles.nonCurSeasonRole))
                    give_roles.push(seasonalRoles.nonCurSeasonRole);
                if (memberRoles.has(seasonalRoles.curSeasonRole))
                    remove_roles.push(seasonalRoles.curSeasonRole);
                return [true];
            }
        }
        async function dlc_rolesChecker(version) {
            if (!version)
                return;
            if (version > 7 && memberRoles.has(dlcRoles.vanilla)) {
                remove_roles.push(dlcRoles.vanilla);
            }
            else if (version <= 7 && !memberRoles.has(dlcRoles.vanilla)) {
                give_roles.push(dlcRoles.vanilla);
                remove_roles.push(Object.values(dlcRoles)
                    .filter((a) => a !== dlcRoles.vanilla)
                    .toString());
            }
            if (version & 8 && !memberRoles.has(dlcRoles.frs))
                give_roles.push(dlcRoles.frs);
            if (version & 32 && !memberRoles.has(dlcRoles.sk))
                give_roles.push(dlcRoles.sk);
            if (version & 64 && !memberRoles.has(dlcRoles.bl))
                give_roles.push(dlcRoles.bl);
            if (version & 128 && !memberRoles.has(dlcRoles.anni))
                give_roles.push(dlcRoles.anni);
            if (version & 256 && !memberRoles.has(dlcRoles.twq))
                give_roles.push(dlcRoles.twq);
            if (version & 512 && !memberRoles.has(dlcRoles.lf))
                give_roles.push(dlcRoles.lf);
        }
        async function triumphsChecker() {
            if (roleCategoriesBits & NightRoleCategory.Stats) {
                const activeTriumphs = destinyProfileResponse.profileRecords.data.activeScore;
                for (const step of statisticsRoles.active) {
                    if (activeTriumphs >= step.triumphScore) {
                        if (!memberRoles.has(statisticsRoles.category))
                            give_roles.push(statisticsRoles.category);
                        if (!memberRoles.has(step.roleId)) {
                            give_roles.push(step.roleId);
                            remove_roles.push(statisticsRoles.allActive.filter((r) => r !== step.roleId).toString());
                        }
                        break;
                    }
                }
            }
            role_db.forEach(async (role) => {
                if (role.category === NightRoleCategory.Titles && !(roleCategoriesBits & NightRoleCategory.Titles))
                    return;
                if (role.category === NightRoleCategory.Triumphs && !(roleCategoriesBits & NightRoleCategory.Triumphs))
                    return;
                if (role.gildedTriumphRequirement) {
                    if (destinyProfileResponse.profileRecords.data.records[Number(role.gildedTriumphRequirement)]) {
                        const triumphRecord = destinyProfileResponse.profileRecords.data.records[Number(role.gildedTriumphRequirement)];
                        if (triumphRecord && triumphRecord.completedCount && triumphRecord.completedCount > 0) {
                            const index = triumphRecord.completedCount;
                            if (role.gildedRoles && role.gildedRoles.at(index - 1) && role.gildedRoles.at(index - 1).toLowerCase() !== "null") {
                                if (!memberRoles.has(role.gildedRoles.at(index - 1))) {
                                    give_roles.push(role.gildedRoles.at(index - 1));
                                    remove_roles.push(role.roleId, role.gildedRoles
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
                                                give_roles.push(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id);
                                                remove_roles.push(role.roleId, role
                                                    .gildedRoles.filter((r) => r &&
                                                    r.toLowerCase() !== "null" &&
                                                    r !== member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id)
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
                                        give_roles.push(createdRole.id);
                                        remove_roles.push(role.roleId, dbRoleUpdated.gildedRoles.filter((r) => r && r.toLowerCase() !== "null" && r !== createdRole.id).toString());
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
                                        give_roles.push(titleCategory);
                                    give_roles.push(role.roleId);
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
                    if (triumphRecord) {
                        if ((triumphRecord.objectives && triumphRecord.objectives[triumphRecord.objectives.length - 1].complete === true) ||
                            (triumphRecord.intervalObjectives &&
                                triumphRecord.intervalObjectives[triumphRecord.intervalObjectives.length - 1].complete === true)) {
                            if (role.category === NightRoleCategory.Titles && !memberRoles.has(titleCategory))
                                give_roles.push(titleCategory);
                            if (role.category === NightRoleCategory.Triumphs && !memberRoles.has(triumphsCategory))
                                give_roles.push(triumphsCategory);
                            if (role.category === NightRoleCategory.Activity && !memberRoles.has(activityRoles.category))
                                give_roles.push(activityRoles.category);
                            if (!memberRoles.has(role.roleId))
                                give_roles.push(role.roleId);
                        }
                        else {
                            if (memberRoles.has(role.roleId))
                                remove_roles.push(role.roleId);
                        }
                    }
                }
            });
        }
        seasonalRolesChecker().catch((e) => console.error(`[Error code: 1091] seasonalRolesChecker`, e, member.displayName));
        dlc_rolesChecker(destinyProfileResponse.profile.data.versionsOwned).catch((e) => console.error(`[Error code: 1092] dlc_rolesChecker`, e, member.displayName));
        triumphsChecker().catch((e) => console.error(`[Error code: 1093] triumphsChecker`, e, member.displayName));
        if (roleCategoriesBits & NightRoleCategory.Trials) {
            const metrics = destinyProfileResponse.metrics.data.metrics["1765255052"]?.objectiveProgress.progress;
            if (metrics === null || metrics === undefined || isNaN(metrics))
                return console.error(`[Error code: 1227] ${metrics} ${member.displayName}`, destinyProfileResponse.metrics.data.metrics["1765255052"]?.objectiveProgress);
            if (metrics >= 1) {
                for (const step of trialsRoles.roles) {
                    if (step.totalFlawless <= metrics) {
                        if (!member.roles.cache.has(trialsRoles.category))
                            give_roles.push(trialsRoles.category);
                        if (!member.roles.cache.has(step.roleId)) {
                            give_roles.push(step.roleId);
                            remove_roles.push(trialsRoles.allRoles.filter((r) => r != step.roleId).toString());
                        }
                        return;
                    }
                }
            }
        }
        if (roleCategoriesBits & NightRoleCategory.Activity) {
            if (!userActivity) {
                if (memberRoles.hasAny(activityRoles.allVoice.toString()))
                    remove_roles.push(activityRoles.allVoice.toString());
                if (memberRoles.hasAny(activityRoles.allMessages.toString()))
                    remove_roles.push(activityRoles.allMessages.toString());
                if (memberRoles.has(activityRoles.category))
                    remove_roles.push(activityRoles.category);
                return;
            }
            for (const step of activityRoles.voice) {
                if (step.voiceMinutes <= userActivity.voice) {
                    if (!member.roles.cache.has(step.roleId)) {
                        if (!member.roles.cache.has(activityRoles.category))
                            give_roles.push(activityRoles.category);
                        give_roles.push(step.roleId);
                        remove_roles.push(activityRoles.allVoice.filter((r) => r != step.roleId).toString());
                    }
                    break;
                }
            }
            for (const step of activityRoles.messages) {
                if (step.messageCount <= userActivity.messages) {
                    if (!member.roles.cache.has(step.roleId)) {
                        if (!member.roles.cache.has(activityRoles.category))
                            give_roles.push(activityRoles.category);
                        give_roles.push(step.roleId);
                        remove_roles.push(activityRoles.allMessages.filter((r) => r != step.roleId).toString());
                    }
                    break;
                }
            }
        }
        if (give_roles.length > 0) {
            setTimeout(() => {
                const rolesForGiving = give_roles
                    .join()
                    .split(",")
                    .filter((r) => r.length > 10);
                if (give_roles.filter((r) => r.length <= 10).length > 0)
                    console.error(`[Error code: 1096] Error during giving roles [ ${give_roles} ] for ${member.displayName}`);
                member.roles.add(rolesForGiving, "+Autorole").catch((e) => console.error(`[Error code: 1097] [Autorole error]`, e, rolesForGiving));
            }, remove_roles.length > 0 ? 4444 : 0);
        }
        if (remove_roles.length > 0) {
            const rolesForRemoving = remove_roles
                .join()
                .split(",")
                .filter((r) => r.length > 10);
            if (rolesForRemoving.filter((r) => r.length <= 10).length > 0)
                console.error(`[Error code: 1225] Error during removin roles [ ${rolesForRemoving} ] from ${member.displayName}`);
            member.roles
                .remove(rolesForRemoving, "-Autorole")
                .catch((e) => console.error(`[Error code: 1226] Error during removing roles: ${rolesForRemoving}`));
        }
    }
    catch (e) {
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1229] ${e.statusCode}`);
        else
            console.error("[Error code: 1230]", e.error?.stack || e.error || e, e.statusCode);
    }
}
async function userNicknameChanging(discordId, name) {
    try {
        client.getCachedMembers().get(discordId)?.setNickname(name, "GlobalNickname changed");
    }
    catch (error) {
        console.error("[Error code: 1098] Name change error", error);
    }
}
async function destinyClanManagmentSystem(bungie_array) {
    try {
        const clanList = await fetchRequest("Platform/GroupV2/4123712/Members/?memberType=None");
        if (!clanList) {
            console.log("[Error code: 1013] [Clan checker]", clanList);
            return;
        }
        if (clanList?.ErrorCode && clanList.ErrorCode !== apiStatus.status) {
            apiStatus.status = clanList.ErrorCode;
        }
        if (!clanList.results || !clanList.results?.length) {
            console.error(`[Error code: 1118]`, clanList);
            return;
        }
        if (clanList.results?.length < 5) {
            console.error("[Error code: 1015]", clanList?.results?.length);
            return;
        }
        const onlineCounter = clanList.results.filter((f) => f.isOnline === true).length;
        if (client.user.presence.activities[0].name.startsWith("🔁"))
            client.stopUpdatingPresence();
        if (onlineCounter === 0) {
            client.user.setActivity(`${clanList.results.length} участников в клане`, { type: 3 });
        }
        else {
            client.user.setActivity(`${onlineCounter} онлайн из ${clanList.results.length}`, { type: 3 });
        }
        const t = await database.transaction();
        await Promise.all(clanList.results.map(async (result) => {
            if (bungie_array.some((e) => e.bungieId === result.destinyUserInfo.membershipId)) {
                const [clan_member] = bungie_array.splice(bungie_array.findIndex((e) => e.bungieId === result.destinyUserInfo.membershipId), 1);
                if (!clanJoinDateCheck.has(result.destinyUserInfo.membershipId)) {
                    await timer(1000);
                    if (!(clan_member.roleCategoriesBits & NightRoleCategory.Triumphs))
                        return clanJoinDateCheck.add(result.destinyUserInfo.membershipId);
                    const member = client.getCachedMembers().get(clan_member.discordId);
                    if (!member)
                        return console.error(`[Error code: 1087] Member not found ${clan_member.discordId}/${clan_member.displayName}`);
                    for (const step of clanJoinDateRoles.roles) {
                        if (step.days <= Math.trunc((new Date().getTime() - new Date(result.joinDate).getTime()) / 1000 / 60 / 60 / 24)) {
                            if (!member.roles.cache.has(step.roleId)) {
                                try {
                                    if (!member.roles.cache.has(triumphsCategory))
                                        member.roles.add(triumphsCategory);
                                    member.roles.add(step.roleId).catch((e) => console.error(`[Error code: 1239] Error catched`, { e }));
                                    setTimeout(async () => {
                                        member.roles.remove(clanJoinDateRoles.allRoles.filter((r) => r !== step.roleId));
                                    }, 1500);
                                }
                                catch (error) {
                                    console.error(`[Error code: 1238] Error during clanJoinDate role managment`, { error });
                                }
                            }
                            break;
                        }
                    }
                    clanJoinDateCheck.add(result.destinyUserInfo.membershipId);
                }
                if (clan_member.displayName !== result.destinyUserInfo.bungieGlobalDisplayName && !clan_member.displayName.startsWith("⁣")) {
                    await AuthData.update({
                        displayName: result.destinyUserInfo.bungieGlobalDisplayName,
                    }, {
                        where: {
                            bungieId: result.destinyUserInfo.membershipId,
                        },
                        transaction: t,
                    });
                    userNicknameChanging(clan_member.discordId, result.destinyUserInfo.bungieGlobalDisplayName);
                }
                if (clan_member.clan === false) {
                    await AuthData.update({ clan: true }, {
                        where: {
                            bungieId: result.destinyUserInfo.membershipId,
                        },
                        transaction: t,
                    });
                    updateClanRolesWithLogging(clan_member, true);
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
async function destinyUserKDChecker({ platform, bungieId: bungieId, accessToken: accessToken }, member) {
    if (apiStatus.status !== 1)
        return;
    try {
        const request = await fetchRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
        for (const step of statisticsRoles.kd) {
            if (step.kd <= request.mergedAllCharacters.results.allPvP.allTime.killsDeathsRatio.basic.value) {
                if (!member.roles.cache.has(step.roleId)) {
                    member.roles.remove(statisticsRoles.allKd.filter((r) => r !== step.roleId));
                    setTimeout(() => member.roles.add(step.roleId), 6000);
                }
                if (!member.roles.cache.has(statisticsRoles.category))
                    member.roles.add(statisticsRoles.category);
                break;
            }
        }
    }
    catch (e) {
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1219] ${e.statusCode} error for ${bungieId}`);
        else
            console.error("[Error code: 1016]", e.error?.name || e.name || e.message, bungieId, e.statusCode);
    }
}
export default new Feature({
    execute: async ({ client }) => {
        setTimeout(async () => {
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
            const dbNotFiltred = (await AuthData.findAll({
                attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "accessToken", "roleCategoriesBits"],
                transaction: t,
                include: UserActivityData,
            }));
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
            dbNotFoundUsers.length > 0 ? console.error(dbNotFoundUsers.filter((val, ind) => ind < 5)) : [];
            const db_plain = dbNotFiltred.filter((data) => client.getCachedMembers().has(data.discordId));
            if (!db_plain || (db_plain.length === 0 && !process.env.DEV_BUILD)) {
                return console.error(`[Checker] [Error code: 1022] DB is ${db_plain ? `${db_plain}${db_plain?.length} size` : `not avaliable`}`);
            }
            for (let i = 0; i < db_plain.length && apiStatus.status === 1; i++) {
                const db_row = db_plain[i];
                const randomValue = Math.floor(Math.random() * 100);
                if (throttleSet.has(db_row.discordId))
                    return throttleSet.delete(db_row.discordId);
                if (longOffline.has(db_row.discordId)) {
                    if (randomValue >= 85)
                        longOffline.delete(db_row.discordId);
                    continue;
                }
                const member = client.getCachedMembers().get(db_row.discordId);
                if (!member) {
                    await client.getCachedGuild().members.fetch();
                    console.error("[Error code: 1023] destinyUsestatisticsRolesChecker, member not found", db_row.displayName);
                    continue;
                }
                if (member.roles.cache.has(statusRoles.clanmember) ||
                    (db_row.UserActivityData &&
                        (db_row.UserActivityData.voice > 0 ||
                            db_row.UserActivityData.messages > 0 ||
                            db_row.UserActivityData.raids > 0 ||
                            db_row.UserActivityData.dungeons > 0))) {
                    if (randomValue >= 50)
                        destinyUserStatisticsRolesChecker(db_row, member, autoRoleData);
                    if ((randomValue < 10 || randomValue > 90) && db_row.roleCategoriesBits & NightRoleCategory.Stats)
                        destinyUserKDChecker(db_row, member);
                    if (randomValue <= 30 && member.roles.cache.hasAny(statusRoles.clanmember, statusRoles.member))
                        destinyActivityChecker(db_row, member, 4);
                    if (randomValue > 40 &&
                        randomValue < 60 &&
                        db_row.roleCategoriesBits & NightRoleCategory.Trials &&
                        !member.roles.cache.has(trialsRoles.wintrader) &&
                        member.roles.cache.has(trialsRoles.category))
                        destinyActivityChecker(db_row, member, 84);
                    await timer(750);
                }
            }
            destinyClanManagmentSystem(db_plain);
        }, 1000 * 60 * 2);
        setInterval(async () => {
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
                if (member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "") !== userDbName && !userDbName.startsWith("⁣"))
                    if (!member.permissions.has("Administrator"))
                        member
                            .setNickname(userDbData.timezone ? `[+${timezone}] ${userDbName}` : userDbName)
                            .catch((e) => console.error("[Error code: 1030] Name autochange error", e));
            });
        }, 1000 * 70 * 5);
    },
});
