import { GroupMember, PlatformErrorCodes, SearchResultOfGroupMember } from "bungie-api-ts/groupv2";
import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder, GuildMember, InteractionResponse } from "discord.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { ClanList } from "../../interfaces/Clan.js";
import { Command } from "../../structures/command.js";
import { sendApiPostRequest } from "../../utils/api/sendApiPostRequest.js";
import { sendApiRequest } from "../../utils/api/sendApiRequest.js";
import { setupClanInviteCancellation } from "../../utils/api/setupClanInviteCancellation.js";
import { parseIdentifierString } from "../../utils/general/utilities.js";
import { AuthData } from "../../utils/persistence/sequelizeModels/authData.js";
import { UserActivityData } from "../../utils/persistence/sequelizeModels/userActivityData.js";
import clanInvites from "./clanInvites.js";
import { handleManagementClanAction } from "./management.js";

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
		} else {
			const member = interaction.member instanceof GuildMember ? interaction.member : await client.getMember(interaction.user.id);
			if (!member || !member.permissions.has("Administrator")) {
				throw { errorType: UserErrors.MISSING_PERMISSIONS };
			}
		}

		const deferredReply = interaction.deferReply({ ephemeral: true });

		try {
			switch (subCommand) {
				case "management":
					await handleManagementClanAction(interaction, await getMergedMembers(), deferredReply);
					break;
				case "invite":
					const options = { identifier: args.getString("identifier", true), time: args.getInteger("time") };
					await sendInviteToClan(interaction, deferredReply, options);
					break;
				case "invites":
					clanInvites({ deferredReply, interaction });
					break;
			}
		} catch (error) {
			console.error("[Error code: 1906] Error catched", error);
		}
	},
});

