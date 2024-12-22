import {
	ButtonBuilder,
	ButtonStyle,
	Collection,
	EmbedBuilder,
	GuildMember,
	ModalBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputComponent,
	TextInputStyle,
} from "discord.js";
import { ClanJoinButtons, RegisterButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { addModalComponents } from "../utils/general/addModalComponents.js";

let clanLogChannel: TextChannel | null = null;

const ButtonCommand = new Button({
	name: "clanJoinEvent",
	run: async ({ client, interaction: buttonInteraction, modalSubmit }) => {
		if (buttonInteraction) {
			const modal = new ModalBuilder().setTitle("Форма вступления в клан").setCustomId(ClanJoinButtons.SubmitModal);

			const userName = new TextInputBuilder()
				.setLabel("Ваш ник в игре")
				.setRequired(false)
				.setStyle(TextInputStyle.Short)
				.setCustomId(ClanJoinButtons.modalUsername)
				.setMaxLength(1024);
			const userAge = new TextInputBuilder()
				.setLabel("Ваш возраст")
				.setStyle(TextInputStyle.Short)
				.setCustomId(ClanJoinButtons.modalAge)
				.setMinLength(1)
				.setMaxLength(2)
				.setRequired(false);
			const userMicrophone = new TextInputBuilder()
				.setLabel("Есть ли у вас микрофон")
				.setStyle(TextInputStyle.Short)
				.setCustomId(ClanJoinButtons.modalMicrophone)
				.setPlaceholder("Есть/нет")
				.setValue("Есть")
				.setRequired(false)
				.setMaxLength(50);
			const userPower = new TextInputBuilder()
				.setLabel("Максимальный уровень силы на персонаже")
				.setStyle(TextInputStyle.Short)
				.setCustomId(ClanJoinButtons.modalPowerlite)
				.setPlaceholder("с учетом артефакта")
				.setRequired(false)
				.setMaxLength(128);
			const additionalInfo = new TextInputBuilder()
				.setCustomId(ClanJoinButtons.modalUserInfo)
				.setLabel("Любая дополнительная информация о вас для нас")
				.setPlaceholder("по желанию")
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false)
				.setMaxLength(1024);

			modal.setComponents(addModalComponents(userName, userAge, userMicrophone, userPower, additionalInfo));

			await buttonInteraction.showModal(modal);
		} else if (modalSubmit) {
			const member = await client.getMember(modalSubmit.user.id);
			if (!member) throw { errorType: UserErrors.MEMBER_NOT_FOUND };

			const replyEmbed = new EmbedBuilder().setColor(colors.success).setTitle("Вы оставили заявку на вступление в клан");
			const components: ButtonBuilder[] = [];

			if (member.roles.cache.has(process.env.VERIFIED!)) {
				replyEmbed.setDescription(
					"Вы выполнили все условия для вступления - примите приглашение в игре и вы будете автоматически авторизованы на сервере"
				);
			} else {
				replyEmbed.setDescription(
					"Для вступления в клан вам остается зарегистрироваться у кланового бота введя команду </init:1157480626979610634>"
				);
				components.push(
					new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success)
				);
			}

			const replyPromise = modalSubmit.reply({ embeds: [replyEmbed], components: addButtonsToMessage(components), ephemeral: true });

			await Promise.allSettled([replyPromise, logFormFilling(member, modalSubmit.fields.fields)]);
		}
	},
});

async function logFormFilling(member: GuildMember, fields: Collection<string, TextInputComponent>) {
	const loggedEmbed = new EmbedBuilder().setColor(colors.deepBlue).setAuthor({
		name: `${member.displayName} заполнил форму на вступление в клан`,
		iconURL: member.displayAvatarURL(),
	});

	for (const [_, field] of fields) {
		if (!field.value) continue;
		loggedEmbed.addFields({ name: field.customId.split("_").pop() || "Заголовок не найден", value: field.value || "ничего не указано" });
	}

	if (!clanLogChannel) clanLogChannel = await client.getTextChannel(process.env.CLAN_CHANNEL_ID!);
	await clanLogChannel.send({ embeds: [loggedEmbed] });
}

export default ButtonCommand;
