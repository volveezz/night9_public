import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Op, Sequelize } from "sequelize";
import { raidDifficultiesChoices, raidSelectionOptions } from "../../configs/Raids.js";
import colors from "../../configs/colors.js";
import icons, { activityIcons } from "../../configs/icons.js";
import raidsGuide from "../../configs/raidGuideData.js";
import { Command } from "../../structures/command.js";
import checkIfUserRecentlyCreatedActivity from "../../utils/discord/checkRecentlyCreatedActivity.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import { generateRaidCompletionText, getRaidDatabaseInfo, getRaidDetails, raidChallenges, updateRaidMessage, } from "../../utils/general/raidFunctions.js";
import convertTimeStringToNumber from "../../utils/general/raidFunctions/convertTimeStringToNumber.js";
import getDefaultRaidComponents from "../../utils/general/raidFunctions/getDefaultRaidComponents.js";
import sendRaidPrivateMessage from "../../utils/general/raidFunctions/privateMessage/sendPrivateMessage.js";
import updatePrivateRaidMessage from "../../utils/general/raidFunctions/privateMessage/updatePrivateMessage.js";
import { raidEmitter } from "../../utils/general/raidFunctions/raidEmitter.js";
import raidFireteamCheckerSystem, { stopFireteamCheckingSystem, } from "../../utils/general/raidFunctions/raidFireteamChecker/raidFireteamChecker.js";
import { clearNotifications, sendNotificationInfo, updateNotifications, updateNotificationsForEntireRaid, } from "../../utils/general/raidFunctions/raidNotifications.js";
import { descriptionFormatter, escapeString } from "../../utils/general/utilities.js";
import { completedRaidsData, userTimezones } from "../../utils/persistence/dataStore.js";
import { sequelizeInstance } from "../../utils/persistence/sequelize.js";
import { RaidEvent } from "../../utils/persistence/sequelizeModels/raidEvent.js";
const SlashCommand = new Command({
    name: "рейд",
    nameLocalizations: {
        "en-US": "raid",
        "en-GB": "raid",
    },
    description: "Создание и управление наборами на рейды",
    descriptionLocalizations: { "en-US": "Raid creation and management", "en-GB": "Raid creation and management" },
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "создать",
            nameLocalizations: { "en-US": "create", "en-GB": "create" },
            description: "Создание набора на рейд",
            descriptionLocalizations: { "en-US": "Create raid LFG", "en-GB": "Create raid LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "рейд",
                    nameLocalizations: { "en-US": "raid", "en-GB": "raid" },
                    description: "Укажите рейд",
                    descriptionLocalizations: { "en-US": "Specify the raid", "en-GB": "Specify the raid" },
                    required: true,
                    choices: raidSelectionOptions,
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "время",
                    nameLocalizations: { "en-US": "time", "en-GB": "time" },
                    description: "Укажите время старта. Формат: ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ",
                    descriptionLocalizations: {
                        "en-US": "Enter the start time in the format HH:mm dd/MM",
                        "en-GB": "Enter the start time in the format HH:mm dd/MM",
                    },
                    autocomplete: true,
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "описание",
                    nameLocalizations: { "en-US": "description", "en-GB": "description" },
                    description: "Укажите описание набора. Вы можете указать здесь что угодно. Знаки для разметки: \\n \\* \\!",
                    descriptionLocalizations: {
                        "en-US": "Enter a description. You can enter anything here. Markdown symbols: \\n \\* \\!",
                        "en-GB": "Enter a description. You can enter anything here. Markdown symbols: \\n \\* \\!",
                    },
                    maxLength: 1000,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 3,
                    name: "сложность",
                    nameLocalizations: { "en-US": "difficulty", "en-GB": "difficulty" },
                    description: "Укажите сложность рейда. По умолч.: нормальный",
                    descriptionLocalizations: {
                        "en-US": "Specify the difficulty of the raid. Default: Normal",
                        "en-GB": "Specify the difficulty of the raid. Default: Normal",
                    },
                    choices: raidDifficultiesChoices,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "требуемых-закрытий",
                    nameLocalizations: { "en-US": "clears-requirement", "en-GB": "clears-requirement" },
                    description: "Укажите минимальное количество закрытий этого рейда для записи",
                    descriptionLocalizations: {
                        "en-US": "Specify raid clears requirement for this raid to join LFG",
                        "en-GB": "Specify raid clears requirement for this raid to join LFG",
                    },
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "изменить",
            nameLocalizations: { "en-US": "edit", "en-GB": "edit" },
            description: "Изменение созданного набора",
            descriptionLocalizations: { "en-US": "Modify existing raid", "en-GB": "Modify existing raid" },
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новый-рейд",
                    nameLocalizations: { "en-US": "new-raid", "en-GB": "new-raid" },
                    description: "Если вы хотите изменить рейд набора - укажите новый",
                    descriptionLocalizations: {
                        "en-US": "Specify new raid if you want to change it",
                        "en-GB": "Specify new raid if you want to change it",
                    },
                    choices: raidSelectionOptions,
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое-время",
                    nameLocalizations: { "en-US": "new-time", "en-GB": "new-time" },
                    autocomplete: true,
                    description: "Укажите измененное время старта. Формат: ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ",
                    descriptionLocalizations: {
                        "en-US": "Enter the modified LFG start time in the format HH:mm dd/MM",
                        "en-GB": "Enter the modified LFG start time in the format HH:mm dd/MM",
                    },
                },
                {
                    type: ApplicationCommandOptionType.User,
                    name: "новый-создатель",
                    nameLocalizations: { "en-US": "new-creator", "en-GB": "new-creator" },
                    description: "Укажите нового создателя рейда",
                    descriptionLocalizations: { "en-US": "Specify new LFG creator", "en-GB": "Specify new LFG creator" },
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое-описание",
                    nameLocalizations: { "en-US": "new-description", "en-GB": "new-description" },
                    description: "Укажите измененное описание. Вы можете указать здесь что угодно. Знаки для разметки: \\n \\* \\!",
                    descriptionLocalizations: {
                        "en-US": "Enter a new description. You can enter anything here. Markdown symbols: \\n \\* \\!",
                        "en-GB": "Enter a new description. You can enter anything here. Markdown symbols: \\n \\* \\!",
                    },
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "новая-сложность",
                    minValue: 1,
                    maxValue: 3,
                    nameLocalizations: { "en-US": "new-difficulty", "en-GB": "new-difficulty" },
                    description: "Укажите сложность рейда. По умолч.: нормальный",
                    descriptionLocalizations: {
                        "en-US": "Specify the new difficulty of the raid. Default: Normal",
                        "en-GB": "Specify the new difficulty of the raid. Default: Normal",
                    },
                    choices: raidDifficultiesChoices,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "новое-требование-закрытий",
                    description: "Укажите новое минимальное количество закрытий этого рейда для записи",
                    descriptionLocalizations: {
                        "en-US": "Specify new raid clears requirement for this raid to join LFG",
                        "en-GB": "Specify new raid clears requirement for this raid to join LFG",
                    },
                    nameLocalizations: { "en-US": "new-clears-requirement", "en-GB": "new-clears-requirement" },
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 100,
                    name: "id-рейда",
                    nameLocalizations: { "en-US": "raid-id", "en-GB": "raid-id" },
                    autocomplete: true,
                    description: "Укажите Id редактируемого рейда",
                    descriptionLocalizations: {
                        "en-US": "Specify the raid id of the modified raid",
                        "en-GB": "Specify the raid id of the modified raid",
                    },
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
            nameLocalizations: { "en-US": "add", "en-GB": "add" },
            description: "Добавление участника на набор",
            descriptionLocalizations: { "en-US": "Add user to LFG", "en-GB": "Add user to LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user", "en-GB": "user" },
                    description: "Укажите добавляемого участника",
                    descriptionLocalizations: { "en-US": "Specify the user", "en-GB": "Specify the user" },
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "альтернатива",
                    nameLocalizations: { "en-US": "isalt", "en-GB": "isalt" },
                    description: "Укажите группу добавляемого участника",
                    descriptionLocalizations: {
                        "en-US": "Specify whether to add the user as an alternative",
                        "en-GB": "Specify whether to add the user as an alternative",
                    },
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 100,
                    name: "id-рейда",
                    nameLocalizations: { "en-US": "raid-id", "en-GB": "raid-id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, на который добавляем участника",
                    descriptionLocalizations: {
                        "en-US": "Specify the raid id of the raid you are adding the user to",
                        "en-GB": "Specify the raid id of the raid you are adding the user to",
                    },
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "исключить",
            nameLocalizations: { "en-US": "kick", "en-GB": "kick" },
            description: "Исключение участника из набора",
            descriptionLocalizations: { "en-US": "Kick user from LFG", "en-GB": "Kick user from LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user", "en-GB": "user" },
                    description: "Укажите исключаемого участника",
                    descriptionLocalizations: { "en-US": "Specify user to kick", "en-GB": "Specify user to kick" },
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 100,
                    name: "id-рейда",
                    nameLocalizations: { "en-US": "raid-id", "en-GB": "raid-id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, из которого исключаем участника",
                    descriptionLocalizations: {
                        "en-US": "Specify the raid id of the raid you are kicking the user from",
                        "en-GB": "Specify the raid id of the raid you are kicking the user from",
                    },
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "удалить",
            nameLocalizations: { "en-US": "delete", "en-GB": "delete" },
            description: "Удаление/отмена созданного набора",
            descriptionLocalizations: { "en-US": "Delete/Cancel LFG", "en-GB": "Delete/Cancel LFG" },
            options: [
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 100,
                    name: "id-рейда",
                    nameLocalizations: { "en-US": "raid-id", "en-GB": "raid-id" },
                    autocomplete: true,
                    description: "Укажите Id удаляемого рейда",
                    descriptionLocalizations: {
                        "en-US": "Specify the raid ID of the raid you want to delete",
                        "en-GB": "Specify the raid ID of the raid you want to delete",
                    },
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "оповещения",
            nameLocalizations: { "en-US": "notifications", "en-GB": "notifications" },
            description: "Управление настройками уведомлений",
            descriptionLocalizations: { "en-US": "Manage notification settings", "en-GB": "Manage notification settings" },
        },
    ],
    run: async ({ client, interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subCommand = args.getSubcommand(true);
        const guild = client.getCachedGuild();
        const member = await client.getMember(interaction.user.id);
        if (subCommand === "создать") {
            const raid = args.getString("рейд", true);
            const time = args.getString("время", true);
            const raidDescription = args.getString("описание");
            const difficulty = args.getInteger("сложность") ?? 1;
            const parsedTime = convertTimeStringToNumber(time, userTimezones.get(interaction.user.id));
            if (parsedTime <= Math.floor(Date.now() / 1000)) {
                await deferredReply;
                throw {
                    name: "Ошибка. Указанное время в прошлом",
                    description: `Вы указали время <t:${parsedTime}>, <t:${parsedTime}:R>, но время начала обязательно должно быть в будущем\n\nВремя указывается по часовому поясу, указанному с помощью \'/timezone\'\n**Пример:**\n> 20:00 15/9`,
                };
            }
            else if (parsedTime >= 2147483647) {
                await deferredReply;
                throw {
                    name: "Ошибка. Проверьте корректность времени",
                    description: `Вы указали время <t:${parsedTime}>, <t:${parsedTime}:R>...`,
                };
            }
            else if (isNaN(parsedTime) || parsedTime < 1000) {
                throw { errorType: "RAID_TIME_ERROR" };
            }
            const raidData = getRaidDetails(raid, difficulty);
            const requiredClears = args.getInteger("требуемых-закрытий") ?? 0;
            let transaction;
            try {
                transaction = await sequelizeInstance.transaction();
                const raidClears = completedRaidsData.get(interaction.user.id);
                const mainComponents = [
                    new ButtonBuilder().setCustomId("raidButton_action_join").setLabel("Записаться").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("raidButton_action_leave").setLabel("Выйти").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("raidButton_action_alt").setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
                ];
                const isUserCreatedRaidRecently = checkIfUserRecentlyCreatedActivity(interaction.user.id);
                const roleMention = !isUserCreatedRaidRecently
                    ? raidData.requiredRole !== null
                        ? `<@&${raidData.requiredRole}>`
                        : member.guild.roles.everyone
                    : "";
                const content = `Открыт набор в рейд: ${raidData.raidName} ${roleMention}`;
                const raidChannelPromise = client.getTextChannel(process.env.RAID_CHANNEL_ID);
                const additionalPosition = guild.channels.cache.get(process.env.RAID_CATEGORY)?.children?.cache.size || 1;
                const raidEventPromise = RaidEvent.create({
                    channelId: member.id,
                    inChannelMessageId: member.id,
                    messageId: member.id,
                    creator: member.id,
                    joined: [member.id],
                    time: parsedTime,
                    raid: raidData.raid,
                    difficulty,
                    requiredClears,
                }, { transaction });
                const [raidEvent, raidChannel] = await Promise.all([raidEventPromise, raidChannelPromise]);
                const privateRaidChannel = await member.guild.channels.create({
                    name: `🔥｜${raidEvent.id}-${raidData.channelName}`,
                    parent: process.env.RAID_CATEGORY,
                    position: raidChannel.rawPosition + additionalPosition,
                    permissionOverwrites: [
                        {
                            deny: "ViewChannel",
                            id: guild.roles.everyone,
                        },
                        {
                            allow: ["ViewChannel", "ManageMessages", "MentionEveryone"],
                            id: member.id,
                        },
                    ],
                    reason: `${nameCleaner(member.displayName)} created new raid`,
                });
                raidEvent.channelId = privateRaidChannel.id;
                const inChannelMessagePromise = sendRaidPrivateMessage({ channel: privateRaidChannel, raidEvent, transaction });
                const raidClearsText = raidClears
                    ? ` — ${generateRaidCompletionText(raidClears[raidData.raid])}${raidClears[raidData.raid + "Master"] ? ` (+**${raidClears[raidData.raid + "Master"]}** на мастере)` : ""}`
                    : "";
                const embed = new EmbedBuilder()
                    .setTitle(`Рейд: ${raidData.raidName}${requiredClears >= 1 ? ` от ${requiredClears} закрыт${requiredClears === 1 ? "ия" : "ий"}` : ""}`)
                    .setColor(raidData.raidColor)
                    .setFooter({
                    text: `Создатель рейда: ${nameCleaner(member.displayName)}`,
                    iconURL: activityIcons.raid,
                })
                    .setThumbnail(raidData.raidBanner)
                    .addFields([
                    {
                        name: "Id",
                        value: `[${raidEvent.id}](https://discord.com/channels/${interaction.guildId}/${privateRaidChannel.id})`,
                        inline: true,
                    },
                    {
                        name: `Начало: <t:${parsedTime}:R>`,
                        value: `<t:${parsedTime}>`,
                        inline: true,
                    },
                    {
                        name: "Участник: 1/6",
                        value: `⁣　1. **${nameCleaner(member.displayName, true)}**${raidClearsText}`,
                    },
                ]);
                if (raidDescription !== null && raidDescription.length < 1024) {
                    embed.spliceFields(2, 0, {
                        name: "Описание",
                        value: descriptionFormatter(raidDescription),
                    });
                }
                const messagePromise = raidChannel.send({
                    content,
                    embeds: [embed],
                    components: addButtonsToMessage(mainComponents),
                });
                const [message, inChannelMessage] = await Promise.all([messagePromise, inChannelMessagePromise]);
                raidEvent.messageId = message.id;
                raidEvent.inChannelMessageId = inChannelMessage.id;
                await raidEvent.save({ transaction });
                await transaction.commit();
                deferredReply.then(async (_) => {
                    const embed = new EmbedBuilder()
                        .setColor(colors.success)
                        .setAuthor({ name: "Рейд создан", iconURL: icons.success })
                        .setDescription(`Канал рейда: <#${privateRaidChannel.id}>, [ссылка на сообщение набора](https://discord.com/channels/${guild.id}/${process.env.RAID_CHANNEL_ID}/${message.id})`);
                    interaction.editReply({ embeds: [embed] });
                });
                if (parsedTime <= Math.floor(Date.now() / 1000 + 24 * 60 * 60 * 2)) {
                    updateNotifications(interaction.user.id);
                }
                raidFireteamCheckerSystem(raidEvent.id);
            }
            catch (error) {
                await transaction?.rollback();
                console.error(`[Error code: 2045]`, error);
            }
        }
        else if (subCommand === "изменить") {
            const raidId = args.getInteger("id-рейда");
            const newRaid = args.getString("новый-рейд");
            const newTime = args.getString("новое-время");
            const newRaidLeader = args.getUser("новый-создатель");
            const newDescription = args.getString("новое-описание");
            let newDifficulty = args.getInteger("новая-сложность");
            const newReqClears = args.getInteger("новое-требование-закрытий");
            const notSilently = !(args.getBoolean("silent") || false);
            let raidData = await getRaidDatabaseInfo(raidId, interaction);
            if (!raidData || (Array.isArray(raidData) && raidData.length === 0)) {
                await deferredReply;
                throw { errorType: "RAID_NOT_FOUND" };
            }
            const raidInfo = getRaidDetails((newRaid || raidData.raid), newDifficulty ?? raidData.difficulty);
            if ((newDifficulty || raidData.difficulty) > raidInfo.maxDifficulty) {
                newDifficulty = 1;
            }
            const changes = [];
            const raidMessage = await client.getAsyncMessage(process.env.RAID_CHANNEL_ID, raidData.messageId);
            const raidEmbed = EmbedBuilder.from(raidMessage?.embeds[0]);
            const transaction = await sequelizeInstance.transaction();
            const changesForChannel = [];
            const raidPrivateChannel = await client.getTextChannel(raidData.channelId);
            let inChannelMessage;
            try {
                inChannelMessage =
                    (await client.getAsyncMessage(raidPrivateChannel, raidData.inChannelMessageId)) ||
                        (await sendRaidPrivateMessage({ raidEvent: raidData, channel: raidPrivateChannel }));
            }
            catch (error) {
                inChannelMessage = await sendRaidPrivateMessage({ raidEvent: raidData, channel: raidPrivateChannel });
            }
            if (!raidMessage) {
                console.error("[Error code: 1750]", raidData);
                throw { name: "Ошибка", description: "Не удалось найти сообщение рейда" };
            }
            if (!inChannelMessage) {
                console.error("[Error code: 1749]", raidData);
                throw { name: "Ошибка", description: "Не удалось найти сообщение в канале рейда" };
            }
            const components = [];
            if ((newRaid && newRaid in raidsGuide) || raidData.raid in raidsGuide) {
                components.push(new ButtonBuilder()
                    .setCustomId(`raidGuide_${newRaid || raidData.raid}`)
                    .setLabel("Руководство по рейду")
                    .setStyle(ButtonStyle.Primary));
            }
            const updateDifficulty = async (newDifficulty, raidInfo, raidData, transaction) => {
                if (newDifficulty != null && raidInfo.maxDifficulty >= newDifficulty && newDifficulty != raidData.difficulty) {
                    const difficultyText = newDifficulty === 2 ? "Мастер" : "Нормальный";
                    changesForChannel.push({
                        name: "Сложность рейда",
                        value: `Сложность рейда была изменена - \`${difficultyText}\``,
                    });
                    raidData.difficulty = newDifficulty && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : 1;
                    await raidData.save({ transaction });
                }
            };
            async function updateRequiredClears(newReqClears, raidData, transaction) {
                if (newReqClears != null && raidData.requiredClears != newReqClears) {
                    const requiredClearsText = newReqClears === 0
                        ? "Требование для вступления `отключено`"
                        : `Теперь для вступления нужно от \`${newReqClears}\` закрытий`;
                    changesForChannel.push({
                        name: "Требование для вступления",
                        value: requiredClearsText,
                    });
                    await RaidEvent.update({ requiredClears: newReqClears }, { where: { id: raidData.id }, transaction });
                }
            }
            async function updateRaid(newRaid, raidInfo, raidData, transaction, raidEmbed) {
                if (newRaid !== null) {
                    changesForChannel.push({
                        name: "Рейд набора был изменен",
                        value: `- Новый рейд: \`${raidInfo.raidName}\``,
                    });
                    const [_, [updatedRaid]] = await RaidEvent.update({ raid: raidInfo.raid }, {
                        where: { id: raidData.id },
                        transaction,
                        returning: [
                            "id",
                            "channelId",
                            "inChannelMessageId",
                            "creator",
                            "messageId",
                            "joined",
                            "hotJoined",
                            "alt",
                            "raid",
                            "difficulty",
                        ],
                        limit: 1,
                    });
                    const updatedRaidMessage = await updateRaidMessage({ raidEvent: updatedRaid, returnComponents: true });
                    if (updatedRaidMessage) {
                        raidEmbed.setFields(updatedRaidMessage.embeds[0].data.fields);
                    }
                    raidChallenges({ privateChannelMessage: inChannelMessage, raidData: raidInfo, raidEvent: raidData });
                    const channel = await client.getTextChannel(updatedRaid.channelId);
                    channel.edit({ name: `🔥｜${updatedRaid.id}${raidInfo.channelName}` }).catch((e) => console.error("[Error code: 1696]", e));
                }
            }
            if ((newRaid != null && newRaid != raidData.raid) ||
                (newDifficulty != null && newDifficulty != raidData.difficulty) ||
                (newReqClears != null && newReqClears != raidData.requiredClears)) {
                changes.push("Рейд был измнен");
                await updateDifficulty(newDifficulty, raidInfo, raidData, transaction);
                await updateRequiredClears(newReqClears, raidData, transaction);
                await updateRaid(newRaid, raidInfo, raidData, transaction, raidEmbed);
                raidEmbed
                    .setColor(raidData.joined.length >= 6 ? colors.invisible : raidInfo.raidColor)
                    .setTitle(newReqClears != null || raidData.requiredClears >= 1 || newDifficulty != null
                    ? `Рейд: ${raidInfo.raidName}${(newReqClears != null && newReqClears === 0) || (newReqClears == null && raidData.requiredClears === 0)
                        ? ""
                        : newReqClears != null
                            ? ` от ${newReqClears} закрытий`
                            : ` от ${raidData.requiredClears} закрытий`}`
                    : `Рейд: ${raidInfo.raidName}`)
                    .setThumbnail(raidInfo.raidBanner);
            }
            if (newDescription !== null) {
                const descriptionFieldIndex = raidEmbed.data.fields?.findIndex((field) => field.name === "Описание");
                const field = {
                    name: "Описание",
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
                        value: "Описание было удалено",
                    });
                }
                else {
                    changesForChannel.push({
                        name: "Описание было изменено",
                        value: descriptionFormatter(newDescription),
                    });
                }
                changes.push("Описание было изменено");
            }
            if (newTime !== null) {
                const changedTime = convertTimeStringToNumber(newTime, userTimezones.get(interaction.user.id));
                if (changedTime === raidData.time) {
                    changes.push("Время старта осталось без изменений т.к. оно соответствует предыдущему");
                }
                else if (changedTime >= 2147483647) {
                    await deferredReply;
                    throw {
                        name: "Ошибка. Проверьте корректность времени",
                        description: `Вы указали время <t:${changedTime}>, <t:${changedTime}:R>...`,
                    };
                }
                else if (isNaN(changedTime) || changedTime < 1000) {
                    changes.push("Время старта осталось без изменений, поскольку оно было некорректно указано");
                }
                else if (changedTime > Math.floor(Date.now() / 1000)) {
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
                        value: `- Прежнее время старта: <t:${raidData.time}>, <t:${raidData.time}:R>\n- Новое время: <t:${changedTime}>, <t:${changedTime}:R>`,
                    });
                    changes.push("Время старта было изменено");
                    const [_, updatedRaiddata] = await RaidEvent.update({
                        time: changedTime,
                    }, { where: { id: raidData.id }, transaction: transaction, returning: ["id", "time"], limit: 1 });
                    updateNotificationsForEntireRaid(updatedRaiddata[0].id);
                    raidFireteamCheckerSystem(raidData.id);
                }
                else {
                    changes.push(`Время старта осталось без изменений\nУказаное время <t:${changedTime}>, <t:${changedTime}:R> находится в прошлом`);
                }
            }
            if (newRaidLeader !== null) {
                if (!newRaidLeader.bot) {
                    const raidLeaderName = nameCleaner((await client.getMember(newRaidLeader.id)).displayName);
                    raidPrivateChannel.permissionOverwrites.edit(raidData.creator, { ManageMessages: null, MentionEveryone: null });
                    raidPrivateChannel.permissionOverwrites.edit(newRaidLeader.id, {
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
                            ? `${nameCleaner(interaction.guild.members.cache.get(interaction.user.id).displayName, true)} передал права создателя рейда ${escapeString(raidLeaderName)}`
                            : `Права создателя были переданы ${escapeString(raidLeaderName)}`,
                    });
                    changes.push("Создатель рейда был изменен");
                    raidData.creator = newRaidLeader.id;
                    await raidData.save({ transaction: transaction });
                }
                else {
                    changes.push("Создатель рейда не был изменен поскольку нельзя назначить бота создателем");
                }
            }
            if (changes.length > 0 && changesForChannel.length > 0) {
                try {
                    await transaction.commit();
                }
                catch (error) {
                    console.error("[Error code: 1207]", error);
                    await transaction.rollback();
                }
                const messageOptions = {
                    embeds: [raidEmbed],
                    ...(!newRaid ? { content: "" } : {}),
                };
                inChannelMessage.edit({
                    components: addButtonsToMessage([...getDefaultRaidComponents(inChannelMessage.components[0]), ...components]),
                });
                raidMessage.edit(messageOptions);
                const replyEmbed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle(`Рейд ${raidData.id} был изменен`)
                    .setDescription(changes.join("\n") || "изменений нет");
                (await deferredReply) && interaction.editReply({ embeds: [replyEmbed] });
                const editedEmbedReplyInChn = new EmbedBuilder().setColor(colors.default).setFooter({
                    text: `Изменение ${raidData.creator === interaction.user.id ? "создателем рейда" : "администратором"}`,
                });
                editedEmbedReplyInChn.addFields(changesForChannel);
                notSilently && client.getCachedTextChannel(raidData.channelId).send({ embeds: [editedEmbedReplyInChn] });
            }
            else {
                await transaction.rollback();
                await deferredReply;
                throw {
                    name: "Изменения не были внесены",
                    description: `${changes.map((v) => v).join(", ") ||
                        "Для измнения параметров рейда необходимо их указать\n\nПример:\n`/рейд изменить новое-время:20 12/06`\n`/рейд изменить новая-сложность:Мастер новое-требование-закрытий:5`"}`,
                };
            }
        }
        else if (subCommand === "удалить") {
            const raidId = args.getInteger("id-рейда");
            const raidData = await getRaidDatabaseInfo(raidId, interaction);
            const { channelId, id, messageId, raid } = raidData;
            await RaidEvent.destroy({ where: { id }, limit: 1 });
            clearNotifications(id);
            stopFireteamCheckingSystem(id);
            try {
                const privateRaidChannel = client.getCachedTextChannel(channelId);
                privateRaidChannel &&
                    (await privateRaidChannel.delete(`${interaction.member.displayName} deleted the raid ${id}-${raid}`));
            }
            catch (e) {
                console.error(`[Error code: 1069] Channel during raid manual delete for raidId ${id} wasn't found`);
                e.code !== 10008 ? console.error("[Error code: 1913]", e) : "";
            }
            try {
                const raidsChannel = client.getCachedTextChannel(process.env.RAID_CHANNEL_ID);
                const message = await client.getAsyncMessage(raidsChannel, messageId);
                if (message)
                    await message.delete();
            }
            catch (e) {
                console.error(`[Error code: 1070] Message during raid manual delete for raidId ${id} wasn't found`);
                e.code !== 10008 ? console.error("[Error code: 1240]", e) : "";
            }
            raidEmitter.emit("deleted", raidData);
            await deferredReply;
            if (interaction.channelId === channelId) {
                return;
            }
            const embed = new EmbedBuilder().setColor(colors.success).setTitle(`Рейд ${id}-${raid} был удален`);
            await interaction.editReply({ embeds: [embed] });
        }
        else if (subCommand === "добавить") {
            const raidId = args.getInteger("id-рейда");
            const raidData = await getRaidDatabaseInfo(raidId, interaction);
            const addedUser = args.getUser("участник", true);
            if (addedUser.bot) {
                await deferredReply;
                throw { name: "Нельзя записать бота как участника" };
            }
            const addedUserDisplayName = nameCleaner((await client.getMember(addedUser.id)).displayName);
            const userAlreadyInHotJoined = raidData.hotJoined.includes(addedUser.id);
            const userAlreadyJoined = raidData.joined.includes(addedUser.id);
            const userAlreadyAlt = raidData.alt.includes(addedUser.id);
            const userTarget = args.getBoolean("альтернатива") === true
                ? "alt"
                : raidData.joined.length >= 6 && !userAlreadyInHotJoined && !userAlreadyJoined
                    ? "hotJoined"
                    : "joined";
            const embedReply = new EmbedBuilder();
            const embed = new EmbedBuilder().setColor(colors.success);
            if (userTarget === "joined") {
                embedReply.setColor(colors.success);
            }
            else if (userTarget === "alt") {
                embedReply.setColor(colors.warning);
            }
            else {
                embedReply.setColor(colors.serious);
            }
            let update = {
                joined: Sequelize.fn("array_remove", Sequelize.col("joined"), addedUser.id),
                hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), addedUser.id),
                alt: Sequelize.fn("array_remove", Sequelize.col("alt"), addedUser.id),
            };
            if (userTarget === "joined") {
                if (userAlreadyJoined) {
                    await deferredReply;
                    throw {
                        name: "Ошибка",
                        description: "Пользователь уже записан как участник",
                    };
                }
                if (raidData.joined.length >= 6 && userAlreadyInHotJoined) {
                    await deferredReply;
                    throw {
                        name: "Ошибка",
                        description: `Набор ${raidData.id}-${raidData.raid} полон, а ${addedUserDisplayName} уже добавлен в запас`,
                    };
                }
            }
            else if (userAlreadyAlt) {
                await deferredReply;
                throw { name: "Пользователь уже записан как возможный участник" };
            }
            update[userTarget] = Sequelize.fn("array_append", Sequelize.col(userTarget), addedUser.id);
            embedReply
                .setAuthor({
                name: `${addedUserDisplayName}: ${userAlreadyJoined
                    ? "[Участник] → "
                    : userAlreadyAlt
                        ? "[Возможный участник] → "
                        : userAlreadyInHotJoined
                            ? "[Запас] → "
                            : "❌ → "}${userTarget === "alt" ? " [Возможный участник]" : userTarget === "hotJoined" ? " [Запас]" : "[Участник]"}`,
                iconURL: addedUser.displayAvatarURL(),
            })
                .setFooter({
                text: `Пользователь ${userAlreadyAlt || userAlreadyInHotJoined || userAlreadyJoined ? "перезаписан" : "записан"} ${raidData.creator === interaction.user.id ? "создателем рейда" : "администратором"}`,
            });
            embed.setTitle(`Вы записали ${escapeString(addedUserDisplayName)} как ${userTarget === "alt" ? "возможного участника" : userTarget === "hotJoined" ? "запасного участника" : "участника"} на ${raidData.id}-${raidData.raid}`);
            const [, [raidEvent]] = await RaidEvent.update(update, {
                where: { id: raidData.id },
                returning: ["id", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "messageId", "raid", "difficulty"],
            });
            const raidChn = await client.getTextChannel(raidData.channelId);
            raidChn.send({ embeds: [embedReply] });
            raidChn.permissionOverwrites.create(addedUser.id, {
                ViewChannel: true,
            });
            updateRaidMessage({ raidEvent, interaction });
            updatePrivateRaidMessage(raidEvent);
            updateNotifications(addedUser.id);
            raidEmitter.emit("join", raidEvent, addedUser.id);
            await deferredReply;
            await interaction.editReply({ embeds: [embed] });
        }
        else if (subCommand === "исключить") {
            const raidData = await getRaidDatabaseInfo(args.getInteger("id-рейда"), interaction);
            const kickableUser = args.getUser("участник", true);
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
                if (!rowsUpdated) {
                    await deferredReply;
                    throw { name: "Исключаемый участник не состоит в рейде" };
                }
                if (!raidEvent) {
                    await deferredReply;
                    throw { errorType: "RAID_NOT_FOUND" };
                }
                updatePrivateRaidMessage(raidEvent);
                updateRaidMessage({ raidEvent, interaction });
                raidEmitter.emit("leave", raidEvent, kickableUser.id);
                const kickedUserDisplayName = nameCleaner((await client.getMember(kickableUser.id)).displayName);
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle(`Вы исключили ${escapeString(kickedUserDisplayName)} с рейда ${raidData.id}-${raidData.raid}`);
                const inChnEmbed = new EmbedBuilder()
                    .setColor(colors.error)
                    .setAuthor({
                    name: `${kickedUserDisplayName}: ${raidData.joined.includes(kickableUser.id)
                        ? "[Участник]"
                        : raidData.alt.includes(kickableUser.id)
                            ? "[Возможный участник]"
                            : raidData.hotJoined.includes(kickableUser.id)
                                ? "[Запас]"
                                : "[]"} → ❌`,
                    iconURL: kickableUser.displayAvatarURL(),
                })
                    .setFooter({
                    text: `Пользователь исключен ${raidData.creator === interaction.user.id ? "создателем рейда" : "администратором"}`,
                });
                const raidChn = await client.getTextChannel(raidData.channelId);
                await raidChn.send({ embeds: [inChnEmbed] });
                await raidChn.permissionOverwrites.delete(kickableUser.id);
                updateNotifications(kickableUser.id);
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
            });
        }
        else if (subCommand === "оповещения") {
            await sendNotificationInfo(interaction, deferredReply);
            return;
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=main.js.map