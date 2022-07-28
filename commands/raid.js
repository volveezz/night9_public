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
const discord_js_1 = require("discord.js");
const colors_1 = require("../base/colors");
const ids_1 = require("../base/ids");
const roles_1 = require("../base/roles");
const sequelize_1 = require("../handlers/sequelize");
function timerConverter(time, data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    return __awaiter(this, void 0, void 0, function* () {
        const args = time.split(" ");
        const error = {
            name: "Ошибка времени",
            message: 'Время должно быть указано в формате (без ""): "ДЕНЬ/МЕСЯЦ ЧАС:МИНУТА"\nПробел обязателен если указывается и дата, и время. Знак / и : также обязательны.',
        };
        if (args.length === 0 ||
            (args.length === 1 && ((_a = args[0]) === null || _a === void 0 ? void 0 : _a.split(":").length) === 0) ||
            args.length >= 3 ||
            (args.length === 2 &&
                ((_b = args[0]) === null || _b === void 0 ? void 0 : _b.split(":").length) === 0 &&
                ((_c = args[1]) === null || _c === void 0 ? void 0 : _c.split(":").length) === 0 &&
                args.length === 2 &&
                ((_d = args[0]) === null || _d === void 0 ? void 0 : _d.split("/").length) === 0 &&
                ((_e = args[1]) === null || _e === void 0 ? void 0 : _e.split("/").length) === 0)) {
            throw { error };
        }
        const date = new Date();
        if (((_f = args[0]) === null || _f === void 0 ? void 0 : _f.split(":").length) === 2 && ((_g = args[1]) === null || _g === void 0 ? void 0 : _g.split("/").length) === 2) {
            var hhmm = args[0];
            var ddmm = args[1];
        }
        else if (((_h = args[1]) === null || _h === void 0 ? void 0 : _h.split(":").length) === 2 &&
            ((_j = args[0]) === null || _j === void 0 ? void 0 : _j.split("/").length) === 2) {
            var hhmm = args[1];
            var ddmm = args[0];
        }
        else if (args.length === 1 && ((_k = args[0]) === null || _k === void 0 ? void 0 : _k.split(":").length) === 2) {
            var hhmm = args[0];
            var ddmm = `${date.getDate() + `/` + (date.getMonth() + 1)}`;
        }
        else {
            throw { error };
        }
        const daymonth = ddmm.split("/");
        const hoursmins = hhmm.split(":");
        date.setHours(date.getTimezoneOffset() === 0
            ? ((_l = (yield data)) === null || _l === void 0 ? void 0 : _l.tz)
                ? Number(hoursmins[0]) + ((yield data).tz || 3)
                : Number(hoursmins[0])
            : Number(hoursmins[0]), Number(hoursmins[1]), 0, 0);
        date.setMonth(Math.round(Number(daymonth[1]) - 1), Number(daymonth[0]));
        const returnTime = date.getTime() / 1000;
        if (isNaN(returnTime)) {
            throw {
                name: "Ошибка времени",
                message: "Проверьте правильность введенного времени",
                falseAlarm: true,
            };
        }
        return returnTime;
    });
}
function raidDataFetcher(raid, difficulty) {
    switch (raid) {
        case "kf":
            return {
                raid: raid,
                raidName: difficulty === 3
                    ? "King's Fall: Day One"
                    : difficulty === 2
                        ? "King's Fall: Master"
                        : "King's Fall",
                maxDifficulty: 3,
                raidBanner: "https://www.bungie.net/img/theme/destiny/bgs/pgcrs/kings_fall.jpg",
                raidColor: difficulty === 3
                    ? "#FF7600"
                    : difficulty === 2
                        ? "#FF063A"
                        : "#565656",
                channelName: "-kings-fall",
                requiredRole: null,
            };
        case "votd":
            return {
                raid: raid,
                raidName: difficulty === 2
                    ? "Клятва послушника: Мастер"
                    : "Клятва послушника",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_nemesis.jpg",
                raidColor: difficulty === 2
                    ? "#FF063A"
                    : "#52E787",
                channelName: "-клятва-послушника",
                requiredRole: roles_1.roles.dlcs.twq,
            };
        case "vog":
            return {
                raid: raid,
                raidName: difficulty === 2
                    ? "Хрустальный чертог: Мастер"
                    : "Хрустальный чертог",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/vault_of_glass.jpg",
                raidColor: difficulty === 2
                    ? "#FF063A"
                    : "#52E787",
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
                requiredRole: roles_1.roles.dlcs.bl,
            };
        case "gos":
            return {
                raid: raid,
                raidName: "Сад спасения",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_garden_of_salvation.jpg",
                raidColor: "#45FFA2",
                channelName: "-сад-спасения",
                requiredRole: roles_1.roles.dlcs.sk,
            };
        case "lw":
            return {
                raid: raid,
                raidName: "Последнее желание",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_beanstalk.jpg",
                raidColor: "#79A1FF",
                channelName: "-последнее-желание",
                requiredRole: roles_1.roles.dlcs.frs,
            };
    }
}
exports.default = {
    name: "рейд",
    description: "Создание и управление наборами на рейды",
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "создать",
            description: "Создание набора на рейд",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "рейд",
                    description: "Укажите рейд",
                    required: true,
                    choices: [
                        {
                            name: "King's Fall",
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
                    description: "Укажите время старта. Формат (без ''): 'ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ'",
                    required: true,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "описание",
                    maxLength: 1024,
                    description: "Укажите описание",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 3,
                    name: "сложность",
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
                            name: "Day One (только King's Fall)",
                            value: 3,
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "требуемых_закрытий",
                    description: "Укажите минимальное количество закрытий этого рейда для записи",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "изменить",
            description: "Изменение созданного набора",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    autocomplete: true,
                    description: "Укажите Id редактируемого рейда",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "новый_рейд",
                    description: "Укажите измененный рейд",
                    choices: [
                        {
                            name: "King's Fall",
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
                    description: "Укажите измененное время старта. Формат (без ''): 'ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ'",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.User,
                    name: "новый_создатель",
                    description: "Укажите нового создателя рейда",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "новое_описание",
                    description: "Укажите измененное описание",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    name: "новая_сложность",
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
                            name: "Day One (только King's Fall)",
                            value: 3,
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "новое_количество_закрытий",
                    description: "Укажите измененное минимальное количество закрытий для записи",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "добавить",
            description: "Добавление участника на набор",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.User,
                    name: "участник",
                    description: "Укажите добавляемого участника",
                    required: true,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    autocomplete: true,
                    description: "Укажите Id рейда, на который добавляем участника",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "исключить",
            description: "Исключение участника из набора",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.User,
                    name: "участник",
                    description: "Укажите исключаемого участника",
                    required: true,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    autocomplete: true,
                    description: "Укажите Id рейда, из которого исключаем участника",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "удалить",
            description: "Удаление созданного набора",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    autocomplete: true,
                    description: "Укажите Id удаляемого рейда",
                },
            ],
        },
    ],
    callback: (_client, interaction, member, guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        yield interaction.deferReply({ ephemeral: true });
        const { options } = interaction;
        const subCommand = options.getSubcommand(true);
        if (subCommand === "создать") {
            const raid = options.getString("рейд", true);
            const time = options.getString("время", true);
            const raidDescription = options.getString("описание");
            const difficulty = options.getInteger("сложность") || 1;
            const reqClears = options.getInteger("минимальных_закрытий") || 0;
            const data = sequelize_1.auth_data.findOne({
                where: { discord_id: member.id },
                attributes: ["tz"],
            });
            const raidData = raidDataFetcher(raid, difficulty);
            const parsedTime = yield timerConverter(time, data);
            const raidDb = yield sequelize_1.raids.create({
                chnId: member.id,
                inChnMsg: member.id,
                msgId: member.id,
                creator: member.id,
                joined: `{${member.id}}`,
                time: parsedTime,
                raid: raidData.raid,
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
                new discord_js_1.ButtonBuilder()
                    .setCustomId("raid_btn_join")
                    .setLabel("Записаться")
                    .setStyle(discord_js_1.ButtonStyle.Success),
                new discord_js_1.ButtonBuilder()
                    .setCustomId("raid_btn_leave")
                    .setLabel("Выйти")
                    .setStyle(discord_js_1.ButtonStyle.Danger),
                new discord_js_1.ButtonBuilder()
                    .setCustomId("raid_btn_alt")
                    .setLabel("Возможно буду")
                    .setStyle(discord_js_1.ButtonStyle.Secondary),
            ];
            const content = `Открыт набор в рейд: ${raidData.raidName} ${raidData.requiredRole !== null
                ? `<@&${raidData.requiredRole}>`
                : member.guild.roles.everyone}`;
            const raidChannel = yield member.guild.channels.fetch(ids_1.ids.raidChn);
            if ((raidChannel === null || raidChannel === void 0 ? void 0 : raidChannel.type) === discord_js_1.ChannelType.GuildText) {
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
                    name: `${raidDb.id}-${raidData.channelName}`,
                    parent: raidChannel.parent,
                    position: raidChannel.rawPosition + 1,
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
                    const premiumEmbed = new discord_js_1.EmbedBuilder()
                        .setColor("#F3AD0C")
                        .addFields([
                        { name: "Испытание этой недели", value: `TBD` },
                    ]);
                    const components = [
                        new discord_js_1.ButtonBuilder()
                            .setCustomId("raid_btn_notify")
                            .setLabel("Оповестить участников")
                            .setStyle(discord_js_1.ButtonStyle.Secondary),
                        new discord_js_1.ButtonBuilder()
                            .setCustomId("raid_btn_transfer")
                            .setLabel("Переместить участников в рейд-войс")
                            .setStyle(discord_js_1.ButtonStyle.Secondary),
                        new discord_js_1.ButtonBuilder()
                            .setCustomId("raid_btn_unlock")
                            .setLabel("Закрыть набор")
                            .setStyle(discord_js_1.ButtonStyle.Danger),
                        new discord_js_1.ButtonBuilder()
                            .setCustomId("raid_btn_delete")
                            .setLabel("Удалить набор")
                            .setStyle(discord_js_1.ButtonStyle.Danger),
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
                    sequelize_1.raids.update({
                        chnId: chn.id,
                        inChnMsg: (yield inChnMsg).id,
                        msgId: (yield msg).id,
                    }, { where: { chnId: member.id } });
                    interaction.editReply({
                        content: `Рейд успешно создан. <#${chn.id}>, [ссылка на набор](https://discord.com/channels/${guild.id}/${chn.id}/${(yield msg).id})`,
                    });
                }));
            }
        }
        else if (subCommand === "изменить") {
            const raidId = options.getInteger("id_рейда");
            const newRaid = options.getString("новый_рейд");
            const newTime = options.getString("новое_время");
            const newRaidLeader = options.getUser("новый_создатель");
            const newDescription = options.getString("новое_описание");
            const newDifficulty = options.getInteger("новая_сложность");
            const newReqClears = options.getInteger("новое_количество_закрытий");
            function getRaid(raidId) {
                if (raidId === null) {
                    return sequelize_1.raids.findAll({
                        where: { creator: interaction.user.id },
                        attributes: [
                            "id",
                            "chnId",
                            "msgId",
                            "creator",
                            "time",
                            "raid",
                            "reqClears",
                            "difficulty",
                        ],
                    });
                }
                else {
                    return sequelize_1.raids.findOne({
                        where: { id: raidId },
                        attributes: [
                            "id",
                            "chnId",
                            "msgId",
                            "creator",
                            "time",
                            "raid",
                            "reqClears",
                            "difficulty",
                        ],
                    });
                }
            }
            var raidData = yield getRaid(raidId);
            if (raidData === null ||
                (raidData instanceof Array && raidData.length === 0)) {
                throw {
                    name: "Ошибка. Рейд не найден",
                };
            }
            if (raidData instanceof sequelize_1.raids) {
                if (raidData.creator !== interaction.user.id &&
                    !member.permissions.has("Administrator")) {
                    throw {
                        name: "Ошибка доступа",
                        message: "Для изменения рейдов необходимо быть их создателем",
                        userId: interaction.user.id,
                        commandName: interaction.commandName,
                    };
                }
            }
            if (raidData instanceof Array) {
                if (raidData.length > 1) {
                    const raidIds = [];
                    raidData.forEach((raidData) => {
                        raidIds.push(`[${raidData.id}](https://discord.com/channels/${interaction.guildId}/${ids_1.ids.raidChn}/${raidData.msgId})`);
                    });
                    throw {
                        name: "Ошибка. Укажите Id рейда для изменения",
                        message: `Id рейдов доступные вам для изменения: ${raidIds
                            .join(`, `)
                            .toString()}`,
                        falseAlarm: true,
                    };
                }
                raidData = raidData[0];
            }
            const raidInfo = raidDataFetcher(newRaid || raidData.raid, newDifficulty || raidData.difficulty);
            const time = raidData.time;
            const reqClears = raidData.reqClears;
            const msgId = raidData.msgId;
            const changes = [];
            const embedChanges = [];
            const embed = () => __awaiter(void 0, void 0, void 0, function* () {
                const chn = guild.channels.cache.get(ids_1.ids.raidChn);
                if (chn === null || chn === void 0 ? void 0 : chn.isTextBased()) {
                    return (yield chn.messages.fetch(msgId)).embeds[0];
                }
                else {
                    throw {
                        name: "Critical error",
                        message: "Raid message not found.\nPlease, contact the administrator",
                        commandName: interaction.commandName,
                        options: options,
                    };
                }
            });
            const t = yield sequelize_1.db.transaction();
            const changesForChannel = [];
            if (newRaid !== null ||
                newDifficulty !== null ||
                newReqClears !== null) {
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
                        value: `Сложность рейда была изменена - \`${newDifficulty === 3
                            ? "Day One"
                            : newDifficulty === 2
                                ? "Мастер"
                                : newDifficulty === 1
                                    ? "Легенда"
                                    : "*неизвестная сложность*"}\``,
                    })
                    : "";
                embedChanges.push({
                    color: raidInfo.raidColor,
                }, {
                    title: newReqClears !== null ||
                        reqClears >= 1 ||
                        newDifficulty !== null
                        ? `Рейд: ${raidInfo.raidName}${(newReqClears !== null && newReqClears === 0) ||
                            (newReqClears === null && reqClears === 0)
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
                }
                if ((newDifficulty !== null &&
                    raidInfo.maxDifficulty >= newDifficulty) ||
                    newRaid !== null) {
                    yield sequelize_1.raids.update({
                        difficulty: newDifficulty && raidInfo.maxDifficulty >= newDifficulty
                            ? newDifficulty
                            : 1,
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
                            ? `${interaction.user.username} передал права создателя рейда ${newRaidLeader.username}`
                            : `Права создателя были переданы ${newRaidLeader.username}`,
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
                var _c, _d, _e;
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
                    (_c = raidEmbed.data.fields) === null || _c === void 0 ? void 0 : _c.map((k, v) => {
                        if (k.name === "Описание") {
                            if (change.description !== " " &&
                                change.description !== "-") {
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
                        text: `Создатель рейда: ${change.raidLeader.username}`,
                        iconURL: (_d = raidEmbed.data.footer) === null || _d === void 0 ? void 0 : _d.icon_url,
                    });
                }
                if (change.time) {
                    const field = {
                        name: `Начало: <t:${change.time}:R>`,
                        value: `<t:${change.time}>`,
                        inline: true,
                    };
                    (_e = raidEmbed.data.fields) === null || _e === void 0 ? void 0 : _e.map((k, v) => {
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
                (_a = guild.channels.cache
                    .get(ids_1.ids.raidChn)) === null || _a === void 0 ? void 0 : _a.fetch().then((chn) => __awaiter(void 0, void 0, void 0, function* () {
                    if (chn === null || chn === void 0 ? void 0 : chn.isTextBased()) {
                        (yield chn.messages.fetch(msgId)).edit({
                            embeds: [raidEmbed],
                        });
                    }
                }));
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
                    text: `Изменение ${raidData.creator === interaction.user.id
                        ? "создателем рейда"
                        : "Администратором"}`,
                });
                changesForChannel.forEach((chng) => {
                    editedEmbedReplyInChn.addFields(chng);
                });
                (_b = guild.channels.cache
                    .get(raidData.chnId)) === null || _b === void 0 ? void 0 : _b.fetch().then((chn) => __awaiter(void 0, void 0, void 0, function* () {
                    if (chn === null || chn === void 0 ? void 0 : chn.isTextBased()) {
                        chn.send({ embeds: [editedEmbedReplyInChn] });
                    }
                }));
            }
            else {
                t.rollback();
                const replyEmbed = new discord_js_1.EmbedBuilder()
                    .setColor("DarkRed")
                    .setTitle("Никакие из параметров не были введены");
                interaction.editReply({ embeds: [replyEmbed] });
            }
        }
        else if (subCommand === "удалить") {
            const raidId = options.getInteger("id_рейда");
            function getRaid(raidId) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (raidId === null) {
                        const raidData = yield sequelize_1.raids.findAll({
                            where: { creator: interaction.user.id },
                            attributes: ["id", "chnId", "msgId", "creator"],
                        });
                        if (raidData[1] === undefined) {
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
                            return raidData[0];
                        }
                    }
                    else {
                        const raidData = yield sequelize_1.raids.findOne({
                            where: { id: raidId },
                            attributes: ["id", "chnId", "msgId", "creator"],
                        });
                        if (raidData === null) {
                            throw { name: `Рейд ${raidId} не найден`, falseAlarm: true };
                        }
                        else {
                            return raidData;
                        }
                    }
                });
            }
            const raidData = yield getRaid(raidId);
            if (raidData.creator !== interaction.user.id &&
                !interaction.memberPermissions.has("Administrator")) {
                throw {
                    name: "Недостаточно прав для удаления набора",
                    message: `Удаление набора ${raidId} доступно лишь ${guild.members.cache.get(raidData.creator).displayName}`,
                    falseAlarm: true,
                };
            }
            yield sequelize_1.raids.destroy({ where: { id: raidData.id } }).then(() => __awaiter(void 0, void 0, void 0, function* () {
                var _f;
                yield ((_f = guild.channels.cache
                    .get(raidData.chnId)) === null || _f === void 0 ? void 0 : _f.delete(`${interaction.user.username} удалил рейд`));
                yield guild.channels.fetch(ids_1.ids.raidChn).then((chn) => __awaiter(void 0, void 0, void 0, function* () {
                    if (chn && chn.type === discord_js_1.ChannelType.GuildText) {
                        (yield chn.messages.fetch(raidData.msgId)).delete();
                    }
                }));
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`Рейд ${raidData.id}-${raidData.raid} был удален`);
                interaction.editReply({ embeds: [embed] });
            }));
        }
    }),
};
