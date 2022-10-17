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
const channels_1 = require("../base/channels");
const colors_1 = require("../base/colors");
const roles_1 = require("../base/roles");
const manifestHandler_1 = require("../handlers/manifestHandler");
const sequelize_1 = require("../handlers/sequelize");
exports.default = {
    name: "embedgen",
    description: "Embed generator",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "generator",
            description: "embed generator",
            options: [
                { type: discord_js_1.ApplicationCommandOptionType.String, name: "embed", description: "Embed code", required: true },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "messageid",
                    description: "id of message",
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "preset",
            description: "Choose one of embed presets",
            options: [{ type: discord_js_1.ApplicationCommandOptionType.String, name: "code", description: "Preset code", required: true }],
        },
    ],
    callback: (_client, interaction, _member, _guild, channel) => __awaiter(void 0, void 0, void 0, function* () {
        const isPreset = interaction.options.getSubcommand();
        if (isPreset && isPreset === "preset") {
            const preset = interaction.options.getString("code", true).toLowerCase();
            switch (preset) {
                case "roles": {
                    const roleData = yield sequelize_1.role_data.findAll({ where: { category: 4 } });
                    const manifest = yield manifestHandler_1.DestinyRecordDefinition;
                    const topRolesRaw = new discord_js_1.EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　⁣Ненастраиваемые роли")
                        .setDescription("⁣　Роли этой категории нельзя отключить. Некоторые из них выделяют в отдельном списке участников")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: "```fix\nОсобые роли```　Особые роли всегда выделяют вас в списке участников\n\n　<:dot:1018321568218226788><@&951448755314503721> — за максимальный уровень поддержки через [Boosty](https://boosty.to/night9)\n　<:dot:1018321568218226788><@&746392332647137402> — за 3 уровень поддержки через [Boosty](https://boosty.to/night9)\n　<:dot:1018321568218226788><@&1022036001822081024> — за 2 уровень поддержки через [Boosty](https://boosty.to/night9)",
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nРейдовые роли\`\`\`　Учитываются лишь доступные на данный момент рейды\n\n${roles_1.rRaids.roles
                            .map((r) => {
                            return `　<:dot:1018321568218226788><@&${r.roleId}> — за ${r.individualClears} закрытий каждого рейда или ${r.totalClears} в сумме`;
                        })
                            .join("\n")}`,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nРоли за дополнения\`\`\`\n　╭✧<@&${roles_1.seasonalRoles.curSeasonRole}>\n　︰За наличие сезонного пропуска\n　╰✧<@&${roles_1.seasonalRoles.nonCurSeasonRole}>\n\n　<:dot:1018321568218226788><@&${roles_1.dlcsRoles.frs}> — за покупку Отвергнутых\n　<:dot:1018321568218226788><@&${roles_1.dlcsRoles.sk}> — за покупку Обители Теней\n　<:dot:1018321568218226788><@&${roles_1.dlcsRoles.bl}> — за покупку За гранью Света\n　<:dot:1018321568218226788><@&${roles_1.dlcsRoles.anni}> — за покупку набора к 30-летию\n　<:dot:1018321568218226788><@&${roles_1.dlcsRoles.twq}> — за покупку Королевы-ведьмы\n　<:dot:1018321568218226788><@&${roles_1.dlcsRoles.lf}> — за покупку Конца Света`,
                    });
                    const classRolesRaw = new discord_js_1.EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　　　Классовые роли")
                        .setDescription("⁣　Нажмите на кнопку ниже для установки своего основного класса в игре. Вы можете поменять роль в любое время")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣　　　　　<:hunter:995496474978824202>",
                        value: "```fix\n⁣　⁣　⁣  ⁣Охотник⁣```⁣",
                        inline: true,
                    }, {
                        name: "⁣　　　　　<:warlock:995496471526920232>⁣⁣",
                        value: "```fix\n⁣　⁣　　 ⁣⁣Варлок⁣```",
                        inline: true,
                    }, {
                        name: "⁣　　　　　<:titan:995496472722284596>",
                        value: "```fix\n⁣　⁣　⁣   ⁣Титан⁣```",
                        inline: true,
                    });
                    const statsRolesRaw = new discord_js_1.EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　　⁣Общая статистика")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\n⁣　　　　Счет триумфов\`\`\`\n<:dot:1018321568218226788>За (${roles_1.rStats.active
                            .map((r) => r.triumphScore)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) очков триумфа`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\n⁣　　　　　　　 У/С\`\`\`\n<:dot:1018321568218226788>За соотношение убийств/смерти (${roles_1.rStats.kd
                            .map((r) => r.kd)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) в PvP`,
                        inline: true,
                    });
                    const trialsRolesRaw = new discord_js_1.EmbedBuilder()
                        .setTitle("⁣　　　　　　　　Статистика Испытаний Осириса")
                        .setDescription("⁣　⁣Для отображения категории требуется от одного безупречного прохождения")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\n　⁣ ⁣У/С в Испытаниях Осириса\`\`\`\n<:dot:1018321568218226788>За соотношение убийств/смерти (${roles_1.rTrials.kd
                            .map((r) => r.kd)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")})\n<:dot:1018321568218226788>За 10 и более нечестных матчей выдается <@&${roles_1.rTrials.wintrader}>`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\n⁣　⁣Число безупречных билетов\`\`\`\n<:dot:1018321568218226788>За достижение (${roles_1.rTrials.roles
                            .map((r) => r.totalFlawless)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) безупречных прохождений`,
                        inline: true,
                    });
                    const titlesRaw = new discord_js_1.EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　　　　 Титулы")
                        .setDescription("⁣　⁣Для отображения категории требуется наличие как минимум 1 актуальной печати")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: "```fix\n　　　　⁣Обычные печати```\n<:dot:1018321568218226788>За выполнение печати в игре",
                        inline: true,
                    }, {
                        name: "⁣",
                        value: "```fix\n⁣　　　　Золотые печати```\n<:dot:1018321568218226788>За улучшение печати в игре",
                        inline: true,
                    });
                    const triumphsRaw = new discord_js_1.EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　　　　⁣Триумфы")
                        .setDescription("⁣　⁣Для отображения этой категории необходимо выполнить требования как минимум для 1 триумфа")
                        .setColor(16755712);
                    const activityRolesRaw = new discord_js_1.EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　Активность на сервере")
                        .setDescription("⁣　Учитывается каждое отправленное вами сообщение в любом из каналов. Время в AFK-канале не учитывается")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\n　　Актив в голосовом чате\`\`\`\n${roles_1.rActivity.voice
                            .map((r) => {
                            return `<:dot:1018321568218226788><@&${r.roleId}> за ${r.voiceMinutes / 60} минут`;
                        })
                            .join("⁣\n")}`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\n　　Актив в текстовом чате\`\`\`\n${roles_1.rActivity.messages
                            .map((r) => {
                            return `<:dot:1018321568218226788><@&${r.roleId}> за ${r.messageCount} сообщений`;
                        })
                            .join("⁣\n")}`,
                        inline: true,
                    });
                    roleData.map((data) => {
                        const manifestData = manifest[data.hash.shift()];
                        triumphsRaw.addFields({ name: `${manifestData.displayProperties.name}`, value: `<@&${data.role_id}>`, inline: true });
                    });
                    triumphsRaw.addFields({
                        name: "⁣",
                        value: `\`\`\`fix\nРоли за состояние в клане\`\`\`\n${roles_1.rClanJoinDate.roles
                            .map((r) => {
                            return `　<:dot:1018321568218226788><@&${r.roleId}> — за ${r.days} дней в клане`;
                        })
                            .join("\n")}`,
                    });
                    let rowNumber = 0;
                    const components = (roleRow) => [
                        {
                            type: discord_js_1.ComponentType.ActionRow,
                            components: [
                                new discord_js_1.ButtonBuilder().setCustomId(`roleChannel_roles_enable_${roleRow}`).setLabel("Переключить").setStyle(discord_js_1.ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    const classRoles = [
                        {
                            type: discord_js_1.ComponentType.ActionRow,
                            components: [
                                new discord_js_1.ButtonBuilder()
                                    .setCustomId(`roleChannel_classRoles_hunter`)
                                    .setEmoji("<:hunter:995496474978824202>")
                                    .setLabel("Охотник")
                                    .setStyle(discord_js_1.ButtonStyle.Secondary),
                                new discord_js_1.ButtonBuilder()
                                    .setCustomId(`roleChannel_classRoles_warlock`)
                                    .setEmoji("<:warlock:995496471526920232>")
                                    .setLabel("Варлок")
                                    .setStyle(discord_js_1.ButtonStyle.Secondary),
                                new discord_js_1.ButtonBuilder()
                                    .setCustomId(`roleChannel_classRoles_titan`)
                                    .setEmoji("<:titan:995496472722284596>")
                                    .setLabel("Титан")
                                    .setStyle(discord_js_1.ButtonStyle.Secondary),
                                new discord_js_1.ButtonBuilder().setCustomId(`roleChannel_classRoles_disable`).setLabel("Отключить").setStyle(discord_js_1.ButtonStyle.Danger),
                            ],
                        },
                    ];
                    const timer = (ms) => new Promise((res) => setTimeout(res, ms));
                    channel.send({
                        embeds: [topRolesRaw],
                    });
                    yield timer(1500);
                    channel.send({
                        embeds: [classRolesRaw],
                        components: classRoles,
                    });
                    yield timer(1500);
                    channel.send({
                        embeds: [statsRolesRaw],
                        components: components(rowNumber++),
                    });
                    yield timer(1500);
                    channel.send({
                        embeds: [trialsRolesRaw],
                        components: components(rowNumber++),
                    });
                    yield timer(1500);
                    channel.send({
                        embeds: [titlesRaw],
                        components: components(rowNumber++),
                    });
                    yield timer(1500);
                    channel.send({
                        embeds: [triumphsRaw],
                        components: components(rowNumber++),
                    });
                    yield timer(1500);
                    channel.send({
                        embeds: [activityRolesRaw],
                        components: components(rowNumber++),
                    });
                }
                case "clanjoin": {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(colors_1.colors.default)
                        .setTitle("Вступление в клан")
                        .setDescription("Для вступления в клан достаточно выполнить пункты ниже. Если вы нам подходите, то будете автоматически приняты в ближайшее время")
                        .addFields({
                        name: "1",
                        value: "Зарегистрируйтесь у кланового бота - перейдите по ссылке по кнопке ниже или введите `/init` (для русской локализации - `/регистрация`)",
                    }, {
                        name: "2",
                        value: "Заполните форму по кнопке ниже",
                    }, {
                        name: "3",
                        value: "Вступите в клан через любой удобный вам способ:\n<:dot:1018321568218226788>Получите приглашение в клан через сообщение [после регистрации](https://discord.com/channels/@me/774617169169743872/1030544092880453762)\n<:dot:1018321568218226788>Вступите в клан через [Bungie.net](https://www.bungie.net/ru/ClanV2/Chat?groupId=4123712)\n<:dot:1018321568218226788>Вступите в клан через любого участника в игре",
                    }, {
                        name: "⁣",
                        value: "По любым вопросам вы можете обращаться в личные сообщения <@719557130188750920> или <@298353895258980362>, а также в <#694119710677008425>",
                    });
                    const components = [
                        {
                            type: discord_js_1.ComponentType.ActionRow,
                            components: [
                                new discord_js_1.ButtonBuilder().setCustomId(`initEvent_register`).setLabel("Регистрация").setStyle(discord_js_1.ButtonStyle.Success),
                                new discord_js_1.ButtonBuilder().setCustomId(`clanJoinEvent_modalBtn`).setLabel("Форма на вступление").setStyle(discord_js_1.ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    interaction.reply({ content: "Success", fetchReply: false, ephemeral: true });
                    return interaction.channel.send({ embeds: [embed], components: components });
                }
            }
            return;
        }
        const embedCode = JSON.parse(interaction.options.getString("embed", true));
        const editedEmbedMessageId = interaction.options.getString("message");
        const embed = discord_js_1.EmbedBuilder.from(embedCode);
        if (editedEmbedMessageId) {
            (yield (0, channels_1.msgFetcher)(channel, editedEmbedMessageId)).edit({ embeds: [embed] });
            interaction.deferred ? interaction.editReply("Сообщение было изменено") : interaction.reply({ ephemeral: true, content: "Сообщение было изменено" });
        }
        else {
            channel.send({ embeds: [embed] });
            interaction.deferred ? interaction.editReply("Сообщение было отправлено") : interaction.reply({ ephemeral: true, content: "Сообщение было изменено" });
        }
    }),
};
