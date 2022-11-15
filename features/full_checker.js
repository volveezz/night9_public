import { auth_data, db, discord_activities, role_data } from "../handlers/sequelize.js";
import { activityReporter, clan_joinLeave } from "../handlers/logger.js";
import { forbiddenRaidIds, guildId, ownerId } from "../base/ids.js";
import { dlcsRoles, rActivity, rClanJoinDate, rRaids, rStats, rTitles, rTrials, rTriumphs, seasonalRoles, statusRoles } from "../base/roles.js";
import { Op } from "sequelize";
import { fetchRequest } from "../handlers/webHandler.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export const completedRaidsData = new Map();
export const character_data = new Map();
export const longOffline = new Set();
const clanJoinDateCheck = new Set();
const throttleSet = new Set();
export default (client) => {
    if (guildId === "1007814171267707001")
        return;
    function destinyUserStatsChecker(data, member, role_db) {
        const give_roles = [], remove_roles = [], c = member.roles.cache;
        fetchRequest(`Platform/Destiny2/${data.platform}/Profile/${data.bungie_id}/?components=100,900,1100`, data)
            .then(async (Response) => {
            if (!Response || !Response.metrics || !Response.profileRecords.data?.activeScore || !Response.profile || !Response.profile.data) {
                const ErrorResponse = Response;
                if (ErrorResponse?.ErrorCode === 1688 || ErrorResponse?.ErrorCode === 1672) {
                    console.error(`[Error code: 1081] ${ErrorResponse.ErrorStatus} for ${data.displayname}`);
                    throttleSet.add(member.id);
                    return;
                }
                !ErrorResponse.MessageData ? delete ErrorResponse.MessageData : [];
                return console.error("[Error code: 1039]", data.displayname, ErrorResponse);
            }
            if (!character_data.get(data.discord_id))
                character_data.set(data.discord_id, Response["profile"]["data"]["characterIds"]);
            if (new Date().getTime() - new Date(Response.profile.data.dateLastPlayed).getTime() > 1000 * 60 * 60)
                longOffline.add(member.id);
            if (!c.has(statusRoles.verified))
                give_roles.push(statusRoles.verified);
            async function seasonalRolesChecker() {
                if (Response.profile.data.seasonHashes.includes(Response.profile.data.currentSeasonHash)) {
                    if (!c.has(seasonalRoles.curSeasonRole))
                        give_roles.push(seasonalRoles.curSeasonRole);
                    if (c.has(seasonalRoles.nonCurSeasonRole))
                        remove_roles.push(seasonalRoles.nonCurSeasonRole);
                    return [true];
                }
                else {
                    if (!c.has(seasonalRoles.nonCurSeasonRole))
                        give_roles.push(seasonalRoles.nonCurSeasonRole);
                    if (c.has(seasonalRoles.curSeasonRole))
                        remove_roles.push(seasonalRoles.curSeasonRole);
                    return [true];
                }
            }
            async function dlc_rolesChecker(version) {
                if (!version)
                    return;
                if (version > 7 && c.has(dlcsRoles["vanilla"])) {
                    remove_roles.push(dlcsRoles["vanilla"]);
                }
                else if (version <= 7 && !c.has(dlcsRoles["vanilla"])) {
                    give_roles.push(dlcsRoles["vanilla"]);
                    remove_roles.push(Object.values(dlcsRoles)
                        .filter((a) => a !== dlcsRoles["vanilla"])
                        .toString());
                }
                if (version & 8 && !c.has(dlcsRoles.frs))
                    give_roles.push(dlcsRoles.frs);
                if (version & 32 && !c.has(dlcsRoles.sk))
                    give_roles.push(dlcsRoles.sk);
                if (version & 64 && !c.has(dlcsRoles.bl))
                    give_roles.push(dlcsRoles.bl);
                if (version & 128 && !c.has(dlcsRoles.anni))
                    give_roles.push(dlcsRoles.anni);
                if (version & 256 && !c.has(dlcsRoles.twq))
                    give_roles.push(dlcsRoles.twq);
                if (version & 512 && !c.has(dlcsRoles.lf))
                    give_roles.push(dlcsRoles.lf);
            }
            async function triumphsChecker() {
                if (data.roles_cat & 1) {
                    const activeTriumphs = Response.profileRecords.data.activeScore;
                    for (const step of rStats.active) {
                        if (activeTriumphs >= step.triumphScore) {
                            if (!c.has(step.roleId)) {
                                if (!c.has(rStats.category))
                                    give_roles.push(rStats.category);
                                give_roles.push(step.roleId);
                                remove_roles.push(rStats.allActive.filter((r) => r !== step.roleId).toString());
                            }
                            break;
                        }
                    }
                }
                role_db.forEach(async (role) => {
                    if (role.category === 3 && !(data.roles_cat & 4))
                        return;
                    if (role.category === 4 && !(data.roles_cat & 8))
                        return;
                    const checkArray = [];
                    if (role.guilded_hash) {
                        if (Response.profileRecords.data.records[Number(role.guilded_hash)] !== undefined) {
                            const triumphRecord = Response.profileRecords.data.records[Number(role.guilded_hash)];
                            if (triumphRecord && triumphRecord.completedCount && triumphRecord.completedCount > 0) {
                                const index = triumphRecord.completedCount;
                                if (role.guilded_roles && role.guilded_roles.at(index - 1) && role.guilded_roles.at(index - 1).toLowerCase() !== "null") {
                                    if (!c.has(role.guilded_roles.at(index - 1))) {
                                        give_roles.push(role.guilded_roles.at(index - 1));
                                        remove_roles.push(role.role_id, role.guilded_roles
                                            .filter((r) => r && r !== null && r.toLowerCase() !== "null" && r !== role.guilded_roles.at(index - 1))
                                            .toString());
                                        if (role.unique && role.unique > 0) {
                                            if (role.unique === 1) {
                                                await role_data.update({ unique: 0 }, { where: { role_id: role.role_id } });
                                            }
                                            else {
                                                await role_data.decrement("unique", { by: 1, where: { role_id: role.role_id } });
                                            }
                                        }
                                    }
                                }
                                else {
                                    var lastKnownRole = role.role_id;
                                    for (let i = 0; i < index; i++) {
                                        const element = role.guilded_roles[i];
                                        if ((!element || element?.toLowerCase() === "null") && i === index - 1) {
                                            const nonGuildedRole = member.guild.roles.cache.get(role.role_id);
                                            if (nonGuildedRole &&
                                                member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`) !== undefined) {
                                                if (!c.has(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id)) {
                                                    give_roles.push(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGuildedRole.name} ${i + 1}`).id);
                                                    remove_roles.push(role.role_id, role
                                                        .guilded_roles.filter((r) => r &&
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
                                                return console.error(`[Error code: 1089] Not found previous role of ${role.hash}`, lastKnownRole, nonGuildedRole);
                                            }
                                            const createdRole = await member.guild.roles.create({
                                                name: `⚜️${nonGuildedRole.name} ${i + 1}`,
                                                color: "#ffb300",
                                                permissions: [],
                                                position: nonGuildedRole.position,
                                                reason: "Auto auto-role creation",
                                            });
                                            const dbRoleUpdated = await role_data.findOne({ where: { guilded_hash: role.guilded_hash } });
                                            if (!dbRoleUpdated)
                                                return console.error("Информация о роли не найдена в БД", dbRoleUpdated);
                                            dbRoleUpdated.guilded_roles[i] = createdRole.id;
                                            for (let i = 0; i < index || i < dbRoleUpdated.guilded_roles.length; i++) {
                                                const element = dbRoleUpdated.guilded_roles ? dbRoleUpdated.guilded_roles[i] : undefined;
                                                if (!element || element === undefined || element?.toLowerCase() === "null")
                                                    dbRoleUpdated.guilded_roles[i] = "null";
                                            }
                                            give_roles.push(createdRole.id);
                                            remove_roles.push(role.role_id, dbRoleUpdated.guilded_roles.filter((r) => r && r.toLowerCase() !== "null" && r !== createdRole.id).toString());
                                            await role_data.update({ guilded_roles: `{${dbRoleUpdated.guilded_roles}}` }, { where: { guilded_hash: dbRoleUpdated.guilded_hash } });
                                            break;
                                        }
                                        else if (element && element.toLowerCase() !== "null") {
                                            lastKnownRole = element;
                                        }
                                        else {
                                            role.guilded_roles[i] = "null";
                                        }
                                    }
                                }
                            }
                            else if (Response.profileRecords.data.records[Number(role.hash[0])]) {
                                const notGuidedTriumphRecord = Response.profileRecords.data.records[Number(role.hash[0])];
                                if (notGuidedTriumphRecord.objectives
                                    ? notGuidedTriumphRecord.objectives?.pop()?.complete === true
                                    : notGuidedTriumphRecord.intervalObjectives?.pop()?.complete === true) {
                                    if (!c.has(role.role_id)) {
                                        if (role.category & 4 && !c.has(rTitles.category))
                                            give_roles.push(rTitles.category);
                                        give_roles.push(role.role_id);
                                    }
                                }
                            }
                        }
                        else {
                            console.error(`[Error code: 1090] Profile record ${role.guilded_hash} not found for ${member.displayName}`);
                        }
                    }
                    else {
                        role.hash.forEach((hashArray) => {
                            if (Response.profileRecords.data.records[Number(hashArray)]) {
                                const triumphRecord = Response.profileRecords.data.records[Number(hashArray)];
                                if (triumphRecord.objectives
                                    ? triumphRecord.objectives?.pop()?.complete === true
                                    : triumphRecord.intervalObjectives?.pop()?.complete === true) {
                                    checkArray.push(true);
                                }
                                else {
                                    return checkArray.push(false);
                                }
                            }
                        });
                        if (checkArray.includes(false) || checkArray.length !== role.hash.length) {
                            if (c.has(role.role_id))
                                remove_roles.push(role.role_id);
                        }
                        else {
                            if (role.category & 4 && !c.has(rTitles.category))
                                give_roles.push(rTitles.category);
                            if (role.category & 8 && !c.has(rTriumphs.category))
                                give_roles.push(rTriumphs.category);
                            if (role.category & 16 && !c.has(rActivity.category))
                                give_roles.push(rActivity.category);
                            if (!c.has(role.role_id))
                                give_roles.push(role.role_id);
                        }
                    }
                });
            }
            async function trialsChecker(metrics) {
                if (isNaN(metrics))
                    return;
                if (metrics >= 1) {
                    for (const step of rTrials.roles) {
                        if (step.totalFlawless <= metrics) {
                            if (!member.roles.cache.has(step.roleId)) {
                                if (!member.roles.cache.has(rTrials.category))
                                    give_roles.push(rTrials.category);
                                give_roles.push(step.roleId);
                                remove_roles.push(rTrials.allRoles.filter((r) => r != step.roleId).toString());
                            }
                            return;
                        }
                    }
                }
            }
            async function voiceChecker() {
                if (!data.discord_activity) {
                    if (c.hasAny(rActivity.allVoice.toString()))
                        remove_roles.push(rActivity.allVoice.toString());
                    if (c.hasAny(rActivity.allMessages.toString()))
                        remove_roles.push(rActivity.allMessages.toString());
                    if (c.has(rActivity.category))
                        remove_roles.push(rActivity.category);
                    return;
                }
                for (const step of rActivity.voice) {
                    if (step.voiceMinutes <= data.discord_activity.voice) {
                        if (!member.roles.cache.has(step.roleId)) {
                            if (!member.roles.cache.has(rActivity.category))
                                give_roles.push(rActivity.category);
                            give_roles.push(step.roleId);
                            remove_roles.push(rActivity.allVoice.filter((r) => r != step.roleId).toString());
                        }
                        break;
                    }
                }
                for (const step of rActivity.messages) {
                    if (step.messageCount <= data.discord_activity.messages) {
                        if (!member.roles.cache.has(step.roleId)) {
                            if (!member.roles.cache.has(rActivity.category))
                                give_roles.push(rActivity.category);
                            give_roles.push(step.roleId);
                            remove_roles.push(rActivity.allMessages.filter((r) => r != step.roleId).toString());
                        }
                        break;
                    }
                }
            }
            seasonalRolesChecker().catch((e) => console.error(`[Error code: 1091] seasonalRolesChecker`, e, member.displayName));
            dlc_rolesChecker(Response.profile.data.versionsOwned).catch((e) => console.error(`[Error code: 1092] dlc_rolesChecker`, e, member.displayName));
            triumphsChecker().catch((e) => console.error(`[Error code: 1093] triumphsChecker`, e, member.displayName));
            data.roles_cat & 2
                ? trialsChecker(Response.metrics.data.metrics["1765255052"]?.objectiveProgress.progress).catch((e) => console.error(`[Error code: 1094] trialsChecker`, e, member.displayName))
                : "";
            data.roles_cat & 16
                ? voiceChecker().catch((e) => console.error("[Error code: 1095] voiceChecker", e, member.displayName))
                : "";
            if (give_roles.length > 0) {
                setTimeout(() => {
                    const gRoles = give_roles
                        .join()
                        .split(",")
                        .filter((r) => r.length > 10);
                    give_roles.filter((r) => r.length <= 10).length > 0
                        ? console.error(`[Error code: 1096] Error during removin roles`, member.displayName, give_roles)
                        : [];
                    member.roles.add(gRoles, "+Autorole").catch((e) => console.error(`[Error code: 1097] [Autorole error] ${e.toString()}`, gRoles));
                }, remove_roles.length > 0 ? 6000 : 0);
            }
            if (remove_roles.length > 0) {
                const rRoles = remove_roles
                    .join()
                    .split(",")
                    .filter((r) => r.length > 10);
                rRoles.filter((r) => r.length <= 10).length > 0 ? console.error(`Error during removin roles`, member.displayName, rRoles) : [];
                member.roles.remove(rRoles, "-Autorole").catch((e) => console.error(`Error with takin these roles: ${rRoles}`));
            }
        })
            .catch((e) => {
            e.statusCode === 401 || e.statusCode === 503 || e.statusCode === 500
                ? console.error(`[Error code: 1065] destinyUserStatsChecker ${e.statusCode} error`, data.displayname)
                : console.error(`[Error code: 1066] destinyUserStatsChecker`, e.error?.stack || e.error || e, data.displayname, e.statusCode || e);
        });
    }
    function name_change(discord_id, name) {
        try {
            client.guilds.cache.get(guildId).members.cache.get(discord_id)?.setNickname(name, "GlobalNickname changed");
        }
        catch (error) {
            console.error("[Error code: 1098] [Checker error] Name change error", error);
        }
    }
    async function clan(bungie_array) {
        const clanList = await fetchRequest("Platform/GroupV2/4123712/Members/?memberType=None").catch((e) => console.error(`[Error code: 1088] Clan checker error | 1`, e.statusCode));
        if (!clanList) {
            console.log("[Error code: 1013] [Clan checker]", clanList);
            return;
        }
        if (clanList.results.length < 5) {
            console.error("[Error code: 1015] [Clan checker]", clanList?.results?.length);
            return;
        }
        const onlineCounter = clanList.results.filter((f) => f.isOnline === true).length;
        onlineCounter == 0
            ? client.user.setActivity(`${clanList.results.length} участников в клане`, { type: 3 })
            : client.user.setActivity(`${onlineCounter} онлайн из ${clanList.results.length}`, { type: 3 });
        const t = await db.transaction();
        await Promise.all(clanList.results.map(async (result) => {
            if (bungie_array.some((e) => e.bungie_id === result.destinyUserInfo.membershipId)) {
                const [clan_member] = bungie_array.splice(bungie_array.findIndex((e) => e.bungie_id === result.destinyUserInfo.membershipId), 1);
                if (!clanJoinDateCheck.has(result.destinyUserInfo.membershipId)) {
                    await timer(1000);
                    if (!(clan_member.roles_cat & 8))
                        return clanJoinDateCheck.add(result.destinyUserInfo.membershipId);
                    const member = client.guilds.cache.get(guildId)?.members.cache.get(clan_member.discord_id);
                    if (!member)
                        return console.error(`[Error code: 1087] Clan checker error | 5`, member, clan_member.discord_id, clan_member.displayname);
                    for (const step of rClanJoinDate.roles) {
                        if (step.days <= Math.trunc((new Date().getTime() - new Date(result.joinDate).getTime()) / 1000 / 60 / 60 / 24)) {
                            if (!member.roles.cache.has(step.roleId)) {
                                if (!member.roles.cache.has(rTriumphs.category))
                                    member.roles.add(rTriumphs.category);
                                member.roles.add(step.roleId);
                                setTimeout(() => {
                                    member.roles.remove(rClanJoinDate.allRoles.filter((r) => r !== step.roleId));
                                }, 1500);
                            }
                            clanJoinDateCheck.add(result.destinyUserInfo.membershipId);
                            break;
                        }
                    }
                }
                if (clan_member.displayname !== result.destinyUserInfo.bungieGlobalDisplayName && !clan_member.displayname.startsWith("⁣")) {
                    await auth_data.update({
                        displayname: result.destinyUserInfo.bungieGlobalDisplayName,
                    }, {
                        where: {
                            bungie_id: result.destinyUserInfo.membershipId,
                        },
                        transaction: t,
                    });
                    name_change(clan_member.discord_id, result.destinyUserInfo.bungieGlobalDisplayName);
                }
                if (clan_member.clan === false) {
                    await auth_data.update({ clan: true }, {
                        where: {
                            bungie_id: result.destinyUserInfo.membershipId,
                        },
                        transaction: t,
                    });
                    clan_joinLeave(clan_member, true);
                }
            }
        }));
        await Promise.all(bungie_array.map(async (result) => {
            if (result.clan === true) {
                await auth_data.update({ clan: false }, { where: { bungie_id: result.bungie_id }, transaction: t });
                clan_joinLeave(result, false);
            }
        }));
        try {
            await t.commit();
        }
        catch (error) {
            console.error("Clan checker error | 6", error);
        }
    }
    function destinyUserKDChecker(db_row, member) {
        fetchRequest(`Platform/Destiny2/${db_row.platform}/Account/${db_row.bungie_id}/Character/0/Stats/?groups=1&modes=5&periodType=2`, db_row)
            .then((data) => {
            for (const step of rStats.kd) {
                if (step.kd <= data["allPvP"]["allTime"]?.["killsDeathsRatio"]?.["basic"]?.["value"]) {
                    if (!member.roles.cache.has(step.roleId)) {
                        member.roles.remove(rStats.allKd.filter((r) => r !== step.roleId));
                        setTimeout(() => member.roles.add(step.roleId), 6000);
                    }
                    if (!member.roles.cache.has(rStats.category))
                        member.roles.add(rStats.category);
                    break;
                }
            }
        })
            .catch((e) => {
            e.statusCode === 401 || e.statusCode === 500 || e.statusCode === 503
                ? console.error(`destinyUserKDChecker ${e.statusCode} error`, db_row.displayname, e.error?.ErrorStatus)
                : console.error(`destinyUserKDChecker`, e.error?.stack || e.error || e, db_row.displayname, e.statusCode);
        });
    }
    async function destinyActivityStatsChecker(data, member, mode) {
        if (!character_data.get(member.id)) {
            fetchRequest(`Platform/Destiny2/${data.platform}/Account/${data.bungie_id}/Stats/?groups=1`, data)
                .then((chars) => {
                const charIdArray = [];
                chars["characters"].forEach((ch) => charIdArray.push(ch.characterId));
                character_data.set(data.discord_id, charIdArray);
                destinyActivityStatsChecker(data, member, mode);
            })
                .catch((e) => {
                e.statusCode === 401 || e.statusCode === 503 || e.statusCode === 500
                    ? console.error(`[destinyActivityStatsChecker web ${e.statusCode} error]`, "[Error code: 1017]", data.displayname)
                    : console.error("[destinyActivityStatsChecker] [Error code: 1016]", e.error?.stack || e.error || e, data.displayname, e.statusCode);
            });
        }
        else {
            let completedActivities = [], kills = 0, deaths = 0, wtmatches = 0;
            for (const character of character_data.get(member.id)) {
                let page = 0;
                await checker();
                async function activities(page) {
                    const response = await fetchRequest(`Platform/Destiny2/${data.platform}/Account/${data.bungie_id}/Character/${character}/Stats/Activities/?count=250&mode=${mode}&page=${page}`, data);
                    return response;
                }
                async function checker() {
                    const response = await activities(page);
                    if (!response)
                        return console.error("[Error code: 1018]");
                    if (response.activities?.length > 0) {
                        response.activities.forEach((activity) => {
                            if (mode === 4 && activity.values.completed.basic.value) {
                                if (new Date(activity.period).getTime() + activity.values.activityDurationSeconds.basic.value * 1000 >
                                    new Date().getTime() - 1000 * 60 * 15) {
                                    activityReporter(activity.activityDetails.instanceId);
                                }
                                if (!forbiddenRaidIds.includes(activity.activityDetails.referenceId))
                                    completedActivities.push(activity.activityDetails.referenceId);
                            }
                            else if (mode === 84) {
                                if (activity.values.completionReason.basic.value === 3)
                                    wtmatches++;
                                kills += activity.values.kills.basic.value;
                                deaths += activity.values.deaths.basic.value;
                            }
                        });
                        if (response.activities.length === 250) {
                            page++;
                            await checker();
                        }
                    }
                }
            }
            if (mode === 4) {
                const filter = (activity) => {
                    const filtered = completedActivities.filter((a) => a === activity).length;
                    completedActivities = completedActivities.filter((a) => a !== activity);
                    return filtered;
                };
                const totalRaidCount = completedActivities.length;
                const totalRaidCount_Before = completedRaidsData.get(member.id)?.totalRaidCount;
                if (totalRaidCount_Before && totalRaidCount_Before > totalRaidCount)
                    return;
                const kf = filter(1374392663) + filter(1063970578);
                const kfMaster = filter(2964135793);
                const votd = filter(1441982566);
                const votdMaster = filter(4217492330);
                const dsc = filter(910380154) + filter(3976949817);
                const gos = filter(3458480158) + filter(2497200493) + filter(2659723068) + filter(3845997235);
                const vog = filter(3881495763) + filter(1485585878);
                const vogMaster = filter(1681562271);
                const lw = filter(2122313384) + filter(1661734046);
                completedRaidsData.set(member.id, {
                    kf,
                    kfMaster,
                    votd,
                    votdMaster,
                    dsc,
                    gos,
                    vog,
                    vogMaster,
                    lw,
                    totalRaidCount,
                });
                for (const step of rRaids.roles) {
                    if (kf + kfMaster >= (step.individualClears >= 30 ? Math.trunc(step.individualClears / 2) : step.individualClears) &&
                        votd + votdMaster >= step.individualClears &&
                        vog + vogMaster >= step.individualClears &&
                        dsc >= step.individualClears &&
                        gos >= step.individualClears &&
                        lw >= step.individualClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            member.roles.add(step.roleId);
                            setTimeout(() => member.roles.remove(rRaids.allRoles.filter((r) => r !== step.roleId)), 5000);
                        }
                        break;
                    }
                    else if (kf + kfMaster + votdMaster + votd + vog + vogMaster + dsc + gos + lw >= step.totalClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            member.roles.add(step.roleId);
                            setTimeout(() => member.roles.remove(rRaids.allRoles.filter((r) => r !== step.roleId)), 5000);
                        }
                        break;
                    }
                }
                if (completedActivities.length > 0) {
                    console.log(`Activity checker found new unique raid ids`, completedActivities);
                    completedActivities.filter((v, i, a) => a.indexOf(v) === i).forEach((a) => forbiddenRaidIds.push(Number(a)));
                }
            }
            else if (mode === 84) {
                if (wtmatches >= 10 && member.id !== ownerId) {
                    if (!member.roles.cache.has(rTrials.wintrader)) {
                        member.roles.add(rTrials.wintrader);
                        setTimeout(() => member.roles.remove(rTrials.allKd), 6000);
                    }
                    return;
                }
                else {
                    const kd = kills / deaths;
                    if (!isNaN(kd)) {
                        for (const step of rTrials.kd) {
                            if (kd >= step.kd) {
                                if (!member.roles.cache.has(rTrials.category))
                                    member.roles.add(rTrials.category);
                                if (!member.roles.cache.has(step.roleId)) {
                                    member.roles.add(step.roleId);
                                    setTimeout(() => member.roles.remove(rTrials.allKd.filter((r) => r !== step.roleId)), 6000);
                                }
                                break;
                            }
                        }
                    }
                    else {
                        console.error("[Error code: 1019]", `KD is NaN`, member.displayName, kills, deaths, wtmatches);
                    }
                }
            }
        }
    }
    let kd = 2, raids = 4, trialsCD = 4;
    setInterval(async () => {
        kd >= 9 ? (kd = 0) : kd++;
        raids >= 6 ? (raids = 0) : raids++;
        trialsCD >= 15 ? (trialsCD = 0) : trialsCD++;
        const t = await db.transaction();
        const role_db = await role_data.findAll({
            where: {
                unique: {
                    [Op.or]: {
                        [Op.gte]: 1,
                        [Op.eq]: -99,
                    },
                },
            },
            transaction: t,
        });
        const dbNotFiltred = await auth_data.findAll({
            attributes: ["discord_id", "bungie_id", "platform", "displayname", "access_token", "roles_cat"],
            transaction: t,
            include: discord_activities,
        });
        try {
            await t.commit();
        }
        catch (error) {
            return console.error("[Error code: 1020]", error);
        }
        const dbNotFoundUsers = dbNotFiltred
            .filter((data) => !client.guilds.cache.get(guildId)?.members.cache.has(data.discord_id))
            .map((val, ind) => {
            return ind < 5 ? `[Error code: 1021] ${val.displayname}/${val.discord_id} not found on server` : null;
        });
        dbNotFoundUsers.length > 0 ? console.error(dbNotFoundUsers.filter((val, ind) => ind < 5)) : [];
        const db_plain = dbNotFiltred.filter((data) => client.guilds.cache.get(guildId).members.cache.has(data.discord_id));
        if (!db_plain || db_plain.length === 0) {
            await client.guilds.cache.get(guildId).members.fetch();
            return console.error(`[Checker] [Error code: 1022] DB is ${db_plain ? `${db_plain} size` : `not avaliable`}`);
        }
        for (let i = 0; i < db_plain.length; i++) {
            const db_row = db_plain[i];
            if (throttleSet.has(db_row.discord_id))
                return throttleSet.delete(db_row.discord_id);
            if (longOffline.has(db_row.discord_id)) {
                if (Math.random() > 0.82)
                    longOffline.delete(db_row.discord_id);
                return;
            }
            const member = client.guilds.cache.get(guildId)?.members.cache.get(db_row.discord_id);
            if (!member) {
                await client.guilds.cache.get(guildId)?.members.fetch();
                return console.error("[Error code: 1023] destinyUserStatsChecker, member not found", db_row.displayname);
            }
            if (member.roles.cache.has(statusRoles.clanmember) ||
                (db_row.discord_activity &&
                    (db_row.discord_activity.voice > 0 ||
                        db_row.discord_activity.messages > 0 ||
                        db_row.discord_activity.raids > 0 ||
                        db_row.discord_activity.dungeons > 0))) {
                destinyUserStatsChecker(db_row, member, role_db);
                kd === 8 && db_row.roles_cat & 1 ? destinyUserKDChecker(db_row, member) : [];
                raids === 5 && member.roles.cache.hasAny(statusRoles.clanmember, statusRoles.member)
                    ? destinyActivityStatsChecker(db_row, member, 4)
                    : [];
                trialsCD === 7 &&
                    db_row.roles_cat & 2 &&
                    !member.roles.cache.has(rTrials.wintrader) &&
                    member.roles.cache.has(rTrials.category)
                    ? destinyActivityStatsChecker(db_row, member, 84)
                    : [];
                await timer(700);
            }
        }
        clan(db_plain);
    }, 1000 * 60 * 2);
    setInterval(async () => {
        const dbData = await auth_data.findAll({
            attributes: ["discord_id", "displayname", "tz"],
        });
        const verifiedGuildMembers = client.guilds.cache.get(guildId).members.cache.filter((member) => member.roles.cache.has(statusRoles.verified));
        verifiedGuildMembers.forEach((member) => {
            const userDbData = dbData.find((d) => d.discord_id === member.id);
            if (!userDbData)
                return;
            const { tz, displayname: userDbName } = userDbData;
            if (member.displayName.replace(/\[[+](?:\d|\d\d)]/, "") !== userDbName && !userDbData.displayname.startsWith("⁣")) {
                console.debug(`DEBUG VALUE: ${member.displayName} is updating (${member.displayName.replace(/\[[+](?:\d|\d\d)]/, "")}/${userDbData.displayname})`);
                if (!member.permissions.has("Administrator"))
                    member
                        .setNickname(userDbData.tz ? `[+${tz}] ${userDbName}` : userDbName)
                        .catch((e) => console.error("[Error code: 1030] Name autochange error", e));
            }
        });
    }, 1000 * 70 * 5);
};
