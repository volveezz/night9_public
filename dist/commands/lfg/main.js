import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { LFGController } from "../../structures/LFGController.js";
import { Command } from "../../structures/command.js";
import { validateAvailableOrInputedLfgId } from "../../utils/discord/lfgSystem/v2/getAvailableLfgIdsForUser.js";
import { activityCache } from "../../utils/general/cacheAvailableActivities.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import convertTimeStringToNumber from "../../utils/general/raidFunctions/convertTimeStringToNumber.js";
const availableRequiredRoles = [
    {
        name: "Конец Света",
        value: process.env.LIGHTFALL_ROLE_ID,
        nameLocalizations: { "en-GB": "Lightfall", "en-US": "Lightfall" },
    },
    {
        name: "Королева-Ведьма",
        value: process.env.THE_WITCH_QUEEN_ROLE_ID,
        nameLocalizations: { "en-GB": "Beyond Light", "en-US": "Beyond Light" },
    },
    {
        name: "За гранью Света",
        value: process.env.BEYONDLIGHT_ROLE_ID,
        nameLocalizations: { "en-GB": "The Witch Queen", "en-US": "The Witch Queen" },
    },
    {
        name: "Обитель Теней",
        value: process.env.SHADOWKEEP_ROLE_ID,
        nameLocalizations: { "en-GB": "Shadowkeep", "en-US": "Shadowkeep" },
    },
    {
        name: "Отвергнутые",
        value: process.env.FORSAKEN_ROLE_ID,
        nameLocalizations: { "en-GB": "Forsaken", "en-US": "Forsaken" },
    },
    {
        name: "Без дополнения",
        value: client.getCachedGuild().roles.everyone.id,
        nameLocalizations: { "en-GB": "Without DLC", "en-US": "Without DLC" },
    },
];
const lfgIdOption = {
    name: "lfg-id",
    nameLocalizations: { ru: "id-сбора" },
    description: "Specify the lfg id",
    descriptionLocalizations: { ru: "Укажите Id сбора" },
    type: ApplicationCommandOptionType.Integer,
    autocomplete: true,
    minValue: 1,
    maxValue: 100,
};
const SlashCommand = new Command({
    name: "lfg",
    nameLocalizations: { ru: "сбор" },
    description: "Managing lfgs for PvE and PvP activities",
    descriptionLocalizations: { ru: "Управление сборами в PvE и PvP активности" },
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "create",
            nameLocalizations: { ru: "создать" },
            description: "Creates a new lfg for a PvE or PvP activity",
            descriptionLocalizations: {
                ru: "Создаёт новый сбор в PvE или PvP активность",
            },
            options: [
                {
                    name: "activity",
                    nameLocalizations: { ru: "активность" },
                    description: "Specify the activity name or select it from the available list",
                    descriptionLocalizations: { ru: "Укажите название активности или выберите её из списка" },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                    maxLength: 100,
                },
                {
                    name: "time",
                    nameLocalizations: { ru: "время" },
                    description: "Specify the time for the lfg using the format: 16:00 28.09, adjusted to your timezone (/timezone)",
                    descriptionLocalizations: { ru: "Укажите время начала сбора в формате: 16:00 28.09 по вашему часовому поясу (/timezone)" },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                },
                {
                    name: "description",
                    nameLocalizations: { ru: "описание" },
                    description: "Provide a description for the lfg",
                    descriptionLocalizations: { ru: "Укажите описание сбора" },
                    type: ApplicationCommandOptionType.String,
                    maxLength: 1024,
                },
                {
                    name: "user-limit",
                    nameLocalizations: { ru: "лимит-пользователей" },
                    description: "Specify the user limit for the lfg",
                    descriptionLocalizations: { ru: "Установите лимит пользователей для сбора" },
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 2,
                    maxValue: 100,
                },
                {
                    name: "required-dlc",
                    nameLocalizations: { ru: "требуемое-дополнение" },
                    description: "Specify any DLC required for participation in the lfg",
                    descriptionLocalizations: { ru: "Укажите необходимое дополнение для участия в сборе" },
                    type: ApplicationCommandOptionType.String,
                    choices: availableRequiredRoles,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "edit",
            nameLocalizations: { ru: "изменить" },
            description: "Modifies an existing lfg",
            descriptionLocalizations: {
                ru: "Изменяет существующий сбор",
            },
            options: [
                {
                    name: "new-activity",
                    nameLocalizations: { ru: "новая-активность" },
                    description: "Specify the new activity name or select it from the available list",
                    descriptionLocalizations: {
                        ru: "Укажите своё название активности или выберите её из списка",
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true,
                    maxLength: 100,
                },
                {
                    name: "new-time",
                    nameLocalizations: { ru: "новое-время" },
                    description: "Specify the time for the lfg using the format: 00:00 26.12, adjusted to your timezone (/timezone)",
                    descriptionLocalizations: {
                        ru: "Укажите новое время начала сбора в формате: 16:00 28.09 по вашему часовому поясу (/timezone)",
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true,
                },
                {
                    name: "new-creator",
                    nameLocalizations: {
                        ru: "новый-создатель",
                    },
                    description: "Designate a user to transfer the lfg management rights to",
                    descriptionLocalizations: {
                        ru: "Укажите пользователя, которому вы хотите передать права на ваш сбор",
                    },
                    type: ApplicationCommandOptionType.User,
                },
                {
                    name: "new-description",
                    nameLocalizations: { ru: "новое-описание" },
                    description: "Provide a new description for the lfg",
                    descriptionLocalizations: { ru: "Укажите новое описание сбора" },
                    type: ApplicationCommandOptionType.String,
                    maxLength: 1024,
                },
                {
                    name: "new-user-limit",
                    nameLocalizations: { ru: "новый-лимит-пользователей" },
                    description: "Specify the new user limit for the lfg",
                    descriptionLocalizations: { ru: "Укажите новый лимит пользователей для сбора" },
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 2,
                    maxValue: 100,
                },
                {
                    name: "new-required-dlc",
                    nameLocalizations: { ru: "новое-требуемое-дополнение" },
                    description: "Specify a new DLC required for participation in the lfg",
                    descriptionLocalizations: { ru: "Укажите новое требуемое дополнение для участия в сборе" },
                    type: ApplicationCommandOptionType.String,
                    choices: availableRequiredRoles,
                },
                lfgIdOption,
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "add",
            nameLocalizations: {
                ru: "добавить",
            },
            description: "Add a user to the lfg",
            descriptionLocalizations: {
                ru: "Записывает пользователя на сбор",
            },
            options: [
                {
                    name: "user",
                    nameLocalizations: {
                        ru: "пользователь",
                    },
                    description: "Specify a user to add to the lfg",
                    descriptionLocalizations: {
                        ru: "Укажите пользователя, которого вы хотите записать",
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                lfgIdOption,
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "kick",
            nameLocalizations: {
                ru: "исключить",
            },
            description: "Remove a user from the lfg",
            descriptionLocalizations: {
                ru: "Исключает пользователя из сбора",
            },
            options: [
                {
                    name: "user",
                    nameLocalizations: {
                        ru: "пользователь",
                    },
                    description: "Specify a user to remove from the lfg",
                    descriptionLocalizations: {
                        ru: "Укажите пользователя, которого вы хотите исключить",
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                lfgIdOption,
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "delete",
            nameLocalizations: {
                ru: "удалить",
            },
            description: "Delete the lfg",
            descriptionLocalizations: {
                ru: "Удаляет сбор",
            },
            options: [lfgIdOption],
        },
    ],
    run: async ({ interaction, args }) => {
        const subcommand = args.getSubcommand(true);
        let lfgId = null;
        if (subcommand !== "create") {
            lfgId = await validateAvailableOrInputedLfgId(interaction.user.id, args.getInteger("lfg-id", false));
            if (!lfgId)
                throw { errorType: "LFG_NOT_FOUND", interaction, errorData: [lfgId ?? null] };
        }
        switch (subcommand) {
            case "create": {
                const deferredReply = interaction.deferReply({ ephemeral: true });
                const memberPromise = client.getMember(interaction.member);
                const guildPromise = client.getGuild(interaction.guild);
                const activity = args.getString("activity", true);
                let isActivityHash = false;
                if (activityCache[activity]) {
                    isActivityHash = true;
                }
                const timeString = args.getString("time", true);
                const convertedTime = convertTimeStringToNumber(timeString);
                if (!convertedTime) {
                    throw { errorType: "RAID_TIME_ERROR" };
                }
                if (convertedTime < Date.now() / 1000 || convertedTime > 2000000000 || convertedTime < 1000000000) {
                    throw { errorType: "RAID_TIME_ERROR", errorData: [timeString] };
                }
                const description = args.getString("description", false);
                const userLimit = args.getInteger("user-limit", false);
                const requiredDLC = args.getString("required-dlc", false);
                const [member, guild] = await Promise.all([memberPromise, guildPromise]);
                if (requiredDLC && !member.roles.cache.has(requiredDLC)) {
                    throw { errorType: "LFG_MISSING_DLC_TO_CREATE_LFG", errorData: [requiredDLC] };
                }
                const isLFGCreated = await LFGController.getInstance().createLFG({
                    ...(isActivityHash ? { activityHash: activity } : { activityName: activity }),
                    creatorId: interaction.user.id,
                    time: convertedTime,
                    description,
                    userLimit,
                    requiredDLC,
                    guild,
                });
                const embed = new EmbedBuilder();
                if (isLFGCreated) {
                    embed.setColor(colors.success).setAuthor({ name: "Сбор был создан", iconURL: icons.success });
                }
                else {
                    embed.setColor(colors.error).setAuthor({ name: "Произошла ошибка во время создания сбора", iconURL: icons.error });
                }
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                break;
            }
            case "edit": {
                const newActivity = args.getString("new-activity", false);
                const newTime = args.getString("new-time", false);
                const newDescription = args.getString("new-description", false);
                const newUserLimit = args.getInteger("new-user-limit", false);
                const newRequiredDLC = args.getString("new-required-dlc", false);
                let newCreator = args.getUser("new-creator", false);
                newCreator && newCreator.bot && (newCreator = null);
                const editedFields = await LFGController.getInstance().editLFG({
                    lfgId: lfgId,
                    newActivity,
                    newTime,
                    newDescription,
                    newUserLimit,
                    newRequiredDLC,
                    newCreator,
                    requesterId: interaction.user.id,
                    requestedBy: interaction.memberPermissions?.has("Administrator") ? "admin" : undefined,
                });
                const embed = new EmbedBuilder().setFields(editedFields);
                if (editedFields.length > 0) {
                    if (editedFields.length === 1 && editedFields[0].name.startsWith("Ничего")) {
                        embed.setAuthor({ name: "Ничего не было изменено", iconURL: icons.notify }).setColor(colors.serious);
                    }
                    else {
                        embed
                            .setAuthor({
                            name: "Сбор был изменен",
                            iconURL: icons.success,
                        })
                            .setColor(colors.success);
                    }
                }
                else {
                    embed.setAuthor({ name: "Произошла ошибка во время изменения сбора", iconURL: icons.error }).setColor(colors.error);
                }
                interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
            case "delete": {
                const deferredReply = interaction.deferReply({ ephemeral: true });
                await LFGController.getInstance().deleteLFG(lfgId);
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сбор был удален", iconURL: icons.success });
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                break;
            }
            case "add": {
                let user = args.getUser("user", true);
                if (user && user.bot) {
                    throw { errorType: "LFG_CANNOT_ADD_BOT" };
                }
                const member = client.getCachedMembers().get(user.id);
                await LFGController.getInstance().addUserToLFG({ userId: user.id, lfgId: lfgId, requesterId: interaction.user.id });
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({
                    name: `Пользователь ${nameCleaner(member?.displayName || user.username)} был записан`,
                    iconURL: (member || user).displayAvatarURL(),
                });
                interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
            case "kick": {
                const user = args.getUser("user", true);
                const member = client.getCachedMembers().get(user.id);
                await LFGController.getInstance().removeUserFromLFG({
                    userId: user.id,
                    lfgId: lfgId,
                    requestedBy: interaction.memberPermissions?.has("Administrator") ? "admin" : "creator",
                    requesterId: interaction.user.id,
                });
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({
                    name: `Пользователь ${nameCleaner(member?.displayName || user.username)} был исключен`,
                    iconURL: (member || user).displayAvatarURL(),
                });
                interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=main.js.map