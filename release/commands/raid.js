import { EmbedBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, } from "discord.js";
import { Command } from "../structures/command.js";
import { database, RaidEvent } from "../handlers/sequelize.js";
import { completedRaidsData, userTimezones } from "../features/memberStatisticsHandler.js";
import { ids, guildId } from "../configs/ids.js";
import { Op, Sequelize } from "sequelize";
import colors from "../configs/colors.js";
import UserErrors from "../enums/UserErrors.js";
import { RaidButtons } from "../enums/Buttons.js";
import { getRaidData, getRaidDatabaseInfo, raidAnnounceSystem, raidChallenges, timeConverter, updatePrivateRaidMessage, updateRaidMessage, } from "../functions/raidFunctions.js";
import { RaidNames } from "../enums/Raids.js";
import nameCleaner from "../functions/nameClearer.js";
import { descriptionFormatter } from "../functions/utilities.js";
import { schedule } from "node-cron";
export const raidAnnounceSet = new Set();
RaidEvent.findAll({
    where: {
        [Op.and]: [
            { time: { [Op.gt]: Math.trunc(new Date().getTime() / 1000) } },
            { time: { [Op.lt]: Math.trunc(Math.trunc(new Date().getTime() / 1000) + 24 * 60 * 60) } },
        ],
    },
}).then((RaidEvent) => RaidEvent.forEach((raidData) => raidAnnounceSystem(raidData)));
schedule("0 23 * * *", () => {
    console.debug(`Run scheduling at ${new Date()}`);
    RaidEvent.findAll({
        where: {
            [Op.and]: [
                { time: { [Op.gt]: Math.trunc(new Date().getTime() / 1000) } },
                { time: { [Op.lt]: Math.trunc(Math.trunc(new Date().getTime() / 1000) + 24 * 60 * 60) } },
            ],
        },
    }).then((RaidEvent) => RaidEvent.forEach((raidData) => raidAnnounceSystem(raidData)));
});
export default new Command({
    name: "рейд",
    nameLocalizations: {
        "en-US": "raid",
    },
    description: "Создание и управление наборами на рейды",
    descriptionLocalizations: { "en-US": "Raid creation and management" },
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "создать",
            nameLocalizations: { "en-US": "create" },
            description: "Создание набора на рейд",
            descriptionLocalizations: { "en-US": "Create raid LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "рейд",
                    nameLocalizations: { "en-US": "raid" },
                    description: "Укажите рейд",
                    descriptionLocalizations: { "en-US": "Specify the raid" },
                    required: true,
                    choices: [
                        {
                            name: "[PH] Рейд Конца Света",
                            nameLocalizations: { "en-US": "[PH] Lightfall raid" },
                            value: "nebula",
                        },
                        {
                            name: "Гибель короля",
                            nameLocalizations: { "en-US": "King's Fall" },
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            nameLocalizations: { "en-US": "Vow of the Disciple" },
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            nameLocalizations: { "en-US": "Vault of Glass" },
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            nameLocalizations: { "en-US": "Deep Stone Crypt" },
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            nameLocalizations: { "en-US": "Garden of Salvation" },
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            nameLocalizations: { "en-US": "Last Wish" },
                            value: "lw",
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "время",
                    nameLocalizations: { "en-US": "time" },
                    description: "Укажите время старта. Формат: ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ",
                    descriptionLocalizations: { "en-US": "Specify the start time in the format: HH:mm dd/MM" },
                    autocomplete: true,
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "описание",
                    nameLocalizations: { "en-US": "description" },
                    description: "Укажите описание набора. Вы можете указать здесь что угодно. Знаки для разметки: \\n \\*",
                    descriptionLocalizations: { "en-US": "Provide a description. You can specify anything here. Markdown symbols: \\n \\*" },
                    maxLength: 1000,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 2,
                    name: "сложность",
                    nameLocalizations: { "en-US": "difficulty" },
                    description: "Укажите сложность рейда. По умолч.: нормальный",
                    descriptionLocalizations: { "en-US": "Specify raid difficulty. Default: normal" },
                    choices: [
                        {
                            name: "Нормальный",
                            nameLocalizations: { "en-US": "Normal" },
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            nameLocalizations: { "en-US": "Master" },
                            value: 2,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "требуемых_закрытий",
                    nameLocalizations: { "en-US": "clears_requirement" },
                    description: "Укажите минимальное количество закрытий этого рейда для записи",
                    descriptionLocalizations: { "en-US": "Specify minimum number of completions of this raid for join" },
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "изменить",
            nameLocalizations: { "en-US": "edit" },
            description: "Изменение созданного набора",
            descriptionLocalizations: { "en-US": "Modify existing raid" },
            options: [
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id редактируемого рейда",
                    descriptionLocalizations: { "en-US": "Specify the raid id of modified raid" },
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новый_рейд",
                    nameLocalizations: { "en-US": "new_raid" },
                    description: "Если вы хотите изменить рейд набора - укажите новый",
                    descriptionLocalizations: { "en-US": "Specify new raid if you want to change it" },
                    choices: [
                        {
                            name: "[PH] Рейд Конца Света",
                            nameLocalizations: { "en-US": "[PH] Lightfall raid" },
                            value: "nebula",
                        },
                        {
                            name: "Гибель короля",
                            nameLocalizations: { "en-US": "King's Fall" },
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            nameLocalizations: { "en-US": "Vow of the Disciple" },
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            nameLocalizations: { "en-US": "Vault of Glass" },
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            nameLocalizations: { "en-US": "Deep Stone Crypt" },
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            nameLocalizations: { "en-US": "Garden of Salvation" },
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            nameLocalizations: { "en-US": "Last Wish" },
                            value: "lw",
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое_время",
                    nameLocalizations: { "en-US": "new_time" },
                    autocomplete: true,
                    description: "Укажите измененное время старта. Формат: ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ",
                    descriptionLocalizations: { "en-US": "Specify changed LFG start time in format: HH:mm dd/MM" },
                },
                {
                    type: ApplicationCommandOptionType.User,
                    name: "новый_создатель",
                    nameLocalizations: { "en-US": "new_creator" },
                    description: "Укажите нового создателя рейда",
                    descriptionLocalizations: { "en-US": "Specify new LFG creator" },
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое_описание",
                    nameLocalizations: { "en-US": "new_description" },
                    description: "Укажите измененное описание. Вы можете указать здесь что угодно. Знаки для разметки: \\n \\*",
                    descriptionLocalizations: {
                        "en-US": "Specify new LFG description. You can write anything here. Formatting symbols: \\n \\*",
                    },
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "новая_сложность",
                    minValue: 1,
                    maxValue: 2,
                    nameLocalizations: { "en-US": "new_difficulty" },
                    description: "Укажите сложность рейда. По умолч.: нормальный",
                    descriptionLocalizations: { "en-US": "Specify raid difficulty. Default: normal" },
                    choices: [
                        {
                            name: "Нормальный",
                            nameLocalizations: { "en-US": "Normal" },
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            nameLocalizations: { "en-US": "Master" },
                            value: 2,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "новое_требование_закрытий",
                    description: "Укажите новое минимальное количество закрытий этого рейда для записи",
                    descriptionLocalizations: { "en-US": "Specify raid clears requirement of this raid for joining LFG" },
                    nameLocalizations: { "en-US": "new_clears_requirement" },
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "silent",
                    description: "Silent execution",
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "добавить",
            nameLocalizations: { "en-US": "add" },
            description: "Добавление участника на набор",
            descriptionLocalizations: { "en-US": "Add user to LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user" },
                    description: "Укажите добавляемого участника",
                    descriptionLocalizations: { "en-US": "Specify the user" },
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "альтернатива",
                    nameLocalizations: { "en-US": "isalt" },
                    description: "Укажите группу добавляемого участника",
                    descriptionLocalizations: { "en-US": "Specify if user should be added as alternative" },
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, на который добавляем участника",
                    descriptionLocalizations: { "en-US": "Specify the raid id of the raid you are adding the user to" },
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "исключить",
            nameLocalizations: { "en-US": "kick" },
            description: "Исключение участника из набора",
            descriptionLocalizations: { "en-US": "Kick user from LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user" },
                    description: "Укажите исключаемого участника",
                    descriptionLocalizations: { "en-US": "Specify user to kick" },
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, из которого исключаем участника",
                    descriptionLocalizations: { "en-US": "Specify the raid id of the raid from which you are kicking the user" },
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "удалить",
            nameLocalizations: { "en-US": "delete" },
            description: "Удаление/отмена созданного набора",
            descriptionLocalizations: { "en-US": "Delete/cancel LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id удаляемого рейда",
                    descriptionLocalizations: { "en-US": "Specify the raid id of the raid you are deletting" },
                },
            ],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subCommand = args.getSubcommand(true);
        const guild = (client.getCachedGuild() ||
            interaction.guild ||
            client.guilds.cache.get(guildId) ||
            (await client.guilds.fetch(guildId)));
        const member = (interaction.member ? interaction.member : guild.members.cache.get(interaction.user.id)) ||
            (await guild.members.fetch(interaction.user.id));
        if (subCommand === "создать") {
            const raid = args.getString("рейд", true);
            const time = args.getString("время", true);
            const raidDescription = args.getString("описание");
            const difficulty = (args.getInteger("сложность") ?? 1);
            const reqClears = args.getInteger("требуемых_закрытий") ?? 0;
            const raidData = getRaidData(raid, difficulty);
            const parsedTime = timeConverter(time, userTimezones.get(interaction.user.id));
            if (parsedTime <= Math.trunc(new Date().getTime() / 1000)) {
                throw {
                    name: "Ошибка. Указанное время в прошлом",
                    description: `Вы указали время <t:${parsedTime}>, <t:${parsedTime}:R>, но время начала обязательно должно быть в будущем\n\nВремя указывается по часовому поясу, указанному с помощью \`/timezone\`\n**Пример:**\n> 20:00 15/9`,
                };
            }
            const raidDb = await RaidEvent.create({
                channelId: member.id,
                inChannelMessageId: member.id,
                messageId: member.id,
                creator: member.id,
                joined: [member.id],
                time: parsedTime,
                raid: raidData.raid,
                difficulty: difficulty,
                requiredClears: reqClears,
            });
            const raidClears = completedRaidsData.get(interaction.user.id);
            const embed = new EmbedBuilder()
                .setTitle(`Рейд: ${raidData.raidName}${reqClears >= 1 ? ` от ${reqClears} закрыт${reqClears === 1 ? "ия" : "ий"}` : ""}`)
                .setColor(raidData.raidColor)
                .setFooter({
                text: `Создатель рейда: ${nameCleaner(member.displayName)}`,
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
                {
                    name: "Участник: 1/6",
                    value: `⁣　1. **${nameCleaner(member.displayName)}**${raidClears
                        ? ` — ${raidClears[raidData.raid]} закрыт${raidClears[raidData.raid] === 1 ? "ие" : "ий"}${raidClears[raidData.raid + "Master"] ? ` (+${raidClears[raidData.raid + "Master"]} на мастере)` : ""}`
                        : ""}`,
                },
            ]);
            if (raidDescription !== null && raidDescription.length < 1024) {
                embed.spliceFields(2, 0, {
                    name: "Описание",
                    value: descriptionFormatter(raidDescription),
                });
            }
            const mainComponents = [
                new ButtonBuilder().setCustomId(RaidButtons.join).setLabel("Записаться").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(RaidButtons.leave).setLabel("Выйти").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(RaidButtons.alt).setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
            ];
            const content = `Открыт набор в рейд: ${raidData.raidName} ${raidData.requiredRole !== null ? `<@&${raidData.requiredRole}>` : member.guild.roles.everyone}`;
            const raidChannel = client.getCachedGuild().channels.cache.get(ids.raidChnId);
            const msg = raidChannel.send({
                content: content,
                embeds: [embed],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: mainComponents,
                    },
                ],
            });
            member.guild.channels
                .create({
                name: `🔥｜${raidDb.id}-${raidData.channelName}`,
                parent: ids.raidChnCategoryId,
                position: raidChannel.rawPosition + 2,
                permissionOverwrites: [
                    {
                        deny: "ViewChannel",
                        id: member.guild.roles.everyone,
                    },
                    {
                        allow: ["ViewChannel", "ManageMessages", "MentionEveryone"],
                        id: member.id,
                    },
                ],
                reason: `New raid by ${nameCleaner(member.displayName)}`,
            })
                .then(async (chn) => {
                raidAnnounceSystem(raidDb);
                const premiumEmbed = new EmbedBuilder()
                    .setColor("#F3AD0C")
                    .addFields([
                    { name: "⁣", value: `**Испытания этой недели:**\n　*на одном из этапов*\n\n**Модификаторы рейда:**\n　*если есть..*` },
                ]);
                const components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder()
                                .setCustomId(RaidButtons.notify)
                                .setLabel("Оповестить участников")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(RaidButtons.transfer)
                                .setLabel("Переместить участников в рейд-войс")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(RaidButtons.unlock).setLabel("Закрыть набор").setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId(RaidButtons.delete).setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId(RaidButtons.resend).setLabel("Обновить сообщение").setStyle(ButtonStyle.Secondary),
                        ],
                    },
                ];
                const inChnMsg = chn.send({
                    embeds: [premiumEmbed],
                    components,
                });
                const insertedRaidData = await RaidEvent.update({
                    channelId: chn.id,
                    inChannelMessageId: (await inChnMsg).id,
                    messageId: (await msg).id,
                }, { where: { channelId: member.id }, returning: true });
                (await deferredReply) &&
                    interaction.editReply({
                        content: `Рейд создан!\nКанал рейда: <#${chn.id}>, [ссылка на набор](https://discord.com/channels/${guild.id}/${raidChannel.id}/${(await msg).id})`,
                    });
                await updatePrivateRaidMessage({ raidEvent: insertedRaidData[1][0] });
                const privateChannelMessage = (await inChnMsg) || (await chn.messages.fetch((await inChnMsg).id));
                if (raidData.raid !== RaidNames.nebula)
                    await raidChallenges(raidData, privateChannelMessage, parsedTime, difficulty);
            });
        }
        else if (subCommand === "изменить") {
            const raidId = args.getInteger("id_рейда");
            const newRaid = args.getString("новый_рейд");
            const newTime = args.getString("новое_время");
            const newRaidLeader = args.getUser("новый_создатель");
            const newDescription = args.getString("новое_описание");
            const newDifficulty = args.getInteger("новая_сложность");
            const newReqClears = args.getInteger("новое_требование_закрытий");
            const isSilent = args.getBoolean("silent") || false;
            let raidData = await getRaidDatabaseInfo(raidId, interaction);
            if (raidData === null || (Array.isArray(raidData) && raidData.length === 0))
                throw { errorType: UserErrors.RAID_NOT_FOUND };
            const raidInfo = getRaidData((newRaid || raidData.raid), newDifficulty ?? raidData.difficulty);
            const { time, requiredClears: reqClears, messageId: msgId } = raidData;
            const changes = [];
            const raidEmbed = EmbedBuilder.from((await client.getCachedGuild().channels.cache.get(ids.raidChnId).messages.fetch(msgId))?.embeds[0]);
            const t = await database.transaction();
            const changesForChannel = [];
            if (newRaid !== null || newDifficulty !== null || newReqClears !== null) {
                changes.push(`Рейд был измнен`);
                raidEmbed
                    .setColor(raidInfo.raidColor)
                    .setTitle(newReqClears !== null || reqClears >= 1 || newDifficulty !== null
                    ? `Рейд: ${raidInfo.raidName}${(newReqClears !== null && newReqClears === 0) || (newReqClears === null && reqClears === 0)
                        ? ""
                        : newReqClears
                            ? ` от ${newReqClears} закрытий`
                            : ` от ${reqClears} закрытий`}`
                    : `Рейд: ${raidInfo.raidName}`)
                    .setThumbnail(raidInfo.raidBanner);
                if (newRaid !== null) {
                    changesForChannel.push({
                        name: `Рейд`,
                        value: `Рейд набора был изменен - \`${raidInfo.raidName}\``,
                    });
                    await RaidEvent.update({
                        raid: raidInfo.raid,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                    if (raidInfo.raid !== RaidNames.nebula)
                        raidChallenges(raidInfo, client.getCachedGuild().channels.cache.get(raidData.channelId).messages.cache.get(raidData.inChannelMessageId) ??
                            (await client.getCachedGuild().channels.cache.get(raidData.channelId).messages.fetch(raidData.inChannelMessageId)), raidData.time, newDifficulty && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : raidData.difficulty);
                    client
                        .getCachedGuild()
                        .channels.cache.get(raidData.channelId)
                        .edit({ name: `🔥｜${raidData.id}-${raidInfo.channelName}` });
                }
                if (newDifficulty !== null && raidInfo.maxDifficulty >= newDifficulty) {
                    changesForChannel.push({
                        name: "Сложность рейда",
                        value: `Сложность рейда была изменена - \`${newDifficulty === 2 ? "Мастер" : newDifficulty === 1 ? "Нормальный" : "*неизвестная сложность*"}\``,
                    });
                    await RaidEvent.update({
                        difficulty: newDifficulty && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : 1,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                }
                if (newReqClears !== null) {
                    if (newReqClears === 0) {
                        changesForChannel.push({
                            name: "Требование для вступления",
                            value: `Требование для вступления \`отключено\``,
                        });
                    }
                    else {
                        changesForChannel.push({
                            name: "Требование для вступления",
                            value: `Теперь для вступления нужно от \`${newReqClears}\` закрытий`,
                        });
                    }
                    await RaidEvent.update({
                        requiredClears: newReqClears,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                }
            }
            if (newDescription !== null) {
                const descriptionFieldIndex = raidEmbed.data.fields?.findIndex((field) => field.name === "Описание");
                const field = {
                    name: `Описание`,
                    value: descriptionFormatter(newDescription),
                };
                if (descriptionFieldIndex !== undefined && descriptionFieldIndex !== -1) {
                    if (newDescription !== " " && newDescription !== "-") {
                        raidEmbed.spliceFields(descriptionFieldIndex, 1, field);
                    }
                    else {
                        raidEmbed.spliceFields(descriptionFieldIndex, 1);
                    }
                }
                else {
                    raidEmbed.spliceFields(2, 0, field);
                }
                if (newDescription === " " || newDescription === "-") {
                    changesForChannel.push({
                        name: "Описание",
                        value: `Описание было удалено`,
                    });
                }
                else {
                    changesForChannel.push({
                        name: "Описание было изменено",
                        value: newDescription,
                    });
                }
                changes.push(`Описание было изменено`);
            }
            if (newTime !== null) {
                const changedTime = timeConverter(newTime, userTimezones.get(interaction.user.id));
                if (changedTime === time) {
                    changes.push(`Время старта осталось без изменений т.к. оно соответствует предыдущему`);
                }
                else if (changedTime > Math.round(new Date().getTime() / 1000)) {
                    const timeFieldIndex = raidEmbed.data.fields?.findIndex((field) => field.name.startsWith("Начало"));
                    if (timeFieldIndex && timeFieldIndex !== -1) {
                        raidEmbed.spliceFields(timeFieldIndex, 1, {
                            name: `Начало: <t:${changedTime}:R>`,
                            value: `<t:${changedTime}>`,
                            inline: true,
                        });
                    }
                    changesForChannel.push({
                        name: "Старт рейда перенесен",
                        value: `Прежнее время старта: <t:${raidData.time}>, <t:${raidData.time}:R>\nНовое время: <t:${changedTime}>, <t:${changedTime}:R>`,
                    });
                    changes.push(`Время старта было изменено`);
                    const [i, updatedRaiddata] = await RaidEvent.update({
                        time: changedTime,
                    }, { where: { id: raidData.id }, transaction: t, returning: ["id", "time"] });
                    raidAnnounceSet.delete(updatedRaiddata[0].id);
                    raidAnnounceSystem(updatedRaiddata[0]);
                }
                else {
                    changes.push(`Время старта осталось без изменений\nУказаное время <t:${changedTime}>, <t:${changedTime}:R> находится в прошлом`);
                }
            }
            if (newRaidLeader !== null) {
                if (!newRaidLeader.bot) {
                    const raidChn = client.getCachedGuild().channels.cache.get(raidData.channelId);
                    const raidLeaderName = nameCleaner(interaction.guild.members.cache.get(newRaidLeader.id).displayName);
                    raidChn.permissionOverwrites.edit(raidData.creator, { ManageMessages: null, MentionEveryone: null });
                    raidChn.permissionOverwrites.edit(newRaidLeader.id, {
                        ManageMessages: true,
                        MentionEveryone: true,
                        ViewChannel: true,
                    });
                    raidEmbed.setFooter({
                        text: `Создатель рейда: ${raidLeaderName}`,
                        iconURL: raidEmbed.data.footer?.icon_url,
                    });
                    changesForChannel.push({
                        name: "Создатель рейда",
                        value: raidData.creator === interaction.user.id
                            ? `${nameCleaner(interaction.guild.members.cache.get(interaction.user.id).displayName)} передал права создателя рейда ${raidLeaderName}`
                            : `Права создателя были переданы ${raidLeaderName}`,
                    });
                    changes.push(`Создатель рейда был изменен`);
                    await RaidEvent.update({
                        creator: newRaidLeader.id,
                    }, { where: { id: raidData.id }, transaction: t });
                }
                else {
                    changes.push(`Создатель рейда не был изменен поскольку нельзя назначить бота создателем`);
                }
            }
            if (changes.length > 0 && changesForChannel.length > 0) {
                try {
                    await t.commit();
                }
                catch (error) {
                    console.error(`[Error code: 1207]`, error);
                    await t.rollback();
                }
                newRaid
                    ? client.getCachedGuild().channels.cache.get(ids.raidChnId).messages.cache.get(msgId).edit({
                        content: "",
                        embeds: [raidEmbed],
                    })
                    : client.getCachedGuild().channels.cache.get(ids.raidChnId).messages.cache.get(msgId).edit({
                        embeds: [raidEmbed],
                    });
                const replyEmbed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle(`Рейд ${raidData.id} был изменен`)
                    .setDescription(changes.join(`\n`) || "nothing");
                (await deferredReply) && interaction.editReply({ embeds: [replyEmbed] });
                const editedEmbedReplyInChn = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTimestamp()
                    .setFooter({
                    text: `Изменение ${raidData.creator === interaction.user.id ? "создателем рейда" : "администратором"}`,
                });
                editedEmbedReplyInChn.addFields(changesForChannel);
                !isSilent &&
                    client.getCachedGuild().channels.cache.get(raidData.channelId).send({ embeds: [editedEmbedReplyInChn] });
            }
            else {
                await t.rollback();
                throw {
                    name: "Изменения не были внесены",
                    description: `${changes.map((v) => v).join(", ") || "Для измнения параметров рейда необходимо их указать"}`,
                };
            }
        }
        else if (subCommand === "удалить") {
            const raidId = args.getInteger("id_рейда");
            const raidData = await getRaidDatabaseInfo(raidId, interaction);
            await RaidEvent.destroy({ where: { id: raidData.id } })
                .then(async () => {
                try {
                    await guild.channels.cache
                        .get(raidData.channelId)
                        ?.delete(`${interaction.member.displayName} deleted raid ${raidData.id}-${raidData.raid}`);
                }
                catch (e) {
                    console.error(`[Error code: 1069] Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error(e) : "";
                }
                try {
                    client.getCachedGuild().channels.cache.get(ids.raidChnId).messages.cache
                        .get(raidData.messageId)
                        .delete();
                }
                catch (e) {
                    console.error(`[Error code: 1070] Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error(`[Error code: 1240]`, e) : "";
                }
                const embed = new EmbedBuilder().setColor(colors.success).setTitle(`Рейд ${raidData.id}-${raidData.raid} был удален`);
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
            })
                .catch((e) => console.error(`[Error code: 1206]`, e));
        }
        else if (subCommand === "добавить") {
            const raidId = args.getInteger("id_рейда");
            const raidDataQuery = getRaidDatabaseInfo(raidId, interaction);
            const addedUser = args.getUser("участник", true);
            if (addedUser.bot)
                throw { name: "Нельзя записать бота как участника" };
            const embedReply = new EmbedBuilder().setColor(colors.success);
            const embed = new EmbedBuilder().setColor(colors.success);
            const raidData = await raidDataQuery;
            const userAlreadyInHotJoined = raidData.hotJoined.includes(addedUser.id);
            const userAlreadyJoined = raidData.joined.includes(addedUser.id);
            const userAlreadyAlt = raidData.alt.includes(addedUser.id);
            const userTarget = args.getBoolean("альтернатива") === true
                ? "alt"
                : raidData.joined.length >= 6 && !userAlreadyInHotJoined
                    ? "hotJoined"
                    : "joined";
            let update = {
                joined: Sequelize.fn("array_remove", Sequelize.col("joined"), addedUser.id),
                hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), addedUser.id),
                alt: Sequelize.fn("array_remove", Sequelize.col("alt"), addedUser.id),
            };
            if (userTarget === "joined") {
                if (userAlreadyJoined)
                    throw {
                        name: "Ошибка",
                        description: "Пользователь уже записан как участник",
                    };
                if (raidData.joined.length >= 6 && userAlreadyInHotJoined)
                    throw {
                        name: "Ошибка",
                        description: `Набор ${raidData.id}-${raidData.raid} полон, а ${nameCleaner(interaction.guild.members.cache.get(addedUser.id).displayName)} уже добавлен в запас`,
                    };
            }
            else if (userAlreadyAlt) {
                throw { name: "Пользователь уже записан как возможный участник" };
            }
            update[userTarget] = Sequelize.fn("array_append", Sequelize.col(userTarget), addedUser.id);
            embedReply.setAuthor({
                name: `${nameCleaner(interaction.guild.members.cache.get(addedUser.id).displayName)} был записан${userTarget === "alt" ? " как возможный участник" : userTarget === "hotJoined" ? " как запасной участник" : ""}${userAlreadyJoined
                    ? " ранее состоя как участник"
                    : userAlreadyAlt
                        ? " ранее состоя как возможный участник"
                        : userAlreadyInHotJoined
                            ? " ранее состоя в запасе"
                            : ""}`,
                iconURL: addedUser.displayAvatarURL(),
            });
            embed.setTitle(`${nameCleaner(interaction.guild.members.cache.get(addedUser.id).displayName)} был записан${userTarget === "alt" ? " как возможный участник" : userTarget === "hotJoined" ? " как запасной участник" : ""} на ${raidData.id}-${raidData.raid}`);
            const [, [raidEvent]] = await RaidEvent.update(update, {
                where: { id: raidData.id },
                returning: ["id", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "messageId", "raid", "difficulty"],
            });
            const raidChn = client.getCachedGuild().channels.cache.get(raidData.channelId);
            raidChn.send({ embeds: [embedReply] });
            raidChn.permissionOverwrites.create(addedUser.id, {
                ViewChannel: true,
            });
            updateRaidMessage(raidEvent, interaction);
            updatePrivateRaidMessage({ raidEvent });
            (await deferredReply) && interaction.editReply({ embeds: [embed] });
        }
        else if (subCommand === "исключить") {
            const preFetch = getRaidDatabaseInfo(args.getInteger("id_рейда"), interaction);
            const kickableUser = args.getUser("участник", true);
            const raidData = await preFetch;
            await RaidEvent.update({
                joined: Sequelize.fn("array_remove", Sequelize.col("joined"), `${kickableUser.id}`),
                hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${kickableUser.id}`),
                alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${kickableUser.id}`),
            }, {
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { joined: { [Op.contains]: [kickableUser.id] } },
                                { hotJoined: { [Op.contains]: [kickableUser.id] } },
                                { alt: { [Op.contains]: [kickableUser.id] } },
                            ],
                            id: raidData.id,
                        },
                    ],
                },
                returning: ["id", "messageId", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "raid", "difficulty"],
            }).then(async ([rowsUpdated, [raidEvent]]) => {
                if (!rowsUpdated)
                    throw { name: `Исключаемый участник не состоит в рейде` };
                if (!raidEvent)
                    throw { errorType: UserErrors.RAID_NOT_FOUND };
                updatePrivateRaidMessage({ raidEvent });
                updateRaidMessage(raidEvent, interaction);
                const embed = new EmbedBuilder().setColor(colors.success).setTitle("Пользователь исключен"), inChnEmbed = new EmbedBuilder()
                    .setColor(colors.warning)
                    .setTitle("Пользователь был исключен с рейда")
                    .setTimestamp()
                    .setFooter({ text: `Исключитель: ${raidData.creator === interaction.user.id ? "Создатель рейда" : "Администратор"}` });
                if (raidData.joined.includes(kickableUser.id)) {
                    raidData.joined.splice(raidData.joined.indexOf(kickableUser.id), 1);
                    inChnEmbed.setDescription(`${nameCleaner(interaction.guild.members.cache.get(kickableUser.id).displayName)} исключен будучи участником рейда`);
                }
                if (raidData.alt.includes(kickableUser.id)) {
                    raidData.alt.splice(raidData.alt.indexOf(kickableUser.id), 1);
                    inChnEmbed.setDescription(`${nameCleaner(interaction.guild.members.cache.get(kickableUser.id).displayName)} исключен будучи возможным участником рейда`);
                }
                if (raidData.hotJoined.includes(kickableUser.id)) {
                    raidData.hotJoined.splice(raidData.hotJoined.indexOf(kickableUser.id), 1);
                    inChnEmbed.setDescription(`${nameCleaner(interaction.guild.members.cache.get(kickableUser.id).displayName)} исключен будучи заменой участников рейда`);
                }
                client.getCachedGuild().channels.cache.get(raidEvent.channelId).permissionOverwrites.delete(interaction.user.id);
                const raidChn = client.getCachedGuild().channels.cache.get(raidData.channelId);
                raidChn.send({ embeds: [inChnEmbed] });
                raidChn.permissionOverwrites.delete(kickableUser.id);
                embed.setDescription(`${nameCleaner(interaction.guild.members.cache.get(kickableUser.id).displayName)} был исключен с рейда ${raidData.id}-${raidData.raid}`);
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
            });
        }
    },
});
