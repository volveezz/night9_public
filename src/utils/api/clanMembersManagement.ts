import { BungieMembershipType, PlatformErrorCodes } from "bungie-api-ts/common.js";
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { getAdminAccessToken } from "../../commands/clan/main.js";
import { ClanButtons, ClanSystemButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { DiscordClanMember } from "../../interfaces/Clan.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import getClanMemberData from "./getClanMemberData.js";
import kickClanMember from "./kickClanMember.js";

type KickMemberParams = {
	bungieId: string;
	platform: BungieMembershipType;
};

async function kickMemberFromClan(id: KickMemberParams, interaction: ButtonInteraction) {
	const memberData = await getClanMemberData(id);

	if (!memberData || (!memberData.bungieId && !memberData.member)) {
		throw { name: "Ошибка. Пользователь не найден" };
	}

	if (!memberData.group || memberData.group.groupId !== process.env.GROUP_ID!) {
		throw {
			name: "Ошибка. Пользователь уже не в клане",
			...(memberData.group != null ? { description: `Пользователь в клане: ${memberData.group.name}` } : {}),
		};
	}

	const memberDisplayName =
		memberData.displayName ||
		memberData.member?.destinyUserInfo.bungieGlobalDisplayName ||
		memberData.member?.destinyUserInfo.LastSeenDisplayName ||
		memberData.member?.destinyUserInfo.displayName;

	const embed = new EmbedBuilder().setColor(colors.warning).setAuthor({
		name: `Подтвердите исключение ${memberDisplayName} из клана`,
		iconURL: icons.warning,
	});
	const components = [
		new ButtonBuilder().setCustomId(ClanSystemButtons.confirmKick).setLabel("Подтвердить").setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId(ClanSystemButtons.cancelKick).setLabel("Отменить").setStyle(ButtonStyle.Secondary),
	];

	const confirmationMessage = await interaction.editReply({ embeds: [embed], components: addButtonsToMessage(components) });

	const collector = confirmationMessage.createMessageComponentCollector({
		filter: (i) => i.user.id === interaction.user.id,
		max: 1,
		time: 1000 * 60 * 5,
		componentType: ComponentType.Button,
	});

	const adminAccessToken = await getAdminAccessToken(interaction.user.id);

	if (!adminAccessToken) {
		throw { name: "Ошибка. Ваш токен авторизации не найден" };
	}

	collector.on("collect", async (collected) => {
		const { customId } = collected;

		switch (customId) {
			case ClanSystemButtons.confirmKick: {
				const deferredReply = collected.deferReply({ ephemeral: true });
				const errorCode = await kickClanMember(
					(memberData.platform || memberData.member?.destinyUserInfo.membershipType)!,
					(memberData.bungieId || memberData.member?.destinyUserInfo.membershipId)!,
					adminAccessToken
				);

				let embed = new EmbedBuilder();

				if (errorCode === PlatformErrorCodes.Success) {
					embed.setColor(colors.success).setAuthor({ name: `${memberDisplayName} был исключен`, iconURL: icons.success });
					notifyUserAboutBeingKicked(memberData);
				} else {
					embed
						.setColor(colors.error)
						.setAuthor({ name: `Произошла ошибка во время исключения ${memberDisplayName}`, iconURL: icons.error });
				}

				await deferredReply;
				collected.editReply({ embeds: [embed] });

				return;
			}
			case ClanSystemButtons.cancelKick: {
				await collected.deferUpdate();
				return;
			}
		}
	});
	collector.on("end", async () => await interaction.deleteReply());

	return memberData;
}

async function notifyUserAboutBeingKicked(memberData: DiscordClanMember) {
	if (!memberData.discordId) {
		console.error("[Error code: 2099] Discord id wasn't passed into the notify function");
		return;
	}

	const member = await client.getMember(memberData.discordId);

	if (!member) {
		console.error(
			"[Error code: 2098] Member not found during his notification about being kicked",
			memberData.member,
			memberData.discordId
		);
		return;
	}

	const guild = await client.getGuild(member.guild);

	const clanReturnalChannelId = process.env.CLAN_RETURNAL!;
	const ownerId = process.env.OWNER_ID!;

	const clanURL = `https://www.bungie.net/7/ru/Clan/Profile/${process.env.GROUP_ID!}`;

	const embed = new EmbedBuilder()
		.setColor(colors.kicked)
		.setAuthor({
			name: "Уведомление об исключении из клана",
			iconURL: guild.iconURL() || icons.error,
			url: clanURL,
		})
		.setDescription(
			`Вы были исключены из клана [Night 9](${clanURL}) в Destiny 2.\nПричина исключения: низкий актив в клане или его отсутствие.\n\nЕсли вы вернетесь в игру, клан готов принять вас снова.\nВступление в клан для исключенных доступно в <#${clanReturnalChannelId}> или по кнопке ниже.\n\nПомните: даже после исключения из клана, у Вас сохраняется доступ к большинству возможностей сервера. Вы всё ещё можете записываться на рейды, общаться в каналах и так далее.\n\nЕсли у вас есть вопросы, обратитесь к <@${ownerId}>.`
		);

	const components = addButtonsToMessage([
		new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Отправить себе приглашение в клан"),
	]);

	member.send({ embeds: [embed], components });
}

export default kickMemberFromClan;
