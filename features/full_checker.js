"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.character_data = exports.completedRaidsData = void 0;
const sequelize_1 = require("../handlers/sequelize");
const request_promise_native_1 = require("request-promise-native");
const logger_1 = require("../handlers/logger");
const ids_1 = require("../base/ids");
const roles_1 = require("../base/roles");
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
exports.completedRaidsData = new Map();
exports.character_data = new Map();
exports.default = (client) => {
    function role_manager(data, member, role_db) {
        const give_roles = [], remove_roles = [], c = member.roles.cache;
        (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${data.platform}/Profile/${data.bungie_id}/?components=100,900,1100`, {
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": process.env.XAPI,
            },
            auth: {
                bearer: data.access_token ? data.access_token : undefined,
            },
            json: true,
        })
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { Response } = response;
            if (!exports.character_data.get(data.discord_id)) {
                exports.character_data.set(data.discord_id, Response["profile"]["data"]["characterIds"]);
            }
            function seasonalRolesChecker() {
                return __awaiter(this, void 0, void 0, function* () {
                    if (Response.profile.data.seasonHashes.includes(Response.profile.data.currentSeasonHash)) {
                        if (!c.has(roles_1.seasonalRoles.curSeasonRole))
                            give_roles.push(roles_1.seasonalRoles.curSeasonRole);
                        if (c.has(roles_1.seasonalRoles.nonCurSeasonRole))
                            remove_roles.push(roles_1.seasonalRoles.nonCurSeasonRole);
                        return [true];
                    }
                    else {
                        if (!c.has(roles_1.seasonalRoles.nonCurSeasonRole))
                            give_roles.push(roles_1.seasonalRoles.nonCurSeasonRole);
                        if (c.has(roles_1.seasonalRoles.curSeasonRole))
                            remove_roles.push(roles_1.seasonalRoles.curSeasonRole);
                        return [true];
                    }
                });
            }
            function dlc_rolesChecker(version) {
                return __awaiter(this, void 0, void 0, function* () {
                    let dlcs = [false, false, false, false, false];
                    switch (version) {
                        case 7:
                            dlcs = [false, false, false, false, false];
                            break;
                        case 31:
                            dlcs = [true, false, false, false, false];
                            break;
                        case 63:
                            dlcs = [true, true, false, false, false];
                            break;
                        case 71:
                            dlcs = [false, false, true, false, false];
                            break;
                        case 95:
                            dlcs = [true, false, true, false, false];
                            break;
                        case 127:
                            dlcs = [true, true, true, false, false];
                            break;
                        case 135:
                            dlcs = [false, false, false, true, false];
                            break;
                        case 191:
                            dlcs = [true, true, false, true, false];
                            break;
                        case 223:
                            dlcs = [true, false, true, true, false];
                            break;
                        case 255:
                            dlcs = [true, true, true, true, false];
                            break;
                        case 263:
                            dlcs = [false, false, false, false, true];
                            break;
                        case 287:
                            dlcs = [true, false, false, false, true];
                            break;
                        case 319:
                            dlcs = [true, true, false, false, true];
                            break;
                        case 327:
                            dlcs = [false, false, true, false, true];
                            break;
                        case 351:
                            dlcs = [true, false, true, false, true];
                            break;
                        case 383:
                            dlcs = [true, true, true, false, true];
                            break;
                        case 391:
                            dlcs = [false, false, false, true, true];
                            break;
                        case 447:
                            dlcs = [true, true, false, true, true];
                            break;
                        case 455:
                            dlcs = [false, false, true, true, true];
                            break;
                        case 487:
                            dlcs = [false, true, true, true, true];
                            break;
                        case 511:
                            dlcs = [true, true, true, true, true];
                            break;
                        default:
                            console.log(`[AUTOROLE] NOT FOUND DATA FOR THIS NUMBER ${version}, BungieId: ${data.platform}/${data.bungie_id}`);
                            break;
                    }
                    if (dlcs.includes(true)) {
                        c.has(roles_1.dlcsRoles.vanilla) ? remove_roles.push(roles_1.dlcsRoles.vanilla) : [];
                    }
                    else {
                        !c.has(roles_1.dlcsRoles.vanilla) ? give_roles.push(roles_1.dlcsRoles.vanilla) : [];
                    }
                    if (dlcs[0])
                        !c.has(roles_1.dlcsRoles.frs) ? give_roles.push(roles_1.dlcsRoles.frs) : "";
                    if (dlcs[1])
                        !c.has(roles_1.dlcsRoles.sk) ? give_roles.push(roles_1.dlcsRoles.sk) : "";
                    if (dlcs[2])
                        !c.has(roles_1.dlcsRoles.bl) ? give_roles.push(roles_1.dlcsRoles.bl) : "";
                    if (dlcs[3])
                        !c.has(roles_1.dlcsRoles.anni) ? give_roles.push(roles_1.dlcsRoles.anni) : "";
                    if (dlcs[4])
                        !c.has(roles_1.dlcsRoles.twq) ? give_roles.push(roles_1.dlcsRoles.twq) : "";
                });
            }
            function triumphsChecker() {
                return __awaiter(this, void 0, void 0, function* () {
                    const activeTriumphs = Response.profileRecords.data.activeScore;
                    for (const step of roles_1.rStats.active) {
                        if (activeTriumphs >= step.triumphScore) {
                            if (!c.has(step.roleId)) {
                                if (!c.has(roles_1.rStats.category))
                                    give_roles.push(roles_1.rStats.category);
                                give_roles.push(step.roleId);
                                remove_roles.push(roles_1.rStats.allActive.filter((r) => r !== step.roleId).toString());
                            }
                            break;
                        }
                    }
                    role_db.forEach((role) => {
                        const checkArray = [];
                        role.hash.forEach((hashArray) => {
                            var _a, _b, _c, _d;
                            if (Response.profileRecords.data.records[hashArray] !== undefined) {
                                const triumphRecord = Response.profileRecords.data.records[hashArray];
                                if (triumphRecord.objectives
                                    ? ((_b = (_a = triumphRecord.objectives) === null || _a === void 0 ? void 0 : _a.pop()) === null || _b === void 0 ? void 0 : _b.complete) === true
                                    : ((_d = (_c = triumphRecord.intervalObjectives) === null || _c === void 0 ? void 0 : _c.pop()) === null || _d === void 0 ? void 0 : _d.complete) === true) {
                                    checkArray.push(true);
                                }
                                else {
                                    return checkArray.push(false);
                                }
                            }
                        });
                        if (checkArray.includes(false) || checkArray.length !== role.hash.length) {
                            if (c.has(String(role.role_id)))
                                remove_roles.push(String(role.role_id));
                        }
                        else {
                            if (role.category === 3 && !c.has(roles_1.rTitles.category))
                                give_roles.push(roles_1.rTitles.category);
                            if (role.category === 4 && !c.has(roles_1.rTriumphs.category))
                                give_roles.push(roles_1.rTriumphs.category);
                            if (role.category === 5 && !c.has(roles_1.rActivity.category))
                                give_roles.push(roles_1.rActivity.category);
                            if (!c.has(String(role.role_id)))
                                give_roles.push(String(role.role_id));
                        }
                    });
                });
            }
            function trialsChecker(metrics) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (metrics >= 1) {
                        for (const step of roles_1.rTrials.roles) {
                            if (step.totalFlawless <= metrics) {
                                if (!member.roles.cache.has(step.roleId)) {
                                    if (!member.roles.cache.has(roles_1.rTrials.category))
                                        give_roles.push(roles_1.rTrials.category);
                                    give_roles.push(step.roleId);
                                    remove_roles.push(roles_1.rTrials.allRoles.filter((r) => r != step.roleId).toString());
                                }
                                break;
                            }
                        }
                    }
                });
            }
            seasonalRolesChecker();
            dlc_rolesChecker(Response.profile.data.versionsOwned);
            triumphsChecker();
            trialsChecker((_a = Response.metrics.data.metrics["1765255052"]) === null || _a === void 0 ? void 0 : _a.objectiveProgress.progress);
            if (give_roles.length > 0) {
                setTimeout(() => {
                    member.roles.add(give_roles, "+Autorole").catch((e) => {
                        console.error(`Error with givin these roles: ${give_roles}`);
                    });
                }, remove_roles.length > 0 ? 6000 : 0);
            }
            if (remove_roles.length > 0) {
                member.roles.remove(remove_roles, "-Autorole").catch((e) => {
                    console.error(`Error with takin these roles: ${remove_roles}`);
                });
            }
        }))
            .catch((e) => console.log(`roleManager error`, e.statusCode, data.displayname));
    }
    function name_change(discord_id, name) {
        var _a;
        try {
            (_a = client.guilds.cache.get(ids_1.guildId).members.cache.get(discord_id)) === null || _a === void 0 ? void 0 : _a.setNickname(name, "GlobalNickname changed");
        }
        catch (error) {
            console.error("[Checker error] Name change error", error);
        }
    }
    function clan(bungie_array) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const clanList = yield (0, request_promise_native_1.get)("https://www.bungie.net/Platform/GroupV2/4123712/Members/?memberType=None", {
                headers: {
                    "Content-Type": "application/json",
                    "X-API-KEY": process.env.XAPI,
                },
                json: true,
            }).catch((e) => {
                throw { name: "Clan checker error", message: `StatusCode: ${e.statusCode}, ${e.message}` };
            });
            if (clanList === undefined) {
                console.log("Clan checker restarts");
                yield timer(5000);
                clan(bungie_array);
                return;
            }
            if (clanList.Response.results.length < 5) {
                console.error("[CRITICAL CLAN CHECKER ERROR]", (_b = (_a = clanList === null || clanList === void 0 ? void 0 : clanList.Response) === null || _a === void 0 ? void 0 : _a.results) === null || _b === void 0 ? void 0 : _b.length);
                yield timer(30000);
                clan(bungie_array);
                return;
            }
            if (clanList.ErrorCode !== 1) {
                console.error("[Clan checker error]", clanList.ErrorStatus, clanList.Message);
                return;
            }
            const onlineCounter = clanList.Response.results.filter((f) => f.isOnline === true).length;
            onlineCounter == 0
                ? client.user.setActivity(`${clanList.Response.results.length} участников в клане`, { type: 3 })
                : client.user.setActivity(`${onlineCounter} онлайн из ${clanList.Response.results.length}`, { type: 3 });
            const t = yield sequelize_1.db.transaction();
            yield Promise.all(clanList.Response.results.map((result) => __awaiter(this, void 0, void 0, function* () {
                if (bungie_array.some((e) => e.bungie_id === result.destinyUserInfo.membershipId)) {
                    const [clan_member] = bungie_array.splice(bungie_array.findIndex((e) => e.bungie_id === result.destinyUserInfo.membershipId), 1);
                    if (clan_member.displayname !== result.destinyUserInfo.bungieGlobalDisplayName && !clan_member.displayname.startsWith("⁣")) {
                        yield sequelize_1.auth_data.update({
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
                        yield sequelize_1.auth_data.update({ clan: true }, {
                            where: {
                                bungie_id: result.destinyUserInfo.membershipId,
                            },
                            transaction: t,
                        });
                        (0, logger_1.clan_joinLeave)(client, clan_member, true);
                    }
                }
            })));
            yield Promise.all(bungie_array.map((result) => __awaiter(this, void 0, void 0, function* () {
                if (result.clan === true) {
                    yield sequelize_1.auth_data.update({ clan: false }, { where: { bungie_id: result.bungie_id }, transaction: t });
                    (0, logger_1.clan_joinLeave)(client, result, false);
                }
            })));
            try {
                yield t.commit();
            }
            catch (error) {
                console.error("[Clan checker error] Error during commiting", error);
            }
        });
    }
    function kdChecker(db_row, member) {
        (0, request_promise_native_1.get)(`https://www.bungie.net/platform/Destiny2/${db_row.platform}/Account/${db_row.bungie_id}/Character/0/Stats/?groups=1&modes=5&periodType=2`, {
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": process.env.XAPI,
            },
            auth: {
                bearer: db_row.access_token,
            },
            json: true,
        })
            .then((data) => {
            var _a, _b, _c;
            for (const step of roles_1.rStats.kd) {
                if (step.kd <= ((_c = (_b = (_a = data["Response"]["allPvP"]["allTime"]) === null || _a === void 0 ? void 0 : _a["killsDeathsRatio"]) === null || _b === void 0 ? void 0 : _b["basic"]) === null || _c === void 0 ? void 0 : _c["value"])) {
                    if (!member.roles.cache.has(step.roleId)) {
                        member.roles.remove(roles_1.rStats.allKd.filter((r) => r !== step.roleId));
                        setTimeout(() => member.roles.add(step.roleId), 6000);
                    }
                    break;
                }
            }
        })
            .catch((e) => console.log(`kdChecker`, e.stack, member.displayName));
    }
    function activityStatsChecker(data, member, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!exports.character_data.get(member.id)) {
                (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${data.platform}/Profile/${data.bungie_id}/?components=200`, {
                    headers: {
                        "Content-Type": "application/json",
                        "X-API-KEY": process.env.XAPI,
                    },
                    auth: {
                        bearer: data.access_token ? data.access_token : undefined,
                    },
                    json: true,
                })
                    .then((chars) => {
                    exports.character_data.set(data.discord_id, Object.keys(chars["Response"]["characters"]["data"]));
                    activityStatsChecker(data, member, mode);
                })
                    .catch((e) => console.log(`activityStatsChecker character error`, e.statusCode));
            }
            else {
                if (mode === 84 && member.roles.cache.has(roles_1.rTrials.wintrader))
                    return;
                let completedActivities = [];
                let kills = 0, deaths = 0, wtmatches = 0;
                for (const character of exports.character_data.get(member.id)) {
                    let page = 0;
                    yield checker();
                    function activities(page) {
                        return __awaiter(this, void 0, void 0, function* () {
                            return (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${data.platform}/Account/${data.bungie_id}/Character/${character}/Stats/Activities/?count=250&mode=${mode}&page=${page}`, {
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-API-KEY": process.env.XAPI,
                                },
                                auth: {
                                    bearer: data.access_token,
                                },
                                json: true,
                            })
                                .then((response) => {
                                return response;
                            })
                                .catch((e) => {
                                console.log(`activityStatsChecker error`, e.statusCode);
                            });
                        });
                    }
                    function checker() {
                        var _a;
                        return __awaiter(this, void 0, void 0, function* () {
                            const response = yield activities(page);
                            if (((_a = response === null || response === void 0 ? void 0 : response.Response.activities) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                                response === null || response === void 0 ? void 0 : response.Response.activities.forEach((activity) => {
                                    if (mode === 4 && activity.values.completed.basic.value) {
                                        if (new Date(activity.period).getTime() > new Date().getTime() - 1000 * 60 * 15) {
                                            (0, logger_1.activityReporter)(activity.activityDetails.instanceId);
                                        }
                                        if (!ids_1.forbiddenRaidIds.includes(activity.activityDetails.referenceId)) {
                                            completedActivities.push(activity.activityDetails.referenceId);
                                        }
                                    }
                                    else if (mode === 84) {
                                        if (activity.values.completionReason.basic.value === 3)
                                            wtmatches++;
                                        kills += activity.values.kills.basic.value;
                                        deaths += activity.values.deaths.basic.value;
                                    }
                                });
                                if (response.Response.activities.length === 250) {
                                    page++;
                                    yield checker();
                                }
                            }
                        });
                    }
                }
                if (mode === 4) {
                    const filter = (activity) => {
                        const filtered = completedActivities.filter((a) => a === activity).length;
                        completedActivities = completedActivities.filter((a) => a !== activity);
                        return filtered;
                    };
                    const votd = filter(1441982566);
                    const votdMaster = filter(4217492330);
                    const dsc = filter(910380154) + filter(3976949817);
                    const gos = filter(3458480158) + filter(2497200493) + filter(2659723068) + filter(3845997235);
                    const vog = filter(3881495763);
                    const vogMaster = filter(1681562271) + filter(1485585878);
                    const lw = filter(2122313384) + filter(1661734046);
                    exports.completedRaidsData.set(member.id, { votd: votd, votdMaster: votdMaster, dsc: dsc, gos: gos, vog: vog, vogMaster: vogMaster, lw: lw });
                    for (const step of roles_1.rRaids.roles) {
                        if (votdMaster + votd >= step.individualClears &&
                            vog + vogMaster >= step.individualClears &&
                            dsc >= step.individualClears &&
                            gos >= step.individualClears &&
                            lw >= step.individualClears) {
                            if (!member.roles.cache.has(step.roleId)) {
                                member.roles.add(step.roleId);
                                setTimeout(() => member.roles.remove(roles_1.rRaids.allRoles.filter((r) => r !== step.roleId)), 6000);
                            }
                            break;
                        }
                        else if (votdMaster + votd + dsc + gos + lw >= step.totalClears) {
                            if (!member.roles.cache.has(step.roleId)) {
                                member.roles.add(step.roleId);
                                setTimeout(() => member.roles.remove(roles_1.rRaids.allRoles.filter((r) => r !== step.roleId)), 6000);
                            }
                            break;
                        }
                    }
                    if (completedActivities.length > 0)
                        console.log(`Found new raidIds`, completedActivities);
                }
                else if (mode === 84) {
                    if (wtmatches >= 10) {
                        if (!member.roles.cache.has(roles_1.rTrials.wintrader) && member.id !== ids_1.ownerId) {
                            member.roles.add(roles_1.rTrials.wintrader);
                            setTimeout(() => member.roles.remove(roles_1.rTrials.allRoles.toString()), 6000);
                        }
                    }
                    else {
                        const kd = kills / deaths;
                        if (!isNaN(kd)) {
                            for (const step of roles_1.rTrials.kd) {
                                if (kd >= step.kd) {
                                    if (!member.roles.cache.has(roles_1.rTrials.category))
                                        member.roles.add(roles_1.rTrials.category);
                                    if (!member.roles.cache.has(step.roleId)) {
                                        member.roles.add(step.roleId);
                                        setTimeout(() => member.roles.remove(roles_1.rTrials.allRoles.filter((r) => r !== step.roleId)), 6000);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    let kd = 0, raids = 5;
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        kd >= 5 ? (kd = 0) : kd++;
        raids >= 7 ? (raids = 0) : raids++;
        const t = yield sequelize_1.db.transaction();
        const role_db = yield sequelize_1.role_data.findAll({ transaction: t });
        const db_plain = (yield sequelize_1.auth_data.findAll({
            transaction: t,
        })).filter((data) => { var _a; return (_a = client.guilds.cache.get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.members.cache.has(data.discord_id); });
        try {
            yield t.commit();
        }
        catch (error) {
            console.error("[Checker error]", error);
            return;
        }
        if ((db_plain === null || db_plain === void 0 ? void 0 : db_plain.length) === 0)
            return console.error(`[Checker error] DB is empty or missing data`);
        for (let i = 0; i < db_plain.length; i++) {
            const db_row = db_plain[i];
            const member = (_a = client.guilds.cache.get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.members.cache.get(db_row.discord_id);
            role_manager(db_row, member, role_db);
            kd === 5 ? kdChecker(db_row, member) : [];
            raids === 6 ? activityStatsChecker(db_row, member, 4) : [];
            raids === 5 ? activityStatsChecker(db_row, member, 84) : [];
            yield timer(700);
        }
        clan(db_plain);
    }), 1000 * 61 * 2);
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        const data = (yield sequelize_1.auth_data.findAll({
            attributes: ["discord_id", "displayname", "tz"],
        })).filter((data) => client.guilds.cache.get(ids_1.guildId).members.cache.has(data.discord_id));
        client.guilds.cache
            .get(ids_1.guildId)
            .members.cache.filter((member) => member.roles.cache.has(roles_1.statusRoles.verified))
            .forEach((member) => {
            var _a, _b;
            const db_data_ind = data.find((d) => d.discord_id === member.id);
            if (!db_data_ind) {
                return;
            }
            const db_name = db_data_ind.displayname;
            if (member.displayName !== db_name &&
                !((_a = data.find((d) => d.discord_id === member.id)) === null || _a === void 0 ? void 0 : _a.displayname.startsWith("⁣")) &&
                member.displayName.slice(5) !== db_name &&
                member.displayName.slice(6) !== db_name) {
                if (!member.permissions.has("Administrator")) {
                    member
                        .setNickname(((_b = data.find((d) => d.discord_id === member.id)) === null || _b === void 0 ? void 0 : _b.tz) ? `[+${data.find((d) => d.discord_id === member.id).tz}] ${db_name}` : db_name)
                        .catch((e) => {
                        console.error("[Checker error] Name autochange error", e);
                    });
                }
            }
        });
    }), 1000 * 70 * 5);
};
