import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { msgFetcher } from "../base/channels.js";
import { colors } from "../base/colors.js";
import { dlcsRoles, rActivity, rClanJoinDate, rRaids, rStats, rTrials, seasonalRoles } from "../base/roles.js";
import { CachedDestinyRecordDefinition } from "../handlers/manifestHandler.js";
import { role_data } from "../handlers/sequelize.js";
export default {
    name: "embedgen",
    description: "Embed generator",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "generator",
            description: "embed generator",
            options: [
                { type: ApplicationCommandOptionType.String, name: "embed", description: "Embed code", required: true },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "messageid",
                    description: "id of message",
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "preset",
            description: "Choose one of embed presets",
            options: [{ type: ApplicationCommandOptionType.String, name: "code", description: "Preset code", required: true }],
        },
    ],
    callback: async (_client, interaction, _member, _guild, channel) => {
        const isPreset = interaction.options.getSubcommand();
        if (isPreset && isPreset === "preset") {
            const preset = interaction.options.getString("code", true).toLowerCase();
            switch (preset) {
                case "roles": {
                    const roleData = await role_data.findAll({ where: { category: 4 } });
                    const manifest = CachedDestinyRecordDefinition;
                    const topRolesRaw = new EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　⁣Ненастраиваемые роли")
                        .setDescription("⁣　Роли этой категории нельзя отключить. Некоторые из них выделяют в отдельном списке участников")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: "```fix\nОсобые роли```　Особые роли всегда выделяют вас в списке участников\n\n　<:dot:1018321568218226788><@&951448755314503721> — за максимальный уровень поддержки через [Boosty](https://boosty.to/night9)\n　<:dot:1018321568218226788><@&746392332647137402> — за 3 уровень поддержки через [Boosty](https://boosty.to/night9)\n　<:dot:1018321568218226788><@&1022036001822081024> — за 2 уровень поддержки через [Boosty](https://boosty.to/night9)",
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nРейдовые роли\`\`\`　Учитываются лишь доступные на данный момент рейды\n\n${rRaids.roles
                            .map((r) => {
                            return `　<:dot:1018321568218226788><@&${r.roleId}> — за ${r.individualClears} закрытий каждого рейда или ${r.totalClears} в сумме`;
                        })
                            .join("\n")}`,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nРоли за дополнения\`\`\`\n　╭✧<@&${seasonalRoles.curSeasonRole}>\n　︰За наличие сезонного пропуска\n　╰✧<@&${seasonalRoles.nonCurSeasonRole}>\n\n　<:dot:1018321568218226788><@&${dlcsRoles.frs}> — за покупку Отвергнутых\n　<:dot:1018321568218226788><@&${dlcsRoles.sk}> — за покупку Обители Теней\n　<:dot:1018321568218226788><@&${dlcsRoles.bl}> — за покупку За гранью Света\n　<:dot:1018321568218226788><@&${dlcsRoles.anni}> — за покупку набора к 30-летию\n　<:dot:1018321568218226788><@&${dlcsRoles.twq}> — за покупку Королевы-ведьмы\n　<:dot:1018321568218226788><@&${dlcsRoles.lf}> — за покупку Конца Света`,
                    });
                    const classRolesRaw = new EmbedBuilder()
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
                    const statsRolesRaw = new EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　　⁣Общая статистика")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\n⁣　　　　Счет триумфов\`\`\`\n<:dot:1018321568218226788>За (${rStats.active
                            .map((r) => r.triumphScore)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) очков триумфа`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\n⁣　　　　　　　 У/С\`\`\`\n<:dot:1018321568218226788>За соотношение убийств/смерти (${rStats.kd
                            .map((r) => r.kd)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) в PvP`,
                        inline: true,
                    });
                    const trialsRolesRaw = new EmbedBuilder()
                        .setTitle("⁣　　　　　　　　Статистика Испытаний Осириса")
                        .setDescription("⁣　⁣Для отображения категории требуется от одного безупречного прохождения")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\n　⁣ ⁣У/С в Испытаниях Осириса\`\`\`\n<:dot:1018321568218226788>За соотношение убийств/смерти (${rTrials.kd
                            .map((r) => r.kd)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")})\n<:dot:1018321568218226788>За 10 и более нечестных матчей выдается <@&${rTrials.wintrader}>`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\n⁣　⁣Число безупречных билетов\`\`\`\n<:dot:1018321568218226788>За достижение (${rTrials.roles
                            .map((r) => r.totalFlawless)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) безупречных прохождений`,
                        inline: true,
                    });
                    const titlesRaw = new EmbedBuilder()
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
                    const triumphsRaw = new EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　　　　⁣Триумфы")
                        .setDescription("⁣　⁣Для отображения этой категории необходимо выполнить требования как минимум для 1 триумфа")
                        .setColor(16755712);
                    const activityRolesRaw = new EmbedBuilder()
                        .setTitle("⁣　　　　　　　　　　Активность на сервере")
                        .setDescription("⁣　Учитывается каждое отправленное вами сообщение в любом из каналов. Время в AFK-канале не учитывается")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\n　　Актив в голосовом чате\`\`\`\n${rActivity.voice
                            .map((r) => {
                            return `<:dot:1018321568218226788><@&${r.roleId}> за ${r.voiceMinutes / 60} минут`;
                        })
                            .join("⁣\n")}`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\n　　Актив в текстовом чате\`\`\`\n${rActivity.messages
                            .map((r) => {
                            return `<:dot:1018321568218226788><@&${r.roleId}> за ${r.messageCount} сообщений`;
                        })
                            .join("⁣\n")}`,
                        inline: true,
                    });
                    roleData.map((data) => {
                        const manifestData = manifest[Number(data.hash.shift())];
                        triumphsRaw.addFields({ name: `${manifestData.displayProperties.name}`, value: `<@&${data.role_id}>`, inline: true });
                    });
                    triumphsRaw.addFields({
                        name: "⁣",
                        value: `\`\`\`fix\nРоли за состояние в клане\`\`\`\n${rClanJoinDate.roles
                            .map((r) => {
                            return `　<:dot:1018321568218226788><@&${r.roleId}> — за ${r.days} дней в клане`;
                        })
                            .join("\n")}`,
                    });
                    let rowNumber = 0;
                    const components = (roleRow) => [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setCustomId(`roleChannel_roles_enable_${roleRow}`)
                                    .setLabel("Переключить")
                                    .setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    const classRoles = [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setCustomId(`roleChannel_classRoles_hunter`)
                                    .setEmoji("<:hunter:995496474978824202>")
                                    .setLabel("Охотник")
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`roleChannel_classRoles_warlock`)
                                    .setEmoji("<:warlock:995496471526920232>")
                                    .setLabel("Варлок")
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`roleChannel_classRoles_titan`)
                                    .setEmoji("<:titan:995496472722284596>")
                                    .setLabel("Титан")
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`roleChannel_classRoles_disable`).setLabel("Отключить").setStyle(ButtonStyle.Danger),
                            ],
                        },
                    ];
                    const timer = (ms) => new Promise((res) => setTimeout(res, ms));
                    channel.send({
                        embeds: [topRolesRaw],
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [classRolesRaw],
                        components: classRoles,
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [statsRolesRaw],
                        components: components(rowNumber++),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [trialsRolesRaw],
                        components: components(rowNumber++),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [titlesRaw],
                        components: components(rowNumber++),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [triumphsRaw],
                        components: components(rowNumber++),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [activityRolesRaw],
                        components: components(rowNumber++),
                    });
                }
                case "clanjoin": {
                    const embed = new EmbedBuilder()
                        .setColor(colors.default)
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
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId(`initEvent_register`).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                                new ButtonBuilder().setCustomId(`clanJoinEvent_modalBtn`).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    interaction.reply({ content: "Success", fetchReply: false, ephemeral: true });
                    return interaction.channel.send({ embeds: [embed], components: components });
                }
                case "godmsg1": {
                    const components = [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId(`godEvent_customColor`).setLabel("Установить свой цвет ника").setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId(`godEvent_customColor`)
                                    .setLabel("Установить свое название роли")
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId(`godEvent_getInvite`).setLabel("Приглашение на альфа-сервер").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`godEvent_achatAccess`).setLabel("Получить доступ к а-чату").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`godEvent_achatVoiceAccess`)
                                    .setLabel("Доступ к голосовому а-чату")
                                    .setStyle(ButtonStyle.Primary),
                            ],
                        },
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setCustomId(`godEvent_manifestAccess`)
                                    .setLabel("Канал с обновлениями базы данных игры")
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId(`godEvent_vchatAccess`).setLabel("Логи голосовых каналов").setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    const embed = new EmbedBuilder()
                        .setColor("Gold")
                        .setDescription(`Hex-код для установки собственного цвета роли можно найти [на этом сайте](https://htmlcolorcodes.com/)`);
                    interaction.channel.send({ embeds: [embed], components: components });
                    return;
                }
                case "godmsg2": {
                    const components = [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId(`godEvent_color_red`).setEmoji(":red_square:").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`godEvent_color_white`).setEmoji(":white_large_square:").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`godEvent_color_purple`).setEmoji(":purple_square:").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`godEvent_color_brown`).setEmoji(":brown_square:").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`godEvent_color_blue`).setEmoji(":blue_square:").setStyle(ButtonStyle.Secondary),
                            ],
                        },
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId(`godEvent_color_orange`).setEmoji(":orange_square:").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(`godEvent_color_green`).setEmoji(":green_square:").setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    const embed = new EmbedBuilder().setColor("DarkVividPink").setTitle("Выберите любой из цветов ника");
                    interaction.channel.send({ embeds: [embed], components: components });
                    return;
                }
            }
            return;
        }
        const embedCode = JSON.parse(interaction.options.getString("embed", true));
        const editedEmbedMessageId = interaction.options.getString("messageid");
        const embed = EmbedBuilder.from(embedCode);
        if (editedEmbedMessageId) {
            (await msgFetcher(channel, editedEmbedMessageId)).edit({ embeds: [embed] });
            interaction.deferred
                ? interaction.editReply("Сообщение было изменено")
                : interaction.reply({ ephemeral: true, content: "Сообщение было изменено" });
        }
        else {
            channel.send({ embeds: [embed] });
            interaction.deferred
                ? interaction.editReply("Сообщение было отправлено")
                : interaction.reply({ ephemeral: true, content: "Сообщение было изменено" });
        }
    },
};
