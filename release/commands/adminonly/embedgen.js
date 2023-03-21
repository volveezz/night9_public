import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, } from "discord.js";
import colors from "../../configs/colors.js";
import { activityRoles, clanJoinDateRoles, dlcRoles, raidRoles, seasonalRoles, statisticsRoles, trialsRoles } from "../../configs/roles.js";
import { CachedDestinyRecordDefinition } from "../../functions/manifestHandler.js";
import { AutoRoleData } from "../../handlers/sequelize.js";
import { Command } from "../../structures/command.js";
import { ClanButtons, RegisterButtons } from "../../enums/Buttons.js";
import { isSnowflake, timer } from "../../functions/utilities.js";
import { dungeonsTriumphHashes, roleRequirements } from "../../configs/roleRequirements.js";
import NightRoleCategory from "../../enums/RoleCategory.js";
import { addButtonComponentsToMessage } from "../../functions/addButtonsToMessage.js";
export default new Command({
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
    run: async ({ interaction: commandInteraction }) => {
        const interaction = commandInteraction;
        const isPreset = interaction.options.getSubcommand();
        const channel = interaction.channel;
        if (isPreset && isPreset === "preset") {
            const preset = interaction.options.getString("code", true).toLowerCase();
            switch (preset) {
                case "roles": {
                    const roleData = await AutoRoleData.findAll();
                    const manifest = CachedDestinyRecordDefinition;
                    const topRolesRaw = new EmbedBuilder()
                        .setTitle("⁣⁣Ненастраиваемые роли")
                        .setDescription("⁣Роли этой категории нельзя отключить. Некоторые из них выделяют в отдельном списке участников")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: "```fix\nОсобые роли```Некоторые из особых ролей будут выделять вас в списке участников\n\n　<:dot:1018321568218226788><@&951448755314503721> — за максимальный уровень поддержки через [Boosty](https://boosty.to/night9)\n　<:dot:1018321568218226788><@&746392332647137402> — за 3 уровень поддержки через [Boosty](https://boosty.to/night9)\n　<:dot:1018321568218226788><@&1022036001822081024> — за 2 уровень поддержки через [Boosty](https://boosty.to/night9)\n　<:dot:1018321568218226788><@&1022035885237227580> — за 1 уровень поддержки через [Boosty](https://boosty.to/night9)",
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nРейдовые роли\`\`\`Учитываются лишь доступные на данный момент рейды\n\n${raidRoles.roles
                            .map((r) => {
                            return `　<:dot:1018321568218226788><@&${r.roleId}> — за ${r.individualClears} закрытий каждого или ${r.totalClears} в сумме`;
                        })
                            .join("\n")}`,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nРоли за дополнения\`\`\`\n　╭✧<@&${seasonalRoles.curSeasonRole}>\n　︰За наличие сезонного пропуска\n　╰✧<@&${seasonalRoles.nonCurSeasonRole}>\n\n　<:dot:1018321568218226788><@&${dlcRoles.frs}> — за покупку Отвергнутых\n　<:dot:1018321568218226788><@&${dlcRoles.sk}> — за покупку Обители Теней\n　<:dot:1018321568218226788><@&${dlcRoles.bl}> — за покупку За гранью Света\n　<:dot:1018321568218226788><@&${dlcRoles.anni}> — за покупку набора к 30-летию\n　<:dot:1018321568218226788><@&${dlcRoles.twq}> — за покупку Королевы-ведьмы\n　<:dot:1018321568218226788><@&${dlcRoles.lf}> — за покупку Конца Света`,
                    });
                    const classRolesRaw = new EmbedBuilder()
                        .setTitle("Классовые роли")
                        .setDescription("Нажмите на кнопку ниже для установки своего основного класса в игре. Вы можете поменять роль в любое время")
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
                        .setTitle("⁣Общая статистика")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\nСчет триумфов\`\`\`\n<:dot:1018321568218226788>За (${statisticsRoles.active
                            .map((r) => r.triumphScore)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) очков триумфа`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nУ/С\`\`\`\n<:dot:1018321568218226788>За соотношение убийств/смерти (${statisticsRoles.kd
                            .map((r) => r.kd)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) в PvP`,
                        inline: true,
                    });
                    const trialsRolesRaw = new EmbedBuilder()
                        .setTitle("Статистика Испытаний Осириса")
                        .setDescription("⁣⁣Для отображения категории требуется от одного безупречного прохождения")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\n⁣У/С в Испытаниях Осириса\`\`\`\n<:dot:1018321568218226788>За соотношение убийств/смерти (${trialsRoles.kd
                            .map((r) => r.kd)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")})\n<:dot:1018321568218226788>За 10 и более нечестных матчей выдается <@&${trialsRoles.wintrader}>`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\n⁣Число безупречных билетов\`\`\`\n<:dot:1018321568218226788>За достижение (${trialsRoles.roles
                            .map((r) => r.totalFlawless)
                            .sort((a, b) => a - b)
                            .map((r) => `**${r}**`)
                            .join(", ")}) безупречных прохождений`,
                        inline: true,
                    });
                    const titlesRaw = new EmbedBuilder()
                        .setTitle("Титулы")
                        .setDescription("⁣⁣Для отображения категории требуется наличие как минимум 1 актуальной печати")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: "```fix\n⁣Обычные печати```\n<:dot:1018321568218226788>За выполнение печати в игре",
                        inline: true,
                    }, {
                        name: "⁣",
                        value: "```fix\nЗолотые печати```\n<:dot:1018321568218226788>За улучшение печати в игре",
                        inline: true,
                    });
                    const triumphsRaw = new EmbedBuilder()
                        .setTitle("⁣Триумфы")
                        .setDescription("⁣Для отображения этой категории необходимо выполнить требования как минимум для 1 триумфа")
                        .setColor(16755712);
                    const activityRolesRaw = new EmbedBuilder()
                        .setTitle("Активность на сервере")
                        .setDescription("⁣Учитывается каждое отправленное вами сообщение в любом из каналов. Время в AFK-канале не учитывается")
                        .setColor(16755712)
                        .addFields({
                        name: "⁣",
                        value: `\`\`\`fix\nАктив в голосовом чате\`\`\`\n${activityRoles.voice
                            .map((r) => {
                            return `<:dot:1018321568218226788><@&${r.roleId}> за ${r.voiceMinutes / 60} минут`;
                        })
                            .join("⁣\n")}`,
                        inline: true,
                    }, {
                        name: "⁣",
                        value: `\`\`\`fix\nАктив в текстовом чате\`\`\`\n${activityRoles.messages
                            .map((r) => {
                            return `<:dot:1018321568218226788><@&${r.roleId}> за ${r.messageCount} сообщений`;
                        })
                            .join("⁣\n")}`,
                        inline: true,
                    });
                    triumphsRaw.addFields({
                        name: `⁣`,
                        value: `\`\`\`fix\nРоли за различные триумфы в игре\`\`\`\n　<:dot:1018321568218226788>${roleData
                            .filter((v) => !dungeonsTriumphHashes.includes(Number(v.triumphRequirement)) && v.category === NightRoleCategory.Triumphs)
                            .map((data) => {
                            const recordDescription = roleRequirements[Number(data.triumphRequirement)] ||
                                manifest[Number(data.triumphRequirement)].displayProperties.name;
                            return `<@&${data.roleId}> — ${recordDescription}`;
                        })
                            .join("\n　<:dot:1018321568218226788>")}`,
                    });
                    triumphsRaw.addFields({
                        name: `⁣`,
                        value: `\`\`\`fix\nРоли за прохождение подземелий в одиночку без смертей\`\`\`\n　<:dot:1018321568218226788>${roleData
                            .filter((v) => dungeonsTriumphHashes.includes(Number(v.triumphRequirement)))
                            .map((data) => {
                            const recordDescription = roleRequirements[Number(data.triumphRequirement)] ||
                                manifest[Number(data.triumphRequirement)].displayProperties.name;
                            return `<@&${data.roleId}> — ${recordDescription}`;
                        })
                            .join("\n　<:dot:1018321568218226788>")}`,
                    });
                    triumphsRaw.addFields({
                        name: "⁣",
                        value: `\`\`\`fix\nРоли за состояние в клане\`\`\`\n${clanJoinDateRoles.roles
                            .map((r) => {
                            return `　<:dot:1018321568218226788><@&${r.roleId}> — за ${r.days} дней в клане`;
                        })
                            .join("\n")}`,
                    });
                    const components = (roleRow) => [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setCustomId(`roleChannel_roles_enable_${roleRow}`)
                                    .setLabel("Включить")
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId(`roleChannel_roles_disable_${roleRow}`)
                                    .setLabel("Отключить")
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
                                new ButtonBuilder()
                                    .setCustomId(`roleChannel_classRoles_disable`)
                                    .setLabel("Отключить")
                                    .setStyle(ButtonStyle.Danger),
                            ],
                        },
                    ];
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
                        components: components(1),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [trialsRolesRaw],
                        components: components(2),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [titlesRaw],
                        components: components(4),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [triumphsRaw],
                        components: components(8),
                    });
                    await timer(1500);
                    channel.send({
                        embeds: [activityRolesRaw],
                        components: components(16),
                    });
                    await timer(1000);
                    const endEmbed = new EmbedBuilder()
                        .setColor(colors.default)
                        .setTitle(`Дополнительная информация`)
                        .setDescription(`⁣　⁣<:dot:1018321568218226788>Все категории включены по умолчанию\n　<:dot:1018321568218226788>Ваши роли обновляются в течение 5-120 минут (зависит от того, как давно вы заходили в игру)\n　<:dot:1018321568218226788>Все роли визуальны и не дают каких-либо особых прав\n　<:dot:1018321568218226788>Роли служат визуальным показателем вашего опыта в игре`);
                    channel.send({ embeds: [endEmbed] });
                    return;
                }
                case "clanjoin": {
                    const embed = new EmbedBuilder()
                        .setColor(colors.default)
                        .setTitle("Вступление в клан")
                        .setDescription("Приём в клан у нас полностью автоматизирован\nВыполните 3 простых условия ниже и Вы будете приняты в кратчайшие сроки\nПо любым вопросам пишите <@719557130188750920> или <@298353895258980362>")
                        .addFields([
                        {
                            name: "<:one:1086265280650551326> Зарегистрируйтесь у кланового бота",
                            value: "Нажмите кнопку `Регистрация` ниже или введите `/init`",
                        },
                        {
                            name: "<:two:1086265933380730900> Заполните форму на вступление в клан",
                            value: "Сделать это можно нажав на кнопку `Форма на вступление`",
                        },
                        {
                            name: "<:three:1086265929425502280> Вступите в клан",
                            value: "[Подайте заявку в клан](https://www.bungie.net/ru/ClanV2?groupid=4123712) или отправьте её себе сами нажав `Приглашение в клан`",
                        },
                    ]);
                    const components = [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                                new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Приглашение в клан").setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ];
                    interaction.reply({ content: "Success", ephemeral: true });
                    return interaction.channel.send({ embeds: [embed], components });
                }
                case "godmsg1": {
                    const components = [
                        new ButtonBuilder()
                            .setCustomId(`godEvent_customRoleColor`)
                            .setLabel("Установить свой цвет ника")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`godEvent_customRoleName`)
                            .setLabel("Установить свое название роли")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`godEvent_getInvite`)
                            .setLabel("Приглашение на альфа-сервер")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`godEvent_achatAccess`)
                            .setLabel("Получить доступ к а-чату")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`godEvent_achatVoiceAccess`)
                            .setLabel("Доступ к голосовому а-чату")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`godEvent_manifestAccess`)
                            .setLabel("Канал с обновлениями базы данных игры")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`godEvent_vchatAccess`)
                            .setLabel("Логи голосовых каналов")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`godEvent_sortraids`).setLabel(`Отсортировка рейдов`).setStyle(ButtonStyle.Secondary),
                    ];
                    const embed = new EmbedBuilder()
                        .setColor("Gold")
                        .setDescription(`Hex-код для установки собственного цвета роли можно найти [на этом сайте](https://htmlcolorcodes.com/)`);
                    interaction.channel.send({ embeds: [embed], components: await addButtonComponentsToMessage(components) });
                    return;
                }
                case "leavedclanmsg": {
                    const components = [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId(ClanButtons.invite)
                                    .setLabel("Отправить приглашение в клан")
                                    .setStyle(ButtonStyle.Success),
                            ],
                        },
                    ];
                    const embed = new EmbedBuilder()
                        .setColor(colors.default)
                        .setTitle("Возвращение в клан")
                        .setDescription(`Нажмите на кнопку ниже для получения приглашения в клан в игре или перейдите на [страницу клана](https://www.bungie.net/ru/ClanV2?groupid=4123712) и вступите там\n　<:dot:1018321568218226788> Приглашение можно принять на [bungie.net](https://bungie.net/) или в игре\n　<:dot:1018321568218226788> Доступно **только для зарегистрированных** пользователей`);
                    interaction.channel.send({ embeds: [embed], components });
                    interaction.reply({ content: "Success", ephemeral: true });
                    return;
                }
            }
            return;
        }
        const embedCode = JSON.parse(interaction.options.getString("embed", true));
        const editedEmbedMessageId = interaction.options.getString("messageid");
        if (editedEmbedMessageId && !isSnowflake(editedEmbedMessageId))
            throw { name: `Ошибка распознавания Snowflake. Проверьте корректность Id сообщения` };
        const embed = EmbedBuilder.from(embedCode);
        if (editedEmbedMessageId) {
            const message = channel.messages.cache.get(editedEmbedMessageId) || (await channel.messages.fetch(editedEmbedMessageId));
            if (!message)
                throw { name: `Ошибка. Сообщение (${editedEmbedMessageId}) не найдено` };
            return await message
                .edit({
                embeds: [embed],
            })
                .then((m) => {
                interaction.reply({ ephemeral: true, content: "Сообщение было изменено" });
            });
        }
        else {
            return channel.send({ embeds: [embed] }).then((m) => {
                interaction.reply({ ephemeral: true, content: "Сообщение было отправлено" });
            });
        }
    },
});
