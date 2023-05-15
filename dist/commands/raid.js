import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, } from "discord.js";
import { schedule } from "node-cron";
import { Op, Sequelize } from "sequelize";
import { RaidButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { channelIds, guildId } from "../configs/ids.js";
import raidsGuide from "../configs/raidguide.js";
import { userTimezones } from "../core/userStatisticsManagement.js";
import { Command } from "../structures/command.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
import { completedRaidsData } from "../utils/general/destinyActivityChecker.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { generateRaidClearsText, getRaidData, getRaidDatabaseInfo, raidAnnounceSystem, raidChallenges, timeConverter, updatePrivateRaidMessage, updateRaidMessage, } from "../utils/general/raidFunctions.js";
import updateRaidStatus from "../utils/general/raidFunctions/updateRaidStatus.js";
import { descriptionFormatter, escapeString } from "../utils/general/utilities.js";
import { RaidEvent, database } from "../utils/persistence/sequelize.js";
export const raidAnnounceSet = new Set();
setTimeout(() => {
    const currentTime = Math.floor(Date.now() / 1000);
    const currentDay = new Date(currentTime * 1000);
    currentDay.setHours(23, 0, 0, 0);
    const endTime = Math.floor(currentDay.getTime() / 1000);
    RaidEvent.findAll({
        where: {
            [Op.and]: [{ time: { [Op.gte]: currentTime } }, { time: { [Op.lte]: endTime } }],
        },
    }).then(async (RaidEvent) => RaidEvent.forEach((raidData) => {
        console.debug(`Added ${raidData.id} to checking system`);
        raidAnnounceSystem(raidData);
    }));
}, 15000);
schedule("0 23 * * *", () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const currentDay = new Date(currentTime * 1000);
    currentDay.setHours(23, 0, 0, 0);
    const endTime = Math.floor(currentDay.getTime() / 1000);
    RaidEvent.findAll({
        where: {
            [Op.and]: [{ time: { [Op.gte]: currentTime } }, { time: { [Op.lte]: endTime } }],
        },
    }).then(async (RaidEvent) => RaidEvent.forEach((raidData) => {
        console.debug(`Added ${raidData.id} to checking system`);
        raidAnnounceSystem(raidData);
    }));
});
function getDefaultComponents() {
    return [
        new ButtonBuilder().setCustomId(RaidButtons.notify).setLabel("Оповестить участников").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(RaidButtons.transfer).setLabel("Переместить участников в рейд-войс").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(RaidButtons.unlock).setLabel("Закрыть набор").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(RaidButtons.delete).setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(RaidButtons.resend).setLabel("Обновить сообщение").setStyle(ButtonStyle.Secondary),
    ];
}
export default new Command({
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
                    choices: [
                        {
                            name: "Источник кошмаров",
                            nameLocalizations: { "en-US": "Root of Nightmares", "en-GB": "Root of Nightmares" },
                            value: "ron",
                        },
                        {
                            name: "Гибель короля",
                            nameLocalizations: { "en-US": "King's Fall", "en-GB": "King's Fall" },
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            nameLocalizations: { "en-US": "Vow of the Disciple", "en-GB": "Vow of the Disciple" },
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            nameLocalizations: { "en-US": "Vault of Glass", "en-GB": "Vault of Glass" },
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            nameLocalizations: { "en-US": "Deep Stone Crypt", "en-GB": "Deep Stone Crypt" },
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            nameLocalizations: { "en-US": "Garden of Salvation", "en-GB": "Garden of Salvation" },
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            nameLocalizations: { "en-US": "Last Wish", "en-GB": "Last Wish" },
                            value: "lw",
                        },
                    ],
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
                    maxValue: 2,
                    name: "сложность",
                    nameLocalizations: { "en-US": "difficulty", "en-GB": "difficulty" },
                    description: "Укажите сложность рейда. По умолч.: нормальный",
                    descriptionLocalizations: {
                        "en-US": "Specify the difficulty of the raid. Default: Normal",
                        "en-GB": "Specify the difficulty of the raid. Default: Normal",
                    },
                    choices: [
                        {
                            name: "Нормальный",
                            nameLocalizations: { "en-US": "Normal", "en-GB": "Normal" },
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            nameLocalizations: { "en-US": "Master", "en-GB": "Master" },
                            value: 2,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "требуемых_закрытий",
                    nameLocalizations: { "en-US": "clears_requirement", "en-GB": "clears_requirement" },
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
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id редактируемого рейда",
                    descriptionLocalizations: {
                        "en-US": "Specify the raid id of the modified raid",
                        "en-GB": "Specify the raid id of the modified raid",
                    },
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новый_рейд",
                    nameLocalizations: { "en-US": "new_raid", "en-GB": "new_raid" },
                    description: "Если вы хотите изменить рейд набора - укажите новый",
                    descriptionLocalizations: {
                        "en-US": "Specify new raid if you want to change it",
                        "en-GB": "Specify new raid if you want to change it",
                    },
                    choices: [
                        {
                            name: "Источник кошмаров",
                            nameLocalizations: { "en-US": "Root of Nightmares", "en-GB": "Root of Nightmares" },
                            value: "ron",
                        },
                        {
                            name: "Гибель короля",
                            nameLocalizations: { "en-US": "King's Fall", "en-GB": "King's Fall" },
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            nameLocalizations: { "en-US": "Vow of the Disciple", "en-GB": "Vow of the Disciple" },
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            nameLocalizations: { "en-US": "Vault of Glass", "en-GB": "Vault of Glass" },
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            nameLocalizations: { "en-US": "Deep Stone Crypt", "en-GB": "Deep Stone Crypt" },
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            nameLocalizations: { "en-US": "Garden of Salvation", "en-GB": "Garden of Salvation" },
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            nameLocalizations: { "en-US": "Last Wish", "en-GB": "Last Wish" },
                            value: "lw",
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое_время",
                    nameLocalizations: { "en-US": "new_time", "en-GB": "new_time" },
                    autocomplete: true,
                    description: "Укажите измененное время старта. Формат: ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ",
                    descriptionLocalizations: {
                        "en-US": "Enter the modified LFG start time in the format HH:mm dd/MM",
                        "en-GB": "Enter the modified LFG start time in the format HH:mm dd/MM",
                    },
                },
                {
                    type: ApplicationCommandOptionType.User,
                    name: "новый_создатель",
                    nameLocalizations: { "en-US": "new_creator", "en-GB": "new_creator" },
                    description: "Укажите нового создателя рейда",
                    descriptionLocalizations: { "en-US": "Specify new LFG creator", "en-GB": "Specify new LFG creator" },
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое_описание",
                    nameLocalizations: { "en-US": "new_description", "en-GB": "new_description" },
                    description: "Укажите измененное описание. Вы можете указать здесь что угодно. Знаки для разметки: \\n \\* \\!",
                    descriptionLocalizations: {
                        "en-US": "Enter a new description. You can enter anything here. Markdown symbols: \\n \\* \\!",
                        "en-GB": "Enter a new description. You can enter anything here. Markdown symbols: \\n \\* \\!",
                    },
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "новая_сложность",
                    minValue: 1,
                    maxValue: 2,
                    nameLocalizations: { "en-US": "new_difficulty", "en-GB": "new_difficulty" },
                    description: "Укажите сложность рейда. По умолч.: нормальный",
                    descriptionLocalizations: {
                        "en-US": "Specify the new difficulty of the raid. Default: Normal",
                        "en-GB": "Specify the new difficulty of the raid. Default: Normal",
                    },
                    choices: [
                        {
                            name: "Нормальный",
                            nameLocalizations: { "en-US": "Normal", "en-GB": "Normal" },
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            nameLocalizations: { "en-US": "Master", "en-GB": "Master" },
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
                    descriptionLocalizations: {
                        "en-US": "Specify new raid clears requirement for this raid to join LFG",
                        "en-GB": "Specify new raid clears requirement for this raid to join LFG",
                    },
                    nameLocalizations: { "en-US": "new_clears_requirement", "en-GB": "new_clears_requirement" },
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
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
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
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
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
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id удаляемого рейда",
                    descriptionLocalizations: {
                        "en-US": "Specify the raid ID of the raid you want to delete",
                        "en-GB": "Specify the raid ID of the raid you want to delete",
                    },
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
            if (parsedTime <= Math.trunc(Date.now() / 1000)) {
                await deferredReply;
                throw {
                    name: "Ошибка. Указанное время в прошлом",
                    description: `Вы указали время <t:${parsedTime}>, <t:${parsedTime}:R>, но время начала обязательно должно быть в будущем\n\nВремя указывается по часовому поясу, указанному с помощью \'/timezone\'\n**Пример:**\n> 20:00 15/9`,
                };
            }
            if (parsedTime >= 2147483647) {
                await deferredReply;
                throw {
                    name: "Ошибка. Проверьте корректность времени",
                    description: `Вы указали время <t:${parsedTime}>, <t:${parsedTime}:R>...`,
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
                difficulty,
                requiredClears: reqClears,
            });
            const raidClears = completedRaidsData.get(interaction.user.id);
            const mainComponents = [
                new ButtonBuilder().setCustomId(RaidButtons.join).setLabel("Записаться").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(RaidButtons.leave).setLabel("Выйти").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(RaidButtons.alt).setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
            ];
            const content = `Открыт набор в рейд: ${raidData.raidName} ${raidData.requiredRole !== null ? `<@&${raidData.requiredRole}>` : member.guild.roles.everyone}`;
            const raidChannel = guild.channels.cache.get(channelIds.raid) || (await guild.channels.fetch(channelIds.raid));
            const additionalPosition = guild.channels.cache.get(channelIds.raidCategory)?.children?.cache.size || 1;
            const privateRaidChannel = await member.guild.channels.create({
                name: `🔥｜${raidDb.id}-${raidData.channelName}`,
                parent: channelIds.raidCategory,
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
            raidAnnounceSystem(raidDb);
            updateRaidStatus();
            const premiumEmbed = new EmbedBuilder()
                .setColor("#F3AD0C")
                .addFields([{ name: "Испытания этой недели", value: "⁣　⁣*на одном из этапов*\n\n**Модификаторы рейда**\n　*если есть...*" }]);
            const components = getDefaultComponents();
            if (raidData.raid in raidsGuide) {
                components.push(new ButtonBuilder().setCustomId(`raidGuide_${raidData.raid}`).setLabel("Инструкция по рейду").setStyle(ButtonStyle.Primary));
            }
            const inChnMsg = privateRaidChannel.send({
                embeds: [premiumEmbed],
                components: await addButtonComponentsToMessage(components),
            });
            const embed = new EmbedBuilder()
                .setTitle(`Рейд: ${raidData.raidName}${reqClears >= 1 ? ` от ${reqClears} закрыт${reqClears === 1 ? "ия" : "ий"}` : ""}`)
                .setColor(raidData.raidColor)
                .setFooter({
                text: `Создатель рейда: ${nameCleaner(member.displayName)}`,
                iconURL: "https://www.bungie.net/common/destiny2_content/icons/8b1bfd1c1ce1cab51d23c78235a6e067.png",
            })
                .setThumbnail(raidData.raidBanner)
                .addFields([
                {
                    name: "Id",
                    value: `[${raidDb.id}](https://discord.com/channels/${interaction.guildId}/${privateRaidChannel.id})`,
                    inline: true,
                },
                {
                    name: `Начало: <t:${parsedTime}:R>`,
                    value: `<t:${parsedTime}>`,
                    inline: true,
                },
                {
                    name: "Участник: 1/6",
                    value: `⁣　1. **${nameCleaner(member.displayName, true)}**${raidClears
                        ? ` — ${generateRaidClearsText(raidClears[raidData.raid])}${raidClears[raidData.raid + "Master"] ? ` (+**${raidClears[raidData.raid + "Master"]}** на мастере)` : ""}`
                        : ""}`,
                },
            ]);
            if (raidDescription !== null && raidDescription.length < 1024) {
                embed.spliceFields(2, 0, {
                    name: "Описание",
                    value: descriptionFormatter(raidDescription),
                });
            }
            const msg = raidChannel.send({
                content,
                embeds: [embed],
                components: await addButtonComponentsToMessage(mainComponents),
            });
            const insertedRaidData = await RaidEvent.update({
                channelId: privateRaidChannel.id,
                inChannelMessageId: (await inChnMsg).id,
                messageId: (await msg).id,
            }, { where: { channelId: member.id }, returning: true });
            deferredReply.then(async (_) => {
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: "Рейд создан!", iconURL: icons.success })
                    .setDescription(`Канал рейда: <#${privateRaidChannel.id}>, [ссылка на сообщение набора](https://discord.com/channels/${guild.id}/${privateRaidChannel.id}/${(await msg).id})`);
                interaction.editReply({ embeds: [embed] });
            });
            await updatePrivateRaidMessage({ raidEvent: insertedRaidData[1][0] });
            const privateChannelMessage = (await inChnMsg) || (await privateRaidChannel.messages.fetch((await inChnMsg).id));
            try {
                raidChallenges(raidData, privateChannelMessage, parsedTime, difficulty);
            }
            catch (error) {
                console.error("[Error code: 1652]", error, error.stack);
            }
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
            if (raidData == null || (Array.isArray(raidData) && raidData.length === 0)) {
                await deferredReply;
                throw { errorType: UserErrors.RAID_NOT_FOUND };
            }
            const raidInfo = getRaidData((newRaid || raidData.raid), newDifficulty ?? raidData.difficulty);
            const changes = [];
            const raidMessage = await client.getAsyncMessage(channelIds.raid, raidData.messageId);
            const raidEmbed = EmbedBuilder.from(raidMessage?.embeds[0]);
            const t = await database.transaction();
            const changesForChannel = [];
            const inChannelMessage = await client.getAsyncMessage(raidData.channelId, raidData.inChannelMessageId);
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
                    .setLabel("Инструкция по рейду")
                    .setStyle(ButtonStyle.Primary));
            }
            const updateDifficulty = async (newDifficulty, raidInfo, raidData, t) => {
                if (newDifficulty != null && raidInfo.maxDifficulty >= newDifficulty && newDifficulty != raidData.difficulty) {
                    const difficultyText = newDifficulty === 2 ? "Мастер" : newDifficulty === 1 ? "Нормальный" : "*неизвестная сложность*";
                    changesForChannel.push({
                        name: "Сложность рейда",
                        value: `Сложность рейда была изменена - \`${difficultyText}\``,
                    });
                    await RaidEvent.update({ difficulty: newDifficulty && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : 1 }, { where: { id: raidData.id }, transaction: t });
                }
            };
            async function updateRequiredClears(newReqClears, raidData, t) {
                if (newReqClears != null) {
                    const requiredClearsText = newReqClears === 0
                        ? "Требование для вступления `отключено`"
                        : `Теперь для вступления нужно от \`${newReqClears}\` закрытий`;
                    changesForChannel.push({
                        name: "Требование для вступления",
                        value: requiredClearsText,
                    });
                    await RaidEvent.update({ requiredClears: newReqClears }, { where: { id: raidData.id }, transaction: t });
                }
            }
            async function updateRaid(newRaid, raidInfo, raidData, t, raidEmbed, newDifficulty) {
                if (newRaid !== null) {
                    changesForChannel.push({
                        name: "Рейд",
                        value: `Рейд набора был изменен - \`${raidInfo.raidName}\``,
                    });
                    const [_, [updatedRaid]] = await RaidEvent.update({ raid: raidInfo.raid }, {
                        where: { id: raidData.id },
                        transaction: t,
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
                    raidChallenges(raidInfo, inChannelMessage, raidData.time, newDifficulty != null && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : updatedRaid.difficulty);
                    const channel = await client.getAsyncTextChannel(updatedRaid.channelId);
                    channel.edit({ name: `🔥｜${updatedRaid.id}${raidInfo.channelName}` }).catch((e) => console.error("[Error code: 1696]", e));
                }
            }
            if (newRaid != null || newDifficulty != null || newReqClears != null) {
                changes.push("Рейд был измнен");
                await updateDifficulty(newDifficulty, raidInfo, raidData, t);
                await updateRequiredClears(newReqClears, raidData, t);
                await updateRaid(newRaid, raidInfo, raidData, t, raidEmbed, newDifficulty);
                raidEmbed
                    .setColor(raidData.joined.length === 6 ? colors.invisible : raidInfo.raidColor)
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
                        value: newDescription,
                    });
                }
                changes.push("Описание было изменено");
            }
            if (newTime !== null) {
                const changedTime = timeConverter(newTime, userTimezones.get(interaction.user.id));
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
                else if (changedTime > Math.round(Date.now() / 1000)) {
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
                        value: ` · Прежнее время старта: <t:${raidData.time}>, <t:${raidData.time}:R>\n · Новое время: <t:${changedTime}>, <t:${changedTime}:R>`,
                    });
                    changes.push("Время старта было изменено");
                    const [_, updatedRaiddata] = await RaidEvent.update({
                        time: changedTime,
                    }, { where: { id: raidData.id }, transaction: t, returning: ["id", "time"] });
                    raidAnnounceSet.delete(updatedRaiddata[0].id);
                    raidAnnounceSystem(updatedRaiddata[0]);
                    updateRaidStatus();
                }
                else {
                    changes.push(`Время старта осталось без изменений\nУказаное время <t:${changedTime}>, <t:${changedTime}:R> находится в прошлом`);
                }
            }
            if (newRaidLeader !== null) {
                if (!newRaidLeader.bot) {
                    const raidPrivateChannel = client.getCachedTextChannel(raidData.channelId);
                    const raidLeaderName = nameCleaner((interaction.guild || client.getCachedGuild()).members.cache.get(newRaidLeader.id).displayName);
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
                    await RaidEvent.update({
                        creator: newRaidLeader.id,
                    }, { where: { id: raidData.id }, transaction: t });
                }
                else {
                    changes.push("Создатель рейда не был изменен поскольку нельзя назначить бота создателем");
                }
            }
            if (changes.length > 0 && changesForChannel.length > 0) {
                try {
                    await t.commit();
                }
                catch (error) {
                    console.error("[Error code: 1207]", error);
                    await t.rollback();
                }
                const messageOptions = {
                    embeds: [raidEmbed],
                    ...(!newRaid ? { content: "" } : {}),
                };
                inChannelMessage.edit({
                    components: await addButtonComponentsToMessage([...getDefaultComponents(), ...components]),
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
                !isSilent && client.getCachedTextChannel(raidData.channelId).send({ embeds: [editedEmbedReplyInChn] });
            }
            else {
                await t.rollback();
                await deferredReply;
                throw {
                    name: "Изменения не были внесены",
                    description: `${changes.map((v) => v).join(", ") ||
                        "Для измнения параметров рейда необходимо их указать\n\nПример:\n`/рейд изменить новое_время:20 12/06`\n`/рейд изменить новая_сложность:Мастер новое_требование_закрытий:5`"}`,
                };
            }
        }
        else if (subCommand === "удалить") {
            const raidId = args.getInteger("id_рейда");
            const raidData = await getRaidDatabaseInfo(raidId, interaction);
            await RaidEvent.destroy({ where: { id: raidData.id }, limit: 1 })
                .then(async () => {
                const raidsChannel = await client.getAsyncTextChannel(channelIds.raid);
                const privateRaidChannel = await client.getAsyncTextChannel(raidData.channelId);
                try {
                    await privateRaidChannel.delete(`${interaction.member.displayName} deleted the raid ${raidData.id}-${raidData.raid}`);
                }
                catch (e) {
                    console.error(`[Error code: 1069] Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error(e) : "";
                }
                try {
                    const message = await client.getAsyncMessage(raidsChannel, raidData.messageId);
                    if (message)
                        await message.delete();
                }
                catch (e) {
                    console.error(`[Error code: 1070] Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error("[Error code: 1240]", e) : "";
                }
                const embed = new EmbedBuilder().setColor(colors.success).setTitle(`Рейд ${raidData.id}-${raidData.raid} был удален`);
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
            })
                .catch((e) => console.error("[Error code: 1206]", e));
        }
        else if (subCommand === "добавить") {
            const raidId = args.getInteger("id_рейда");
            const raidData = await getRaidDatabaseInfo(raidId, interaction);
            const addedUser = args.getUser("участник", true);
            if (addedUser.bot) {
                await deferredReply;
                throw { name: "Нельзя записать бота как участника" };
            }
            const addedUserDisplayName = nameCleaner((await client.getAsyncMember(addedUser.id)).displayName);
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
            const raidChn = await client.getAsyncTextChannel(raidData.channelId);
            raidChn.send({ embeds: [embedReply] });
            raidChn.permissionOverwrites.create(addedUser.id, {
                ViewChannel: true,
            });
            updateRaidMessage({ raidEvent, interaction });
            updatePrivateRaidMessage({ raidEvent });
            (await deferredReply) && interaction.editReply({ embeds: [embed] });
        }
        else if (subCommand === "исключить") {
            const raidData = await getRaidDatabaseInfo(args.getInteger("id_рейда"), interaction);
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
                    throw { errorType: UserErrors.RAID_NOT_FOUND };
                }
                updatePrivateRaidMessage({ raidEvent });
                updateRaidMessage({ raidEvent, interaction });
                const guild = interaction.guild || client.getCachedGuild();
                const kickedUserDisplayName = nameCleaner((await client.getAsyncMember(kickableUser.id)).displayName);
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
                const raidChn = await client.getAsyncTextChannel(raidData.channelId);
                await raidChn.send({ embeds: [inChnEmbed] });
                await raidChn.permissionOverwrites.delete(kickableUser.id);
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
            });
        }
    },
});
