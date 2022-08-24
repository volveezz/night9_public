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
exports.raidMsgUpdate = exports.raidDataFetcher = exports.timerConverter = exports.raidDataInChnMsg = exports.raidInGameChecker = void 0;
const discord_js_1 = require("discord.js");
const channels_1 = require("../base/channels");
const colors_1 = require("../base/colors");
const sequelize_1 = require("../handlers/sequelize");
const full_checker_1 = require("../features/full_checker");
const roles_1 = require("../base/roles");
const ids_1 = require("../base/ids");
const __1 = require("..");
const runningRaids = new Map();
const noDataRaids = new Set();
function raidInGameChecker(raidDb) {
    runningRaids.set(raidDb.id, raidDb.time * 1000);
}
exports.raidInGameChecker = raidInGameChecker;
function raidDataInChnMsg(raidData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!raidData)
            return console.error(`raidDataInChnMsg, no raidData info`);
        if (noDataRaids.has(raidData)) {
            noDataRaids.delete(raidData);
            raidData = yield sequelize_1.raids.findOne({ where: { id: raidData.id } });
            if (!raidData)
                return;
        }
        const inChnMsg = yield (0, channels_1.msgFetcher)(raidData.chnId, raidData.inChnMsg);
        if (!inChnMsg || !inChnMsg.embeds || !inChnMsg.embeds[0]) {
            return console.error(`Error during raidDataInChnMsg`, raidData.chnId, raidData.inChnMsg, inChnMsg ? inChnMsg.id : inChnMsg, inChnMsg ? inChnMsg.embeds : "");
        }
        const embed = discord_js_1.EmbedBuilder.from(inChnMsg.embeds[0]);
        const gMembers = (id) => { var _a; return (_a = __1.BotClient.guilds.cache.get(ids_1.guildId).members.cache.get(id)) === null || _a === void 0 ? void 0 : _a.displayName; };
        const member = (id) => __1.BotClient.guilds.cache.get(ids_1.guildId).members.cache.get(id);
        const joined = raidData.joined.map((data) => {
            var _a, _b;
            const raidUserData = full_checker_1.completedRaidsData.get(data);
            if (!raidUserData) {
                if (!noDataRaids.has(raidData) && ((_a = member(data)) === null || _a === void 0 ? void 0 : _a.roles.cache.has(roles_1.statusRoles.clanmember))) {
                    noDataRaids.add(raidData);
                    setTimeout(() => raidDataInChnMsg(raidData), 60 * 1000 * 5);
                }
                if ((_b = member(data)) === null || _b === void 0 ? void 0 : _b.roles.cache.has(roles_1.statusRoles.verified)) {
                    return `Данные <@${data}> не были закешированы`;
                }
                else {
                    return `<@${data}> не зарегистрирован`;
                }
            }
            return `${gMembers(data)} завершил: ${raidUserData.votd}${raidUserData.votdMaster > 0 ? `(${raidUserData.votdMaster})` : ""} КП, ${raidUserData.vog}${raidUserData.vogMaster > 0 ? `(${raidUserData.vogMaster})` : ""} ХЧ, ${raidUserData.dsc} СГК, ${raidUserData.gos} СС, ${raidUserData.lw} ПЖ`;
        });
        const hotJoined = raidData.hotJoined.map((data) => {
            var _a, _b;
            const raidUserData = full_checker_1.completedRaidsData.get(data);
            if (!raidUserData) {
                if (!noDataRaids.has(raidData) && ((_a = member(data)) === null || _a === void 0 ? void 0 : _a.roles.cache.has(roles_1.statusRoles.clanmember))) {
                    noDataRaids.add(raidData);
                    setTimeout(() => raidDataInChnMsg(raidData), 60 * 1000 * 5);
                }
                if ((_b = member(data)) === null || _b === void 0 ? void 0 : _b.roles.cache.has(roles_1.statusRoles.verified)) {
                    return `Данные <@${data}> не были закешированы`;
                }
                else {
                    return `<@${data}> не зарегистрирован`;
                }
            }
            return `${gMembers(data)} завершил: ${raidUserData.votd}${raidUserData.votdMaster > 0 ? `(${raidUserData.votdMaster})` : ""} КП, ${raidUserData.vog}${raidUserData.vogMaster > 0 ? `(${raidUserData.vogMaster})` : ""} ХЧ, ${raidUserData.dsc} СГК, ${raidUserData.gos} СС, ${raidUserData.lw} ПЖ`;
        });
        const alt = raidData.alt.map((data) => {
            var _a, _b;
            const raidUserData = full_checker_1.completedRaidsData.get(data);
            if (!raidUserData) {
                if (!noDataRaids.has(raidData) && ((_a = member(data)) === null || _a === void 0 ? void 0 : _a.roles.cache.has(roles_1.statusRoles.clanmember))) {
                    noDataRaids.add(raidData);
                    setTimeout(() => raidDataInChnMsg(raidData), 60 * 1000 * 5);
                }
                if ((_b = member(data)) === null || _b === void 0 ? void 0 : _b.roles.cache.has(roles_1.statusRoles.verified)) {
                    return `Данные <@${data}> не были закешированы`;
                }
                else {
                    return `<@${data}> не зарегистрирован`;
                }
            }
            return `${gMembers(data)} завершил: ${raidUserData.votd}${raidUserData.votdMaster > 0 ? `(${raidUserData.votdMaster})` : ""} КП, ${raidUserData.vog}${raidUserData.vogMaster > 0 ? `(${raidUserData.vogMaster})` : ""} ХЧ, ${raidUserData.dsc} СГК, ${raidUserData.gos} СС, ${raidUserData.lw} ПЖ`;
        });
        embed.spliceFields(1, 3);
        if (raidData.joined.length > 0) {
            embed.spliceFields(1, 0, { name: "Успешные закрытия рейдов у основной группы", value: joined.join("\n") });
        }
        if (raidData.hotJoined.length > 0) {
            embed.spliceFields(2, 0, { name: "Успешные закрытия рейдов у запасных участников", value: hotJoined.join("\n") });
        }
        if (raidData.alt.length > 0) {
            embed.spliceFields(3, 0, { name: "Успешные закрытия рейдов у возможных участников", value: alt.join("\n") });
        }
        embed.setTimestamp();
        inChnMsg.edit({ embeds: [embed] });
    });
}
exports.raidDataInChnMsg = raidDataInChnMsg;
function timerConverter(time, data) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const args = time.replace(/\s+/g, " ").trim().split(" ");
        const date = new Date();
        function timeSpliter(args) {
            var _a, _b, _c, _d, _e;
            if (((_a = args[0]) === null || _a === void 0 ? void 0 : _a.split(":").length) === 2 && ((_b = args[1]) === null || _b === void 0 ? void 0 : _b.split("/").length) === 2) {
                var hhmm = args[0];
                var ddmm = args[1];
                return { hhmm, ddmm };
            }
            else if (((_c = args[1]) === null || _c === void 0 ? void 0 : _c.split(":").length) === 2 && ((_d = args[0]) === null || _d === void 0 ? void 0 : _d.split("/").length) === 2) {
                var hhmm = args[1];
                var ddmm = args[0];
                return { hhmm, ddmm };
            }
            else if (args.length === 1 && ((_e = args[0]) === null || _e === void 0 ? void 0 : _e.split(":").length) === 2) {
                var hhmm = args[0];
                var ddmm = `${date.getDate() + `/` + (date.getMonth() + 1)}`;
                return { hhmm, ddmm };
            }
            else {
                return {};
            }
        }
        const { hhmm, ddmm } = timeSpliter(args);
        const daymonth = ddmm === null || ddmm === void 0 ? void 0 : ddmm.split("/");
        const hoursmins = hhmm === null || hhmm === void 0 ? void 0 : hhmm.split(":");
        if (!daymonth || !hoursmins) {
            throw {
                name: "Ошибка времени",
                message: 'Время должно быть указано в формате (без ""): "ДЕНЬ/МЕСЯЦ ЧАС:МИНУТА"\nПробел обязателен если указывается и дата, и время. Знак / и : также обязательны.',
                falseAlarm: true,
            };
        }
        date.setMonth(Math.round(Number(daymonth[1]) - 1), Number(daymonth[0]));
        date.setHours(Number(hoursmins[0]), Number(hoursmins[1]) || 0, 0, 0);
        if (date.getTimezoneOffset() !== -540)
            date.setTime(Math.trunc(date.getTime() - (((_a = (yield data)) === null || _a === void 0 ? void 0 : _a.tz) || 3) * 60 * 60 * 1000));
        const returnTime = Math.trunc(date.getTime() / 1000);
        if (isNaN(returnTime)) {
            throw {
                name: "Ошибка времени",
                message: `Проверьте правильность введенного времени, дата: ${daymonth.toString()}, время: ${hoursmins.toString()}`,
                falseAlarm: true,
            };
        }
        return returnTime;
    });
}
exports.timerConverter = timerConverter;
function raidDataFetcher(raid, difficulty) {
    switch (raid) {
        case "kf":
            return {
                raid: raid,
                raidName: difficulty === 3 ? "Гибель короля: Day One" : difficulty === 2 ? "Гибель короля: Мастер" : "Гибель короля",
                maxDifficulty: 3,
                raidBanner: "https://www.bungie.net/img/theme/destiny/bgs/pgcrs/kings_fall.jpg",
                raidColor: difficulty === 3 ? "#FF7600" : difficulty === 2 ? "#FF063A" : "#565656",
                channelName: "-гибель-короля",
                requiredRole: null,
            };
        case "votd":
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Клятва послушника: Мастер" : "Клятва послушника",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_nemesis.jpg",
                raidColor: difficulty === 2 ? "#FF063A" : "#52E787",
                channelName: "-клятва-послушника",
                requiredRole: roles_1.dlcsRoles.twq,
            };
        case "vog":
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Хрустальный чертог: Мастер" : "Хрустальный чертог",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/vault_of_glass.jpg",
                raidColor: difficulty === 2 ? "#FF063A" : "#52E787",
                channelName: "-хрустальный-чертог",
                requiredRole: null,
            };
        case "dsc":
            return {
                raid: raid,
                raidName: "Склеп Глубокого камня",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg",
                raidColor: "#29ACFF",
                channelName: "-склеп-глубокого-камня",
                requiredRole: roles_1.dlcsRoles.bl,
            };
        case "gos":
            return {
                raid: raid,
                raidName: "Сад спасения",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_garden_of_salvation.jpg",
                raidColor: "#45FFA2",
                channelName: "-сад-спасения",
                requiredRole: roles_1.dlcsRoles.sk,
            };
        case "lw":
            return {
                raid: raid,
                raidName: "Последнее желание",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_beanstalk.jpg",
                raidColor: "#79A1FF",
                channelName: "-последнее-желание",
                requiredRole: roles_1.dlcsRoles.frs,
            };
    }
}
exports.raidDataFetcher = raidDataFetcher;
function getRaid(raidId, interaction) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        if (raidId === null) {
            const raidData = yield sequelize_1.raids.findAll({
                where: { creator: interaction.user.id },
            });
            if (!raidData || !raidData[0] || !((_a = raidData[0]) === null || _a === void 0 ? void 0 : _a.creator)) {
                throw { name: `У вас нет ни одного рейда, создателем которого вы являетесь`, falseAlarm: true };
            }
            else if (raidData[1] !== undefined) {
                throw {
                    name: "Ошибка. Укажите Id рейда для удаления",
                    message: `Id рейдов доступные вам для удаления: ${raidData
                        .map((raidData) => raidData.id)
                        .join(", ")
                        .toString()}`,
                    falseAlarm: true,
                };
            }
            else {
                if (raidData[0].creator !== interaction.user.id && !((_b = interaction.memberPermissions) === null || _b === void 0 ? void 0 : _b.has("Administrator"))) {
                    throw {
                        name: "Недостаточно прав",
                        message: `Управление рейдом ${raidId} доступно лишь ${interaction.guild.members.cache.get(raidData[0].creator).displayName}`,
                        falseAlarm: true,
                    };
                }
                else {
                    return raidData[0];
                }
            }
        }
        else {
            const raidData = yield sequelize_1.raids.findOne({
                where: { id: raidId },
            });
            if (raidData === null || !(raidData === null || raidData === void 0 ? void 0 : raidData.creator)) {
                throw { name: `Рейд ${raidId} не найден`, falseAlarm: true };
            }
            else {
                if (raidData.creator !== interaction.user.id && !((_c = interaction.memberPermissions) === null || _c === void 0 ? void 0 : _c.has("Administrator"))) {
                    throw {
                        name: "Недостаточно прав",
                        message: `Управление рейдом ${raidId} доступно лишь ${interaction.guild.members.cache.get(raidData.creator).displayName}`,
                        falseAlarm: true,
                    };
                }
                else {
                    return raidData;
                }
            }
        }
    });
}
function raidMsgUpdate(raidData, interaction) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const msg = yield (0, channels_1.msgFetcher)(ids_1.ids.raidChnId, raidData.msgId);
        if (!msg || !msg.embeds || !msg.embeds[0]) {
            return console.error(`Error during raidMsgUpdate`, msg.id, msg.embeds);
        }
        const embed = discord_js_1.EmbedBuilder.from(msg.embeds[0]);
        const gMembers = (id) => { var _a; return (_a = interaction.guild.members.cache.get(id)) === null || _a === void 0 ? void 0 : _a.displayName; };
        const joined = raidData.joined && raidData.joined.length >= 1 ? raidData.joined.map((data) => gMembers(data)).join(", ") : "Никого";
        const hotJoined = raidData.hotJoined && raidData.hotJoined.length >= 1 ? raidData.hotJoined.map((data) => gMembers(data)).join(", ") : "Никого";
        const alt = raidData.alt && raidData.alt.length >= 1 ? raidData.alt.map((data) => gMembers(data)).join(", ") : "Никого";
        if (raidData.joined.length && raidData.joined.length == 6) {
            embed.setColor(null);
        }
        else if (embed.data.color === undefined) {
            embed.setColor(raidDataFetcher(raidData.raid, raidData.difficulty).raidColor);
        }
        const isDescription = ((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.findIndex((d) => d.name.startsWith("Описание"))) ? 1 : 0;
        const findK = (k) => {
            var _a;
            const index = (_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.findIndex((d) => d.name.startsWith(k));
            if (index === -1) {
                if (k === "Участник")
                    return 2 + isDescription;
                if (k === "Замена")
                    return 3 + isDescription;
                if (k === "Возможно")
                    return 4 + isDescription;
                return 5;
            }
            else {
                return index;
            }
        };
        if (raidData.joined.length && raidData.joined.length >= 1) {
            embed.spliceFields(findK("Участник"), findK("Участник") !== -1 ? 1 : 0, {
                name: `Участник${raidData.joined.length === 1 ? "" : "и"}: ${raidData.joined.length}/6`,
                value: joined,
            });
        }
        else {
            embed.spliceFields(findK("Участник"), findK("Участник") !== -1 ? 1 : 0);
        }
        if (raidData.hotJoined.length && raidData.hotJoined.length >= 1) {
            embed.spliceFields(findK("Замена"), findK("Замена") !== -1 ? 1 : 0, { name: `Замена: ${raidData.hotJoined.length}`, value: hotJoined });
        }
        else {
            embed.spliceFields(findK("Замена"), findK("Замена") !== -1 ? 1 : 0);
        }
        if (raidData.alt.length && raidData.alt.length >= 1) {
            embed.spliceFields(findK("Возможно"), findK("Возможно") !== -1 ? 1 : 0, {
                name: `Возможно буд${raidData.alt.length === 1 ? "ет" : "ут"}: ${raidData.alt.length}`,
                value: alt,
            });
        }
        else {
            embed.spliceFields(findK("Возможно"), findK("Возможно") !== -1 ? 1 : 0);
        }
        if (interaction instanceof discord_js_1.ButtonInteraction) {
            yield interaction.editReply({ embeds: [embed] });
        }
        else {
            yield msg.edit({ embeds: [embed] });
        }
    });
}
exports.raidMsgUpdate = raidMsgUpdate;
exports.default = {
    name: "рейд",
    nameLocalizations: {
        "en-US": "raid",
        "en-GB": "raid",
    },
    description: "Создание и управление наборами на рейды",
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "создать",
            nameLocalizations: { "en-US": "create", "en-GB": "create" },
            description: "Создание набора на рейд",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "рейд",
                    nameLocalizations: { "en-US": "raid", "en-GB": "raid" },
                    description: "Укажите рейд",
                    required: true,
                    choices: [
                        {
                            name: "Гибель короля",
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            value: "lw",
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "время",
                    nameLocalizations: { "en-US": "time", "en-GB": "time" },
                    description: "Укажите время старта. Формат (без ''): 'ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ'",
                    required: true,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "описание",
                    nameLocalizations: { "en-US": "description", "en-GB": "description" },
                    maxLength: 1024,
                    description: "Укажите описание",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 3,
                    name: "сложность",
                    nameLocalizations: { "en-US": "difficulty", "en-GB": "difficulty" },
                    description: "Легенда/Мастер",
                    choices: [
                        {
                            name: "Легенда",
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            value: 2,
                        },
                        {
                            name: "Day One (только Гибель короля)",
                            value: 3,
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "требуемых_закрытий",
                    nameLocalizations: { "en-US": "req_clears", "en-GB": "req_clears" },
                    description: "Укажите минимальное количество закрытий этого рейда для записи",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "изменить",
            nameLocalizations: { "en-US": "edit", "en-GB": "edit" },
            description: "Изменение созданного набора",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id редактируемого рейда",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "новый_рейд",
                    nameLocalizations: { "en-US": "new_raid", "en-GB": "new_raid" },
                    description: "Укажите измененный рейд",
                    choices: [
                        {
                            name: "Гибель короля",
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            value: "lw",
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "новое_время",
                    nameLocalizations: { "en-US": "new_time", "en-GB": "new_time" },
                    description: "Укажите измененное время старта. Формат (без ''): 'ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ'",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.User,
                    name: "новый_создатель",
                    nameLocalizations: { "en-US": "new_creator", "en-GB": "new_creator" },
                    description: "Укажите нового создателя рейда",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "новое_описание",
                    nameLocalizations: { "en-US": "new_description", "en-GB": "new_description" },
                    description: "Укажите измененное описание",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    name: "новая_сложность",
                    nameLocalizations: { "en-US": "new_difficulty", "en-GB": "new_difficulty" },
                    description: "Легенда/Мастер",
                    choices: [
                        {
                            name: "Легенда",
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            value: 2,
                        },
                        {
                            name: "Day One (только Гибель короля)",
                            value: 3,
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "новое_количество_закрытий",
                    nameLocalizations: { "en-US": "new_req_clears", "en-GB": "new_req_clears" },
                    description: "Укажите измененное минимальное количество закрытий для записи",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "добавить",
            nameLocalizations: { "en-US": "add", "en-GB": "add" },
            description: "Добавление участника на набор",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user", "en-GB": "user" },
                    description: "Укажите добавляемого участника",
                    required: true,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Boolean,
                    name: "альтернатива",
                    nameLocalizations: { "en-US": "alt", "en-GB": "alt" },
                    description: "Укажите группу добавляемого участника",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, на который добавляем участника",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "исключить",
            nameLocalizations: { "en-US": "kick", "en-GB": "kick" },
            description: "Исключение участника из набора",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user", "en-GB": "user" },
                    description: "Укажите исключаемого участника",
                    required: true,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, из которого исключаем участника",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "удалить",
            nameLocalizations: { "en-US": "delete", "en-GB": "delete" },
            description: "Удаление созданного набора",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id удаляемого рейда",
                },
            ],
        },
    ],
    callback: (_client, interaction, member, guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        yield interaction.deferReply({ ephemeral: true });
        const { options } = interaction;
        const subCommand = options.getSubcommand(true);
        if (subCommand === "создать") {
            const raid = options.getString("рейд", true);
            const time = options.getString("время", true);
            const raidDescription = options.getString("описание");
            const difficulty = options.getInteger("сложность") || 1;
            const reqClears = options.getInteger("требуемых_закрытий") || 0;
            const data = sequelize_1.auth_data.findOne({
                where: { discord_id: member.id },
                attributes: ["tz"],
            });
            const raidData = raidDataFetcher(raid, difficulty);
            const parsedTime = yield timerConverter(time, data);
            if (parsedTime < Math.trunc(new Date().getTime() / 1000)) {
                throw {
                    name: "Ошибка. Указанное время в прошлом",
                    message: `Вы указали время <t:${parsedTime}>, <t:${parsedTime}:R>, но время начала обязательно должно быть в будущем\nВремя указывается по вашему часовому поясу. Ваш часовой пояс +${((_a = (yield data)) === null || _a === void 0 ? void 0 : _a.tz) || "3"} от UTC+00:00`,
                };
            }
            const raidDb = yield sequelize_1.raids.create({
                chnId: member.id,
                inChnMsg: member.id,
                msgId: member.id,
                creator: member.id,
                joined: `{${member.id}}`,
                time: parsedTime,
                raid: raidData.raid,
                difficulty: difficulty,
                reqClears: reqClears,
            });
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`Рейд: ${raidData.raidName}${reqClears >= 1 ? ` от ${reqClears} закрытий` : ""}`)
                .setColor(raidData.raidColor)
                .setFooter({
                text: `Создатель рейда: ${member.displayName}`,
                iconURL: "https://www.bungie.net/common/destiny2_content/icons/8b1bfd1c1ce1cab51d23c78235a6e067.png",
            })
                .setThumbnail(raidData.raidBanner)
                .addFields([
                { name: "Id", value: raidDb.id.toString(), inline: true },
                {
                    name: `Начало: <t:${parsedTime}:R>`,
                    value: `<t:${parsedTime}>`,
                    inline: true,
                },
                { name: "Участники: 1/6", value: `<@${member.id}>` },
            ]);
            if (raidDescription !== null && raidDescription.length < 1024) {
                embed.spliceFields(2, 0, {
                    name: "Описание",
                    value: raidDescription,
                });
            }
            const mainComponents = [
                new discord_js_1.ButtonBuilder().setCustomId("raidEvent_btn_join").setLabel("Записаться").setStyle(discord_js_1.ButtonStyle.Success),
                new discord_js_1.ButtonBuilder().setCustomId("raidEvent_btn_leave").setLabel("Выйти").setStyle(discord_js_1.ButtonStyle.Danger),
                new discord_js_1.ButtonBuilder().setCustomId("raidEvent_btn_alt").setLabel("Возможно буду").setStyle(discord_js_1.ButtonStyle.Secondary),
            ];
            const content = `Открыт набор в рейд: ${raidData.raidName} ${raidData.requiredRole !== null ? `<@&${raidData.requiredRole}>` : member.guild.roles.everyone}`;
            const raidChannel = (0, channels_1.chnFetcher)(ids_1.ids.raidChnId);
            const msg = raidChannel.send({
                content: content,
                embeds: [embed],
                components: [
                    {
                        type: discord_js_1.ComponentType.ActionRow,
                        components: mainComponents,
                    },
                ],
            });
            member.guild.channels
                .create({
                name: `├💪${raidDb.id}-${raidData.channelName}`,
                parent: raidChannel.parent,
                position: raidChannel.rawPosition,
                permissionOverwrites: [
                    {
                        deny: "ViewChannel",
                        id: member.guild.roles.everyone,
                    },
                    {
                        allow: ["ViewChannel", "ManageMessages"],
                        id: member.id,
                    },
                ],
                reason: `New raid by ${member.displayName}`,
            })
                .then((chn) => __awaiter(void 0, void 0, void 0, function* () {
                const premiumEmbed = new discord_js_1.EmbedBuilder().setColor("#F3AD0C").addFields([{ name: "Испытание этой недели", value: `TBD` }]);
                const components = [
                    new discord_js_1.ButtonBuilder().setCustomId("raidInChnButton_notify").setLabel("Оповестить участников").setStyle(discord_js_1.ButtonStyle.Secondary),
                    new discord_js_1.ButtonBuilder().setCustomId("raidInChnButton_transfer").setLabel("Переместить участников в рейд-войс").setStyle(discord_js_1.ButtonStyle.Secondary),
                    new discord_js_1.ButtonBuilder().setCustomId("raidInChnButton_unlock").setLabel("Закрыть набор").setStyle(discord_js_1.ButtonStyle.Danger),
                    new discord_js_1.ButtonBuilder().setCustomId("raidInChnButton_delete").setLabel("Удалить набор").setStyle(discord_js_1.ButtonStyle.Danger),
                ];
                const inChnMsg = chn.send({
                    embeds: [premiumEmbed],
                    components: [
                        {
                            type: discord_js_1.ComponentType.ActionRow,
                            components: components,
                        },
                    ],
                });
                const insertedRaidData = sequelize_1.raids.update({
                    chnId: chn.id,
                    inChnMsg: (yield inChnMsg).id,
                    msgId: (yield msg).id,
                }, { where: { chnId: member.id }, returning: true });
                interaction.editReply({
                    content: `Рейд успешно создан. <#${chn.id}>, [ссылка на набор](https://discord.com/channels/${guild.id}/${chn.id}/${(yield msg).id})`,
                });
                raidInGameChecker(raidDb);
                raidDataInChnMsg((yield insertedRaidData)[1][0]);
            }));
        }
        else if (subCommand === "изменить") {
            const raidId = options.getInteger("id_рейда");
            const newRaid = options.getString("новый_рейд");
            const newTime = options.getString("новое_время");
            const newRaidLeader = options.getUser("новый_создатель");
            const newDescription = options.getString("новое_описание");
            const newDifficulty = options.getInteger("новая_сложность");
            const newReqClears = options.getInteger("новое_количество_закрытий");
            var raidData = yield getRaid(raidId, interaction);
            if (raidData === null || (raidData instanceof Array && raidData.length === 0)) {
                throw {
                    name: "Ошибка. Рейд не найден",
                };
            }
            const raidInfo = raidDataFetcher(newRaid || raidData.raid, newDifficulty || raidData.difficulty);
            const time = raidData.time;
            const reqClears = raidData.reqClears;
            const msgId = raidData.msgId;
            const changes = [];
            const embedChanges = [];
            const embed = () => __awaiter(void 0, void 0, void 0, function* () {
                return (yield (0, channels_1.msgFetcher)(ids_1.ids.raidChnId, msgId)).embeds[0];
            });
            const t = yield sequelize_1.db.transaction();
            const changesForChannel = [];
            if (newRaid !== null || newDifficulty !== null || newReqClears !== null) {
                changes.push(`Рейд был измнен`);
                newRaid
                    ? changesForChannel.push({
                        name: `Рейд`,
                        value: `Рейд набора был изменен - \`${raidInfo.raidName}\``,
                    })
                    : "";
                newReqClears == 0
                    ? changesForChannel.push({
                        name: "Требование для вступления",
                        value: `Требование для вступления \`отключено\``,
                    })
                    : newReqClears !== null
                        ? changesForChannel.push({
                            name: "Требование для вступления",
                            value: `Теперь для вступления нужно от \`${newReqClears}\` закрытий`,
                        })
                        : "";
                newDifficulty && newDifficulty <= raidInfo.maxDifficulty
                    ? changesForChannel.push({
                        name: "Сложность рейда",
                        value: `Сложность рейда была изменена - \`${newDifficulty === 3 ? "Day One" : newDifficulty === 2 ? "Мастер" : newDifficulty === 1 ? "Легенда" : "*неизвестная сложность*"}\``,
                    })
                    : "";
                embedChanges.push({
                    color: raidInfo.raidColor,
                }, {
                    title: newReqClears !== null || reqClears >= 1 || newDifficulty !== null
                        ? `Рейд: ${raidInfo.raidName}${(newReqClears !== null && newReqClears === 0) || (newReqClears === null && reqClears === 0)
                            ? ""
                            : newReqClears !== null
                                ? ` от ${newReqClears} закрытий`
                                : ` от ${reqClears} закрытий`}`
                        : `Рейд: ${raidInfo.raidName}`,
                }, {
                    thumbnail: raidInfo.raidBanner,
                });
                if (newRaid !== null) {
                    yield sequelize_1.raids.update({
                        raid: raidInfo.raid,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                    (0, channels_1.chnFetcher)(raidData.chnId).edit({ name: `├💪${raidData.id}-${raidInfo.channelName}` });
                }
                if ((newDifficulty !== null && raidInfo.maxDifficulty >= newDifficulty) || newRaid !== null) {
                    yield sequelize_1.raids.update({
                        difficulty: newDifficulty && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : 1,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                }
                if (newReqClears !== null) {
                    yield sequelize_1.raids.update({
                        reqClears: newReqClears,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                }
            }
            if (newDescription) {
                embedChanges.push({
                    description: newDescription,
                });
                if (newDescription.length <= 1) {
                    changesForChannel.push({
                        name: "Описание",
                        value: `Описание было удалено`,
                    });
                }
                else {
                    changesForChannel.push({
                        name: "Описание",
                        value: newDescription,
                    });
                }
                changes.push(`Описание было изменено`);
            }
            if (newTime) {
                const data = sequelize_1.auth_data.findOne({
                    where: { discord_id: member.id },
                    attributes: ["tz"],
                });
                const changedTime = yield timerConverter(newTime, data);
                if (changedTime === time) {
                    return changes.push(`Время старта осталось без изменений`);
                }
                if (changedTime > Math.trunc(new Date().getTime() / 1000)) {
                    embedChanges.push({
                        time: changedTime,
                    });
                    changesForChannel.push({
                        name: "Время",
                        value: `Старт рейда перенесен на <t:${changedTime}>, <t:${changedTime}:R>`,
                    });
                    changes.push(`Время старта было изменено`);
                    yield sequelize_1.raids.update({
                        time: changedTime,
                    }, { where: { id: raidData.id }, transaction: t });
                    raidInGameChecker(raidData);
                }
                else {
                    changes.push(`Время старта осталось без изменений - указано время <t:${changedTime}>, <t:${changedTime}:R>, но оно в прошлом`);
                }
            }
            if (newRaidLeader) {
                if (!newRaidLeader.bot) {
                    guild.channels.cache.get(raidData.chnId).edit({
                        permissionOverwrites: [
                            {
                                deny: "ManageMessages",
                                id: raidData.creator,
                            },
                            {
                                allow: "ManageMessages",
                                id: newRaidLeader.id,
                            },
                        ],
                    });
                    embedChanges.push({
                        raidLeader: newRaidLeader,
                    });
                    changesForChannel.push({
                        name: "Создатель рейда",
                        value: raidData.creator === interaction.user.id
                            ? `${interaction.guild.members.cache.get(interaction.user.id).displayName} передал права создателя рейда ${interaction.guild.members.cache.get(newRaidLeader.id).displayName}`
                            : `Права создателя были переданы ${interaction.guild.members.cache.get(newRaidLeader.id).displayName}`,
                    });
                    changes.push(`Создатель рейда был изменен`);
                    yield sequelize_1.raids.update({
                        creator: newRaidLeader.id,
                    }, { where: { id: raidData.id }, transaction: t });
                }
                else {
                    changes.push(`Создатель рейда не был изменен - нельзя назначить бота создателем`);
                }
            }
            const raidEmbed = discord_js_1.EmbedBuilder.from(yield embed());
            embedChanges.forEach((change) => __awaiter(void 0, void 0, void 0, function* () {
                var _b, _c, _d;
                if (change.color) {
                    raidEmbed.setColor(change.color);
                }
                if (change.title) {
                    raidEmbed.setTitle(change.title);
                }
                if (change.thumbnail) {
                    raidEmbed.setThumbnail(change.thumbnail);
                }
                if (change.description) {
                    const field = {
                        name: `Описание`,
                        value: change.description,
                    };
                    var checker = false;
                    (_b = raidEmbed.data.fields) === null || _b === void 0 ? void 0 : _b.map((k, v) => {
                        if (k.name === "Описание") {
                            if (change.description !== " " && change.description !== "-") {
                                raidEmbed.spliceFields(v, 1, field);
                                checker = true;
                            }
                            else {
                                raidEmbed.spliceFields(v, 1);
                                checker = true;
                            }
                        }
                    });
                    if (!checker) {
                        raidEmbed.spliceFields(2, 0, field);
                    }
                }
                if (change.raidLeader) {
                    raidEmbed.setFooter({
                        text: `Создатель рейда: ${interaction.guild.members.cache.get(change.raidLeader.id).displayName}`,
                        iconURL: (_c = raidEmbed.data.footer) === null || _c === void 0 ? void 0 : _c.icon_url,
                    });
                }
                if (change.time) {
                    const field = {
                        name: `Начало: <t:${change.time}:R>`,
                        value: `<t:${change.time}>`,
                        inline: true,
                    };
                    (_d = raidEmbed.data.fields) === null || _d === void 0 ? void 0 : _d.map((k, v) => {
                        if (k.name.startsWith("Начало")) {
                            raidEmbed.spliceFields(v, 1, field);
                        }
                    });
                }
            }));
            if (embedChanges.length > 0 && changesForChannel.length > 0) {
                try {
                    t.commit();
                }
                catch (error) {
                    console.error(error);
                }
                (yield (0, channels_1.msgFetcher)(ids_1.ids.raidChnId, msgId)).edit({
                    embeds: [raidEmbed],
                });
                const replyEmbed = new discord_js_1.EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`Рейд ${raidData.id} был изменен`)
                    .setDescription(changes.join(`\n`).toString())
                    .setTimestamp();
                interaction.editReply({ embeds: [replyEmbed] });
                const editedEmbedReplyInChn = new discord_js_1.EmbedBuilder()
                    .setColor(colors_1.colors.default)
                    .setTimestamp()
                    .setFooter({
                    text: `Изменение ${raidData.creator === interaction.user.id ? "создателем рейда" : "Администратором"}`,
                });
                changesForChannel.forEach((chng) => {
                    editedEmbedReplyInChn.addFields(chng);
                });
                (0, channels_1.chnFetcher)(raidData.chnId).send({ embeds: [editedEmbedReplyInChn] });
            }
            else {
                t.rollback();
                const replyEmbed = new discord_js_1.EmbedBuilder().setColor("DarkRed").setTitle("Никакие из параметров не были введены");
                interaction.editReply({ embeds: [replyEmbed] });
            }
        }
        else if (subCommand === "удалить") {
            const raidId = options.getInteger("id_рейда");
            const raidData = yield getRaid(raidId, interaction);
            yield sequelize_1.raids
                .destroy({ where: { id: raidData.id } })
                .then(() => __awaiter(void 0, void 0, void 0, function* () {
                var _e;
                try {
                    yield ((_e = guild.channels.cache
                        .get(raidData.chnId)) === null || _e === void 0 ? void 0 : _e.delete(`${interaction.guild.members.cache.get(interaction.user.id).displayName} удалил рейд`));
                }
                catch (e) {
                    console.error(`Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error(e) : "";
                }
                try {
                    yield (yield (0, channels_1.msgFetcher)(ids_1.ids.raidChnId, raidData.msgId)).delete();
                }
                catch (e) {
                    console.error(`Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error(e) : "";
                }
                const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`Рейд ${raidData.id}-${raidData.raid} был удален`);
                interaction.editReply({ embeds: [embed] });
            }))
                .catch((e) => console.log(`/raid delete error`, e));
        }
        else if (subCommand === "добавить") {
            const addedUser = options.getUser("участник", true);
            const raidId = options.getInteger("id_рейда");
            const isAlt = options.getBoolean("альтернатива");
            const raidData = yield getRaid(raidId, interaction);
            const embedReply = new discord_js_1.EmbedBuilder().setColor("Green");
            if (isAlt === true) {
                if (!raidData.alt.includes(addedUser.id)) {
                    if (raidData.joined.includes(addedUser.id)) {
                        raidData.joined.splice(raidData.joined.indexOf(addedUser.id), 1);
                    }
                    if (raidData.hotJoined.includes(addedUser.id)) {
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(addedUser.id), 1);
                    }
                    raidData.alt.push(addedUser.id);
                    embedReply.setAuthor({
                        name: `${interaction.guild.members.cache.get(addedUser.id).displayName} был записан на рейд как возможный участник`,
                        iconURL: addedUser.displayAvatarURL(),
                    });
                    (0, channels_1.chnFetcher)(raidData.chnId).permissionOverwrites.create(addedUser.id, { ViewChannel: true });
                    yield sequelize_1.raids.update({
                        joined: `{${raidData.joined}}`,
                        hotJoined: `{${raidData.hotJoined}}`,
                        alt: `{${raidData.alt}}`,
                    }, {
                        where: { id: raidData.id },
                    });
                    yield raidMsgUpdate(raidData, interaction);
                    (0, channels_1.chnFetcher)(raidData.chnId).send({ embeds: [embedReply] });
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor("Green")
                        .setTitle(`${interaction.guild.members.cache.get(addedUser.id).displayName} был записан как возможный участник на ${raidData.id}-${raidData.raid}`);
                    interaction.editReply({ embeds: [embed] });
                    raidDataInChnMsg(raidData);
                }
                else {
                    throw {
                        name: "Ошибка",
                        message: "Пользователь уже находится в возможных участниках",
                        falseAlarm: true,
                    };
                }
            }
            else {
                if (!raidData.joined.includes(addedUser.id)) {
                    if (raidData.joined.length === 6) {
                        if (raidData.hotJoined.includes(addedUser.id)) {
                            throw {
                                name: "Ошибка",
                                message: `Набор ${raidData.id}-${raidData.raid} полон, а ${interaction.guild.members.cache.get(addedUser.id).displayName} уже добавлен в запас`,
                                falseAlarm: true,
                            };
                        }
                        raidData.hotJoined.push(addedUser.id);
                        embedReply.setAuthor({
                            name: `${interaction.guild.members.cache.get(addedUser.id).displayName} был записан на рейд как запасной участник`,
                            iconURL: addedUser.displayAvatarURL(),
                        });
                    }
                    else {
                        embedReply.setAuthor({
                            name: `${interaction.guild.members.cache.get(addedUser.id).displayName} был записан на рейд как участник`,
                            iconURL: addedUser.displayAvatarURL(),
                        });
                        raidData.joined.push(addedUser.id);
                        if (raidData.hotJoined.includes(addedUser.id)) {
                            raidData.hotJoined.splice(raidData.hotJoined.indexOf(addedUser.id), 1);
                        }
                    }
                    if (raidData.alt.includes(addedUser.id)) {
                        raidData.alt.splice(raidData.alt.indexOf(addedUser.id), 1);
                    }
                    const raidChn = (0, channels_1.chnFetcher)(raidData.chnId);
                    raidChn.send({ embeds: [embedReply] });
                    raidChn.permissionOverwrites.create(addedUser.id, {
                        ViewChannel: true,
                    });
                    yield sequelize_1.raids.update({
                        joined: `{${raidData.joined}}`,
                        hotJoined: `{${raidData.hotJoined}}`,
                        alt: `{${raidData.alt}}`,
                    }, {
                        where: { id: raidData.id },
                    });
                    yield raidMsgUpdate(raidData, interaction);
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor("Green")
                        .setTitle(`${interaction.guild.members.cache.get(addedUser.id).displayName} был записан на ${raidData.id}-${raidData.raid}`);
                    interaction.editReply({ embeds: [embed] });
                    raidDataInChnMsg(raidData);
                }
                else {
                    throw {
                        name: "Ошибка",
                        message: "Пользователь уже записан как участник",
                        falseAlarm: true,
                    };
                }
            }
        }
        else if (subCommand === "исключить") {
            const kickableUser = options.getUser("участник", true);
            const raidId = options.getInteger("id_рейда");
            const raidData = yield getRaid(raidId, interaction);
            const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle("Пользователь исключен"), inChnEmbed = new discord_js_1.EmbedBuilder()
                .setColor("Red")
                .setTitle("Пользователь был исключен с рейда")
                .setTimestamp()
                .setFooter({ text: `Исключитель: ${raidData.creator === interaction.user.id ? "Создатель рейда" : "Администратор"}` });
            if (raidData.joined.includes(kickableUser.id)) {
                raidData.joined.splice(raidData.joined.indexOf(kickableUser.id), 1);
                inChnEmbed.setDescription(`${interaction.guild.members.cache.get(kickableUser.id).displayName} исключен будучи участником рейда`);
            }
            if (raidData.alt.includes(kickableUser.id)) {
                raidData.alt.splice(raidData.alt.indexOf(kickableUser.id), 1);
                inChnEmbed.setDescription(`${interaction.guild.members.cache.get(kickableUser.id).displayName} исключен будучи возможным участником рейда`);
            }
            if (raidData.hotJoined.includes(kickableUser.id)) {
                raidData.hotJoined.splice(raidData.hotJoined.indexOf(kickableUser.id), 1);
                inChnEmbed.setDescription(`${interaction.guild.members.cache.get(kickableUser.id).displayName} исключен будучи заменой участников рейда`);
            }
            yield raidMsgUpdate(raidData, interaction);
            yield sequelize_1.raids.update({
                joined: `{${raidData.joined}}`,
                hotJoined: `{${raidData.hotJoined}}`,
                alt: `{${raidData.alt}}`,
            }, {
                where: { id: raidData.id },
            });
            const raidChn = (0, channels_1.chnFetcher)(raidData.chnId);
            raidChn.send({ embeds: [inChnEmbed] });
            raidChn.permissionOverwrites.delete(kickableUser.id);
            embed.setDescription(`${interaction.guild.members.cache.get(kickableUser.id).displayName} был исключен с рейда ${raidData.id}-${raidData.raid}`);
            interaction.editReply({ embeds: [embed] });
            raidDataInChnMsg(raidData);
        }
    }),
};
