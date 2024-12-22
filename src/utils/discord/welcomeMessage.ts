import { ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, RESTJSONErrorCodes } from "discord.js";
import { ClanButtons, RegisterButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { escapeString, pause } from "../general/utilities.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";

const guildId = process.env.GUILD_ID!;

const welcomeEmbed = new EmbedBuilder()
	.setColor(colors.invisible)
	.setTitle(" Приветствуем Вас на сервере ")
	.setDescription(
		`Вы зашли на сервер [клана Night 9](https://www.bungie.net/ru/ClanV2?groupid=${process.env
			.GROUP_ID!})\nСервер доступен для всех желающих вне зависимости от их клана`
	);
const clanJoinEmbed = new EmbedBuilder()
	.setColor(colors.invisible)
	.setTitle(" Я хочу вступить в клан ")
	.setDescription(
		`Для этого перейдите в канал <#${process.env.JOIN_REQUEST_CHANNEL_ID!}> и следуйте [инструкции](https://discord.com/channels/${process
			.env.GUILD_ID!}/${process.env.JOIN_REQUEST_CHANNEL_ID!}/${process.env.JOIN_REQUEST_GUIDE_MESSAGE_ID!})`
	);
const nonClanMemberEmbed = new EmbedBuilder()
	.setColor(colors.invisible)
	.setTitle(" Я хочу ознакомиться с сервером ")
	.setDescription(
		`Не проблема! Сервер доступен для всех - каждый может заходить во все [голосовые каналы](https://discord.com/channels/${guildId}/604967226755383300), [записываться и создавать наборы](https://discord.com/channels/${guildId}/677551388514844682), а также [писать в любом чате](https://discord.com/channels/${guildId}/959129358314922044)`
	);
const questionsEmbed = new EmbedBuilder()
	.setColor(colors.invisible)
	.setTitle(" У меня есть вопросы по клану/серверу ")
	.setDescription(
		`Вы можете задать их [в канале по вопросам](https://discord.com/channels/${guildId}/694119710677008425) или написав лично лидеру клана <@${process
			.env.OWNER_ID!}> ||(пишите даже если не в сети)||`
	);

const components = [
	new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
	new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
];

const clanJoinButton = [new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary)];

export default async function welcomeMessage(member: GuildMember) {
	member.roles.add(process.env.NEWBIE!).catch((err) => console.error("[Error code: 2031] Failed to add newbie role to member", err));

	const message = await member
		.send({
			embeds: [welcomeEmbed, clanJoinEmbed, nonClanMemberEmbed, questionsEmbed],
			components: addButtonsToMessage(components),
		})
		.catch((error) => {
			if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
				console.error(`[Error code: 1129] ${member.displayName} blocked DM from server members`);
			} else {
				console.error("[Error code: 1130]", error);
			}
		});

	if (!message) return;

	await pause(2500);

	const databaseData = await AuthData.findOne({
		where: { discordId: member.id },
		attributes: ["displayName", "membershipId"],
	});

	if (!databaseData) return;

	const bungieUrl = `[Bungie.net профиль](https://www.bungie.net/7/ru/User/Profile/254/${databaseData.membershipId})`;

	const registrationRestoredEmbed = new EmbedBuilder()
		.setColor(colors.invisible)
		.setTitle(" Регистрация восстановлена ")
		.setDescription(
			`Ранее Вы уже были на нашем сервере - все данные сохранены!\n\n\`${escapeString(databaseData.displayName)}\` - ${bungieUrl}`
		);

	const messagePromise =
		message.channel.isSendable() &&
		message.channel.send({
			embeds: [registrationRestoredEmbed],
		});

	const messageEditPromise = message.edit({
		components: addButtonsToMessage(clanJoinButton),
	});

	await Promise.all([messagePromise, messageEditPromise]);
}