const buildMemberData = (clanMember: GroupMember, authData: AuthData | undefined): ClanList => {
	const displayName =
		clanMember.bungieNetUserInfo?.supplementalDisplayName ||
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

const sortMembers = (a: any, b: any) => {
	return a.isOnline === b.isOnline ? b.lastOnlineStatusChange - a.lastOnlineStatusChange : a.isOnline ? -1 : 1;
};

const getMergedMembers = async () => {
	// Fetch the clan roster from the API
	const destinyRequest = await sendApiRequest<SearchResultOfGroupMember>(
		`/Platform/GroupV2/${process.env.GROUP_ID!}/Members/?memberType=None`
	);
	const destinyMembers = destinyRequest.results;

	// Fetch all users from the AuthData table including UserActivityData
	const clanMembers: AuthData[] = await AuthData.findAll({
		where: { clan: true },
		include: [UserActivityData],
		attributes: ["discordId", "bungieId", "platform", "displayName"],
	});

	// Merge and sort members
	return destinyMembers
		.map((clanMember) => {
			const authData = clanMembers.find((member) => member.bungieId === clanMember.destinyUserInfo.membershipId);
			return buildMemberData(clanMember, authData);
		})
		.sort(sortMembers);
};

const handleRoster = async (interaction: CommandInteraction) => {
	const deferredReply = interaction.deferReply({ ephemeral: true });
	const mergedMembers = await getMergedMembers();

	// Create embeds and send them
	const embeds = createRosterEmbeds(mergedMembers);
	for (let i = 0; i < embeds.length; i++) {
		const embed = embeds[i];
		if (i === 0) {
			await deferredReply;
			await interaction.editReply({ embeds: [embed] });
		} else {
			await interaction.followUp({ embeds: [embed], ephemeral: true });
		}
	}
};

const createRosterEmbeds = (users: ClanList[]) => {
	const embeds = [];
	let fields = [];

	for (const [index, user] of users.entries()) {
		// Finding the corresponding member data in destinyRequest

		const joinDate = user.joinDate !== 0 ? `<t:${Math.floor(new Date(user.joinDate).getTime())}>` : "N/A";
		const lastOnline = user.lastOnlineStatusChange !== 0 ? `<t:${user.lastOnlineStatusChange}>` : "N/A";

		// Construct the field content
		const fieldContent = [
			`[🔗](https://www.bungie.net/en/Profile/${user.platform}/${user.bungieId})`,
			user.isOnline ? `🟢` : `🔴${lastOnline}`,
			` | 📅${joinDate}`,
		];

		if (user.UserActivityData) {
			fieldContent.push(
				`| 🎙️${user.UserActivityData.voice}s | 💬${user.UserActivityData.messages} | ${user.UserActivityData.dungeons}/${user.UserActivityData.raids}`
			);
		}

		fields.push({ name: `${index + 1}. ${user.displayName}`, value: fieldContent.join(" ") });

		// Check if the embed has reached the maximum number of fields
		if (fields.length === 25) {
			const embed = new EmbedBuilder().setColor(colors.default).addFields(fields);
			embeds.push(embed);
			fields = [];
		}
	}

	// Push the last embed if it has fields
	if (fields.length > 0) {
		const embed = new EmbedBuilder().setColor(colors.default).addFields(fields);
		embeds.push(embed);
	}

	return embeds;
};

// const adminAccessTokens = new Map<string, string>();

export const getAdminAccessToken = async (interaction: CommandInteraction | string) => {
	// console.debug("Admin access token was requested");
	const discordId = typeof interaction === "string" ? interaction : interaction.user.id;
	// if (adminAccessTokens.has(discordId)) return adminAccessTokens.get(discordId);

	const adminAuthData = await AuthData.findOne({ where: { discordId: discordId }, attributes: ["accessToken"] });

	if (adminAuthData && adminAuthData.accessToken) {
		// adminAccessTokens.set(discordId, adminAuthData.accessToken);
		return adminAuthData.accessToken;
	} else if (typeof interaction !== "string") {
		const embed = new EmbedBuilder()
			.setColor(colors.error)
			.setAuthor({ name: "Ошибка. Не найден токен авторизации", iconURL: icons.error });
		interaction.followUp({ embeds: [embed], ephemeral: true });
		return undefined;
	}
};

// INVITE
const sendInviteToClan = async (
	interaction: CommandInteraction,
	deferredReply: Promise<InteractionResponse>,
	args: { identifier: string; time: number | null }
) => {
	const clanErrorsHandler = (errorCode: PlatformErrorCodes) => {
		const embed = new EmbedBuilder();
		switch (errorCode) {
			case PlatformErrorCodes.Success:
				return embed.setColor(colors.success).setAuthor({ name: "Пользователь был приглашен в клан", iconURL: icons.success });
			case PlatformErrorCodes.ClanInviteAlreadyMember:
				return embed.setColor(colors.success).setAuthor({ name: "Пользователь уже в клане", iconURL: icons.success });
			case PlatformErrorCodes.ClanMaximumMembershipReached:
				return embed.setColor(colors.error).setAuthor({ name: "Ошибка. Клан полон. В никого нельзя пригласить", iconURL: icons.error });

			default:
				return embed.setColor(colors.error).setAuthor({
					name: `Произошла неизвестная ошибка ${errorCode ?? PlatformErrorCodes.UnhandledException}`,
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
		apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID!}/Members/IndividualInvite/${platform}/${bungieId}/`,
		accessToken: accessToken,
		requestData: {
			message: "Приглашение в клан Night 9",
		},
		returnResponse: false,
	});

	if (!invitePost || !invitePost.ErrorCode) {
		console.error("[Error code: 1909]", invitePost);
	}

	const embed = clanErrorsHandler(invitePost.ErrorCode);

	await deferredReply;
	await interaction.editReply({ embeds: [embed] });

	if (invitePost?.ErrorCode === PlatformErrorCodes.Success && args.time && args.time > 0) {
		setupClanInviteCancellation(args.identifier, args.time, interaction.user.id);
	}
};

export default SlashCommand;
