import { PlatformErrorCodes, ServerResponse } from "bungie-api-ts/common.js";
import { RuntimeGroupMemberType } from "bungie-api-ts/groupv2";
import {
	APIEmbedField,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	EmbedBuilder,
	InteractionResponse,
} from "discord.js";
import { ClanManagementButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { ClanList } from "../../interfaces/Clan.js";
import kickMemberFromClan from "../../utils/api/clanMembersManagement.js";
import { sendApiPostRequest } from "../../utils/api/sendApiPostRequest.js";
import createErrorEmbed from "../../utils/errorHandling/createErrorEmbed.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { convertSeconds } from "../../utils/general/convertSeconds.js";
import { getAdminAccessToken } from "./main.js";

const CustomRuntimeGroupMemberType = {
	0: "Не в клане",
	1: "Новичок",
	2: "Участник",
	3: "Админ",
	4: "Действующий основатель",
	5: "Основатель",
} as const;

function getRuntimeGroupMemberTypeName(value: RuntimeGroupMemberType): string {
	return CustomRuntimeGroupMemberType[value];
}

export async function handleManagementClanAction(
	interaction: CommandInteraction,
	clanMembers: ClanList[],
	deferredReply: Promise<InteractionResponse>
) {
	let index = clanMembers.length - 1;
	let userData = clanMembers[index];

	const makeNewEmbed = async () => {
		userData = clanMembers[index];

		const member = userData.discordId ? client.getCachedMembers().get(userData.discordId) : undefined;

		const embed = new EmbedBuilder().setColor(member ? colors.default : colors.kicked).setAuthor(
			member
				? {
						name: `${member.displayName} - ${userData.displayName}`,
						iconURL: member.displayAvatarURL(),
						url: `https://www.bungie.net/en/Profile/${userData.platform}/${userData.bungieId}`,
				  }
				: {
						name: userData.displayName,
						iconURL: icons.error,
						url: `https://www.bungie.net/en/Profile/${userData.platform}/${userData.bungieId}`,
				  }
		);

		const fields: APIEmbedField[] = [];

		const joinDate = userData && userData.joinDate !== 0 ? `<t:${userData.joinDate}>` : "N/A";
		const lastOnline = userData && userData.lastOnlineStatusChange !== 0 ? `<t:${userData.lastOnlineStatusChange}>` : "N/A";
		const isOnline = userData ? userData.isOnline : false;

		const onlineText = isOnline ? `🟢 в игре` : `🔴 ${lastOnline}`;
		const dataText = `${userData.rank !== 0 ? `Вступил в клан: ${joinDate}` : ""}\nРанг: ${getRuntimeGroupMemberTypeName(userData.rank)}`;
		const userMention = member ? `<@${member.id}>` : "Не на сервере";

		fields.push({
			name: "Статистика в клане",
			value: `Онлайн: ${onlineText}\n${dataText}\n${userMention}`,
		});

		if (userData.UserActivityData) {
			fields.push({
				name: "Статистика на сервере",
				value: `В голосе: ${convertSeconds(userData.UserActivityData.voice)}\nСообщений: ${
					userData.UserActivityData.messages
				}\nРейдов/данжей: ${userData.UserActivityData.dungeons}/${userData.UserActivityData.raids}`,
			});
		} else {
			fields.push({
				name: "Статистика на сервере",
				value: "Нет данных",
			});
		}

		embed.addFields(fields);

		return embed;
	};
	const makeButtons = () => {
		const buttons = [
			new ButtonBuilder()
				.setCustomId(ClanManagementButtons.previous)
				.setDisabled(index === 0 ? true : false)
				.setEmoji("⬅️")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(ClanManagementButtons.demote)
				.setDisabled(userData.rank <= 1 || userData.rank > 3 ? true : false)
				.setLabel("Понизить")
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId(ClanManagementButtons.promote)
				.setDisabled(userData.rank > 2 || userData.rank === 0 ? true : false)
				.setLabel("Повысить")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(ClanManagementButtons.kick)
				.setDisabled(userData.rank === 0 || userData.rank > 3 ? true : false)
				.setLabel("Исключить")
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId(ClanManagementButtons.next)
				.setDisabled(index === clanMembers.length - 1 ? true : false)
				.setEmoji("➡️")
				.setStyle(ButtonStyle.Secondary),
		];

		return buttons;
	};

	const setUserRank = async (rank: RuntimeGroupMemberType) => {
		return await sendApiPostRequest({
			apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID!}/Members/${userData.platform}/${
				userData.bungieId
			}/SetMembershipType/${rank}/`,
			accessToken: await getAdminAccessToken(interaction),
			returnResponse: false,
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

		if (response.ErrorCode === PlatformErrorCodes.Success) {
			embed.setColor(colors.success).setAuthor({ name: "Пользователь был понижен", iconURL: icons.success });
			userData.rank = userRank - 1;
			clanMembers[index] = userData;
			updateMessage(true);
		} else {
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

		const response: ServerResponse<any> = await setUserRank(userRank + 1);

		let embed = new EmbedBuilder();

		if (response.ErrorCode === PlatformErrorCodes.Success) {
			embed.setColor(colors.success).setAuthor({ name: "Пользователь был повышен", iconURL: icons.success });
			userData.rank = userRank + 1;
			clanMembers[index] = userData;
			updateMessage(true);
		} else {
			embed.setColor(colors.error).setAuthor({ name: "Произошла ошибка во время повышения", iconURL: icons.error });
			console.error("[Error code: 1903]", response);
		}
		return interaction.followUp({ embeds: [embed], ephemeral: true });
	};
	const kickUser = async (i: ButtonInteraction) => {
		userData.rank = RuntimeGroupMemberType.None;
		await kickMemberFromClan(userData, i);
	};

	const updateMessage = async (fromCollector: boolean = false) => {
		const messageData = {
			embeds: [await makeNewEmbed()],
			components: addButtonsToMessage(makeButtons()),
			...(fromCollector ? {} : { ephemeral: true }),
		};

		if (fromCollector) {
			await interaction.editReply(messageData);
		} else {
			return messageData;
		}
	};

	await deferredReply;
	const messageOptions = (await updateMessage())!;
	const message = await interaction.editReply(messageOptions);

	const collector = message.createMessageComponentCollector({
		filter: (i) => i.user.id === interaction.user.id,
		idle: 1000 * 60 * 5,
		componentType: ComponentType.Button,
	});

	collector.on("collect", async (i) => {
		const deferredReply = i.customId === ClanManagementButtons.kick ? i.deferReply({ ephemeral: true }) : i.deferUpdate();
		try {
			switch (i.customId) {
				case ClanManagementButtons.previous:
					index = index === 0 ? index : index - 1;
					await updateMessage(true);
					break;
				case ClanManagementButtons.next:
					index = index === clanMembers.length - 1 ? index : index + 1;
					await updateMessage(true);
					break;
				case ClanManagementButtons.demote:
					await demoteUser();
					break;
				case ClanManagementButtons.promote:
					await promoteUser();
					break;
				case ClanManagementButtons.kick:
					await deferredReply;
					await kickUser(i);
					break;

				default:
					break;
			}
		} catch (error: any) {
			console.error("[Error code: 1904]", error);
			const messageData = createErrorEmbed(error);
			await deferredReply;
			await i.followUp({ ...messageData, ephemeral: true });
		}
	});

	collector.on("end", () => interaction.deleteReply());
}
