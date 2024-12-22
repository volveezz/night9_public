import { GroupMemberApplication, PlatformErrorCodes, SearchResultOfGroupMemberApplication } from "bungie-api-ts/groupv2";
import { ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder, InteractionResponse, Snowflake } from "discord.js";
import { ClanAdminInvitesButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import cancelClanInvitation from "../../utils/api/cancelClanInvitation.js";
import { sendApiRequest } from "../../utils/api/sendApiRequest.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { getAdminAccessToken } from "./main.js";

type ClanInvitesParams = {
	interaction: CommandInteraction;
	deferredReply: Promise<InteractionResponse<boolean>>;
};

function generateButtons(currentIndex: number = 0, maxIndex: number = 0) {
	return addButtonsToMessage([
		new ButtonBuilder()
			.setCustomId(ClanAdminInvitesButtons.previous)
			.setDisabled(currentIndex === 0 ? true : false)
			.setEmoji("⬅️")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(ClanAdminInvitesButtons.cancelInvite).setLabel("Отклонить приглашение").setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId(ClanAdminInvitesButtons.next)
			.setDisabled(currentIndex + 1 >= maxIndex ? true : false)
			.setEmoji("➡️")
			.setStyle(ButtonStyle.Secondary),
	]);
}

function generateMemberEmbed(memberData: GroupMemberApplication) {
	const { bungieNetUserInfo, destinyUserInfo } = memberData;
	const { membershipId, membershipType, iconPath } = bungieNetUserInfo;
	const { bungieGlobalDisplayName, bungieGlobalDisplayNameCode } = destinyUserInfo;

	const bungieName = `${bungieGlobalDisplayName}${bungieGlobalDisplayNameCode ? "#" + bungieGlobalDisplayNameCode : ""}`;

	const creationTime = Math.floor(new Date(memberData.creationDate).getTime() / 1000);
	const bungieNetUrl = `https://www.bungie.net/7/en/User/Profile/${membershipType}/${membershipId}`;

	const additionalInfo: string[] = [];

	if (memberData.requestMessage) {
		additionalInfo.push(`Request message: ${memberData.requestMessage}`);
	}
	if (memberData.resolveDate) {
		additionalInfo.push(`Resolve date: ${memberData.resolveDate}`);
	}
	if (memberData.resolveMessage) {
		additionalInfo.push(`Resolve message: ${memberData.resolveMessage}`);
	}
	additionalInfo.join("\n");

	const embed = new EmbedBuilder()
		.setAuthor({
			name: bungieName,
			iconURL: "https://www.bungie.net" + (iconPath || memberData.destinyUserInfo.iconPath),
			url: bungieNetUrl,
		})
		.setColor(colors.default)
		.addFields([
			{
				name: "Информация об игроке",
				value: `Дата подачи заявки: <t:${creationTime}>, <t:${creationTime}:R>${
					additionalInfo.length > 0 ? `\n${additionalInfo}` : ""
				}`,
			},
		]);

	return [embed];
}

function generateMessageData(member: GroupMemberApplication, lowIndex: number = 0, maxIndex: number = 0) {
	if (!member) {
		return {
			embeds: [
				new EmbedBuilder().setColor(colors.deepBlue).setAuthor({ name: "В клане нет ожидающих приглашений", iconURL: icons.notify }),
			],
		};
	}
	return { embeds: generateMemberEmbed(member), components: generateButtons(lowIndex, maxIndex) };
}

async function requestClanInviteCancel(member: GroupMemberApplication, requestedBy: Snowflake) {
	const { membershipId, membershipType } = member.destinyUserInfo;
	const request = await cancelClanInvitation({ bungieId: membershipId, platform: membershipType, requestedBy });

	return request.ErrorCode;
}

const API_URL = `/Platform/GroupV2/${process.env.GROUP_ID!}/Members/InvitedIndividuals/`;

async function clanInvites({ deferredReply, interaction }: ClanInvitesParams) {
	const authToken = await getAdminAccessToken(interaction.user.id);

	const { results } = await sendApiRequest<SearchResultOfGroupMemberApplication>(API_URL, authToken);

	let currentInviteIndex = 0;
	let maxInviteIndex = results.length;

	const messageData = generateMessageData(results[currentInviteIndex], currentInviteIndex, maxInviteIndex);

	await deferredReply;
	const reply = await interaction.editReply(messageData);

	if (!results || results.length === 0) return;

	const collector = reply.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: (i) => i.user.id === interaction.user.id,
		time: 60 * 1000 * 60,
		idle: 60 * 1000 * 5,
	});

	collector.on("collect", async (collected) => {
		collected.deferUpdate();

		const { customId } = collected;
		switch (customId) {
			case ClanAdminInvitesButtons.previous:
				currentInviteIndex = currentInviteIndex - 1;
				await interaction.editReply(generateMessageData(results[currentInviteIndex], currentInviteIndex, maxInviteIndex));
				break;
			case ClanAdminInvitesButtons.next:
				currentInviteIndex = currentInviteIndex + 1;
				await interaction.editReply(generateMessageData(results[currentInviteIndex], currentInviteIndex, maxInviteIndex));
				break;
			case ClanAdminInvitesButtons.cancelInvite: {
				const inviteCancellationStatus = await requestClanInviteCancel(results[currentInviteIndex], interaction.user.id);

				if (inviteCancellationStatus === PlatformErrorCodes.Success) {
					results.splice(currentInviteIndex, 1);

					if (results.length === 0) {
						collector.stop("allInvitesManaged");
						return;
					}

					if (currentInviteIndex >= 1) currentInviteIndex = currentInviteIndex - 1;

					maxInviteIndex = results.length;

					const messageParam = generateMessageData(results[currentInviteIndex], currentInviteIndex, maxInviteIndex);

					await interaction.editReply(messageParam);
				}
				break;
			}

			default:
				interaction.editReply({ embeds: [], components: [], content: "Unknown button reply" });
				break;
		}
	});
	collector.on("end", (_, reason) => {
		const embed = new EmbedBuilder()
			.setColor(colors.invisible)
			.setAuthor({ name: reason === "allInvitesManaged" ? "Все приглашения обработаны" : "Истек срок действия команды" });
		interaction.editReply({ embeds: [embed], components: [] });
		return;
	});
}

export default clanInvites;
