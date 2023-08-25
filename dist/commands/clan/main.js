import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, GuildMember, } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { Command } from "../../structures/command.js";
import { cancelClanInvitation } from "../../utils/api/cancelClanInvitation.js";
import kickMemberFromClan from "../../utils/api/clanMembersManagement.js";
import { sendApiPostRequest } from "../../utils/api/sendApiPostRequest.js";
import { sendApiRequest } from "../../utils/api/sendApiRequest.js";
import createErrorEmbed from "../../utils/errorHandling/createErrorEmbed.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { convertSeconds } from "../../utils/general/convertSeconds.js";
import { parseIdentifierString } from "../../utils/general/utilities.js";
import { AuthData, UserActivityData } from "../../utils/persistence/sequelize.js";
const CustomRuntimeGroupMemberType = {
    0: "Не в клане",
    1: "Новичок",
    2: "Участник",
    3: "Админ",
    4: "Действующий основатель",
    5: "Основатель",
};
function getRuntimeGroupMemberTypeName(value) {
    return CustomRuntimeGroupMemberType[value];
}
const SlashCommand = new Command({
    name: "clan",
    nameLocalizations: { ru: "клан" },
    description: "Clan management",
    descriptionLocalizations: {
        ru: "Управление кланом",
    },
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "roster",
            nameLocalizations: {
                ru: "состав",
                "en-US": "list",
                "en-GB": "list",
            },
            description: "View the clan roster",
            descriptionLocalizations: {
                ru: "Состава клана и его статистика",
            },
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "management",
            nameLocalizations: {
                ru: "управление",
            },
            description: "Menu for managing the clan roster",
            descriptionLocalizations: {
                ru: "Меню управления составом клана",
            },
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "invite",
            nameLocalizations: {
                ru: "пригласить",
            },
            description: "Invite a user to the clan",
            descriptionLocalizations: {
                ru: "Пригласить пользователя в клан",
            },
            options: [
                {
                    name: "identifier",
                    nameLocalizations: {
                        ru: "идентификатор",
                    },
                    description: "Bungie Id, Discord Id, or display name of the user to invite",
                    descriptionLocalizations: {
                        ru: "Bungie Id, Discord Id или отображаемое имя приглашаемого",
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "time",
                    nameLocalizations: { ru: "время" },
                    description: "Time after which the invite will be canceled",
                    descriptionLocalizations: {
                        ru: "Время, после которого приглашение будет отменено",
                    },
                    minValue: 0,
                    maxValue: 1440,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "invites",
            nameLocalizations: {
                ru: "приглашения",
            },
            description: "Review and manage sent and received invites to the clan",
            descriptionLocalizations: {
                ru: "Просмотр и управление отправленными и полученными приглашениями в клан",
            },
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "get-member",
            nameLocalizations: {
                ru: "получить-участника",
            },
            description: "Get information about a clan member",
            descriptionLocalizations: {
                ru: "Получить информацию о члене клана",
            },
            options: [
                {
                    name: "identifier",
                    nameLocalizations: {
                        ru: "идентификатор",
                    },
                    description: "Bungie Id, Discord Id, or display name of the clan member",
                    descriptionLocalizations: {
                        ru: "Bungie Id, Discord Id или отображаемое имя члена клана",
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                },
            ],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const subCommand = args.getSubcommand();
        if (subCommand === "roster") {
            await handleRoster(interaction);
            return;
        }
        else {
            const member = interaction.member instanceof GuildMember ? interaction.member : await client.getAsyncMember(interaction.user.id);
            if (!member || !member.permissions.has("Administrator")) {
                throw { errorType: "MISSING_PERMISSIONS" };
            }
        }
        const deferredReply = interaction.deferReply({ ephemeral: true });
        try {
            switch (subCommand) {
                case "management":
                    await handleManagement(interaction, await getMergedMembers(), deferredReply);
                    break;
                case "invite":
                    const options = { identifier: args.getString("identifier", true), time: args.getInteger("time") };
                    await sendInviteToClan(interaction, deferredReply, options);
                    break;
            }
        }
        catch (error) {
            console.error("[Error code: 1906] Error catched", error);
        }
    },
});
const buildMemberData = (clanMember, authData) => {
    const displayName = clanMember.bungieNetUserInfo?.supplementalDisplayName ||
        `${clanMember.destinyUserInfo.bungieGlobalDisplayName}#${clanMember.destinyUserInfo.bungieGlobalDisplayNameCode
            ?.toString()
            .padStart(4, "0")}` ||
        clanMember.destinyUserInfo.LastSeenDisplayName ||
        clanMember.destinyUserInfo.displayName;
    return {
        isOnline: clanMember.isOnline,
        lastOnlineStatusChange: parseInt(clanMember.lastOnlineStatusChange),
        joinDate: Math.trunc(new Date(clanMember.joinDate).getTime() / 1000),
        displayName,
        platform: clanMember.destinyUserInfo.membershipType,
        membershipType: clanMember.destinyUserInfo.membershipType,
        bungieId: clanMember.destinyUserInfo.membershipId,
        rank: clanMember.memberType,
        UserActivityData: authData?.UserActivityData,
        discordId: authData?.discordId,
    };
};
const sortMembers = (a, b) => {
    return a.isOnline === b.isOnline ? b.lastOnlineStatusChange - a.lastOnlineStatusChange : a.isOnline ? -1 : 1;
};
const getMergedMembers = async () => {
    const destinyRequest = await sendApiRequest(`/Platform/GroupV2/${process.env.GROUP_ID}/Members/?memberType=None`);
    const destinyMembers = destinyRequest.results;
    const clanMembers = await AuthData.findAll({
        where: { clan: true },
        include: [UserActivityData],
        attributes: ["discordId", "bungieId", "platform", "displayName"],
    });
    return destinyMembers
        .map((clanMember) => {
        const authData = clanMembers.find((member) => member.bungieId === clanMember.destinyUserInfo.membershipId);
        return buildMemberData(clanMember, authData);
    })
        .sort(sortMembers);
};
const handleRoster = async (interaction) => {
    const mergedMembers = await getMergedMembers();
    const embeds = createRosterEmbeds(mergedMembers);
    for (let i = 0; i < embeds.length; i++) {
        const embed = embeds[i];
        if (i === 0) {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        else {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
    }
};
const createRosterEmbeds = (users) => {
    const embeds = [];
    let fields = [];
    for (const [index, user] of users.entries()) {
        const joinDate = user.joinDate !== 0 ? `<t:${Math.floor(new Date(user.joinDate).getTime())}>` : "N/A";
        const lastOnline = user.lastOnlineStatusChange !== 0 ? `<t:${user.lastOnlineStatusChange}>` : "N/A";
        const fieldContent = [
            `[🔗](https://www.bungie.net/en/Profile/${user.platform}/${user.bungieId})`,
            user.isOnline ? `🟢` : `🔴${lastOnline}`,
            ` | 📅${joinDate}`,
        ];
        if (user.UserActivityData) {
            fieldContent.push(`| 🎙️${user.UserActivityData.voice}s | 💬${user.UserActivityData.messages} | ${user.UserActivityData.dungeons}/${user.UserActivityData.raids}`);
        }
        fields.push({ name: `${index + 1}. ${user.displayName}`, value: fieldContent.join(" ") });
        if (fields.length === 25) {
            const embed = new EmbedBuilder().setColor(colors.default).addFields(fields);
            embeds.push(embed);
            fields = [];
        }
    }
    if (fields.length > 0) {
        const embed = new EmbedBuilder().setColor(colors.default).addFields(fields);
        embeds.push(embed);
    }
    return embeds;
};
export const getAdminAccessToken = async (interaction) => {
    console.debug("Admin access token was requested");
    const discordId = typeof interaction === "string" ? interaction : interaction.user.id;
    const adminAuthData = await AuthData.findOne({ where: { discordId: discordId }, attributes: ["accessToken"] });
    if (adminAuthData && adminAuthData.accessToken) {
        return adminAuthData.accessToken;
    }
    else if (typeof interaction !== "string") {
        const embed = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: "Ошибка. Не найден токен авторизации", iconURL: icons.error });
        interaction.followUp({ embeds: [embed], ephemeral: true });
        return undefined;
    }
};
const handleManagement = async (interaction, clanMembers, deferredReply) => {
    let index = clanMembers.length - 1;
    let userData = clanMembers[index];
    const makeNewEmbed = async () => {
        userData = clanMembers[index];
        const member = userData.discordId ? client.getCachedMembers().get(userData.discordId) : undefined;
        const embed = new EmbedBuilder().setColor(member ? colors.default : colors.kicked).setAuthor(member
            ? {
                name: `${member.displayName} - ${userData.displayName}`,
                iconURL: member.displayAvatarURL(),
                url: `https://www.bungie.net/en/Profile/${userData.platform}/${userData.bungieId}`,
            }
            : {
                name: userData.displayName,
                iconURL: icons.error,
                url: `https://www.bungie.net/en/Profile/${userData.platform}/${userData.bungieId}`,
            });
        const fields = [];
        const joinDate = userData && userData.joinDate !== 0 ? `<t:${userData.joinDate}>` : "N/A";
        const lastOnline = userData && userData.lastOnlineStatusChange !== 0 ? `<t:${userData.lastOnlineStatusChange}>` : "N/A";
        const isOnline = userData ? userData.isOnline : false;
        fields.push({
            name: "Статистика в клане",
            value: `Онлайн: ${isOnline
                ? `🟢 в игре`
                : `🔴 ${lastOnline}\n${userData.rank !== 0 ? `Вступил в клан: ${joinDate}` : ""}\nРанг: ${getRuntimeGroupMemberTypeName(userData.rank)}`}`,
        });
        if (userData.UserActivityData) {
            fields.push({
                name: `Статистика на сервере`,
                value: `В голосе: ${convertSeconds(userData.UserActivityData.voice)}\nСообщений: ${userData.UserActivityData.messages}\nРейдов/данжей: ${userData.UserActivityData.dungeons}/${userData.UserActivityData.raids}`,
            });
        }
        embed.addFields(fields);
        return embed;
    };
    const makeButtons = () => {
        const buttons = [
            new ButtonBuilder()
                .setCustomId("clanManagement_previous")
                .setDisabled(index === 0 ? true : false)
                .setEmoji("⬅️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("clanManagement_demote")
                .setDisabled(userData.rank <= 1 || userData.rank > 3 ? true : false)
                .setLabel("Понизить")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("clanManagement_promote")
                .setDisabled(userData.rank > 2 || userData.rank === 0 ? true : false)
                .setLabel("Повысить")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("clanManagement_kick")
                .setDisabled(userData.rank === 0 || userData.rank > 3 ? true : false)
                .setLabel("Исключить")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("clanManagement_next")
                .setDisabled(index === clanMembers.length - 1 ? true : false)
                .setEmoji("➡️")
                .setStyle(ButtonStyle.Secondary),
        ];
        return buttons;
    };
    const setUserRank = async (rank) => {
        return await sendApiPostRequest({
            apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID}/Members/${userData.platform}/${userData.bungieId}/SetMembershipType/${rank}/`,
            accessToken: await getAdminAccessToken(interaction),
            shouldReturnResponse: false,
        });
    };
    const demoteUser = async () => {
        const userRank = userData.rank;
        if (userRank <= 1 || userRank > 3) {
            const embed = new EmbedBuilder()
                .setColor(colors.error)
                .setAuthor({ name: "Этого игрока невозможно понизить", iconURL: icons.error });
            return interaction.followUp({ embeds: [embed], ephemeral: true });
        }
        const response = await setUserRank(userRank - 1);
        let embed = new EmbedBuilder();
        if (response.ErrorCode === 1) {
            embed.setColor(colors.success).setAuthor({ name: "Пользователь был понижен", iconURL: icons.success });
            userData.rank = userRank - 1;
            clanMembers[index] = userData;
            updateMessage(true);
        }
        else {
            embed.setColor(colors.error).setAuthor({ name: "Произошла ошибка во время понижения", iconURL: icons.error });
            console.error("[Error code: 1902]", response);
        }
        return interaction.followUp({ embeds: [embed], ephemeral: true });
    };
    const promoteUser = async () => {
        const userRank = userData.rank;
        if (userRank === 0 || userRank > 2) {
            const embed = new EmbedBuilder()
                .setColor(colors.error)
                .setAuthor({ name: "Этого игрока невозможно повысить", iconURL: icons.error });
            return interaction.followUp({ embeds: [embed], ephemeral: true });
        }
        const response = await setUserRank(userRank + 1);
        let embed = new EmbedBuilder();
        if (response.ErrorCode === 1) {
            embed.setColor(colors.success).setAuthor({ name: "Пользователь был повышен", iconURL: icons.success });
            userData.rank = userRank + 1;
            clanMembers[index] = userData;
            updateMessage(true);
        }
        else {
            embed.setColor(colors.error).setAuthor({ name: "Произошла ошибка во время повышения", iconURL: icons.error });
            console.error("[Error code: 1903]", response);
        }
        return interaction.followUp({ embeds: [embed], ephemeral: true });
    };
    const kickUser = async (i) => {
        await kickMemberFromClan({ bungieId: userData.bungieId, platform: userData.platform }, i);
    };
    const updateMessage = async (fromCollector = false) => {
        const messageData = {
            embeds: [await makeNewEmbed()],
            components: addButtonsToMessage(makeButtons()),
            ...(fromCollector ? {} : { ephemeral: true }),
        };
        if (fromCollector) {
            await interaction.editReply(messageData);
        }
        else {
            return messageData;
        }
    };
    await deferredReply;
    const messageOptions = (await updateMessage());
    const message = await interaction.editReply(messageOptions);
    const collector = interaction.channel.createMessageComponentCollector({
        message,
        filter: (i) => i.user.id === interaction.user.id,
        idle: 1000 * 60 * 5,
        componentType: ComponentType.Button,
    });
    collector.on("collect", async (i) => {
        const deferredReply = i.customId === "clanManagement_kick" ? i.deferReply({ ephemeral: true }) : i.deferUpdate();
        try {
            switch (i.customId) {
                case "clanManagement_previous":
                    index = index === 0 ? index : index - 1;
                    await updateMessage(true);
                    break;
                case "clanManagement_next":
                    index = index === clanMembers.length - 1 ? index : index + 1;
                    await updateMessage(true);
                    break;
                case "clanManagement_demote":
                    await demoteUser();
                    break;
                case "clanManagement_promote":
                    await promoteUser();
                    break;
                case "clanManagement_kick":
                    await deferredReply;
                    await kickUser(i);
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            console.error("[Error code: 1904]", error);
            const messageData = createErrorEmbed(error);
            await deferredReply;
            await i.followUp({ ...messageData, ephemeral: true });
        }
    });
    collector.on("end", () => interaction.deleteReply());
};
const sendInviteToClan = async (interaction, deferredReply, args) => {
    const clanErrorsHandler = (errorCode) => {
        const embed = new EmbedBuilder();
        switch (errorCode) {
            case 1:
                return embed.setColor(colors.success).setAuthor({ name: "Пользователь был приглашен в клан", iconURL: icons.success });
            case 676:
                return embed.setColor(colors.success).setAuthor({ name: "Пользователь уже в клане", iconURL: icons.success });
            case 667:
                return embed.setColor(colors.error).setAuthor({ name: "Ошибка. Клан полон. В никого нельзя пригласить", iconURL: icons.error });
            default:
                return embed.setColor(colors.error).setAuthor({
                    name: `Произошла неизвестная ошибка ${errorCode ?? 3}`,
                    iconURL: icons.error,
                });
        }
    };
    const userData = parseIdentifierString(args.identifier);
    if (!userData.bungieId || !userData.platform) {
        await deferredReply;
        throw { name: "Ошибка. Пользователь не обработан" };
    }
    const { bungieId, platform } = userData;
    const accessToken = await getAdminAccessToken(interaction);
    const invitePost = await sendApiPostRequest({
        apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID}/Members/IndividualInvite/${platform}/${bungieId}/`,
        accessToken: accessToken,
        requestData: {
            message: "Приглашение в клан Night 9",
        },
        shouldReturnResponse: false,
    });
    if (!invitePost || !invitePost.ErrorCode) {
        console.error("[Error code: 1909]", invitePost);
    }
    const embed = clanErrorsHandler(invitePost.ErrorCode);
    await deferredReply;
    await interaction.editReply({ embeds: [embed] });
    if (invitePost?.ErrorCode === 1 && args.time && args.time > 0) {
        cancelClanInvitation(args.identifier, args.time, interaction.user.id);
    }
};
export default SlashCommand;
//# sourceMappingURL=main.js.map