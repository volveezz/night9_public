import { ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, GuildMember } from "discord.js";
import { AdminDMChannelButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";

export async function sendDmLogMessage(member: GuildMember, text: string | null, id: string, interaction?: ButtonInteraction) {
	const dmLogChannel = interaction ? null : client.getCachedTextChannel(process.env.DIRECT_MESSAGES_CHANNEL_ID!);
	const embed = new EmbedBuilder()
		.setColor(colors.success)
		.setTitle("Отправлено сообщение")
		.setAuthor({
			name: `Отправлено: ${member.displayName || member.user.username}${
				member.user.username !== member.displayName ? ` (${member.user.username})` : ""
			}`,
			iconURL: member.displayAvatarURL(),
		})
		.setDescription(text || "nothing")
		.setFooter({ text: `UId: ${member.id} | MId: ${id}` });

	const components = [
		new ButtonBuilder().setCustomId(AdminDMChannelButtons.reply).setLabel("Ответить").setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId(AdminDMChannelButtons.delete).setLabel("Удалить сообщение").setStyle(ButtonStyle.Danger),
	];
	const messageOptions = {
		embeds: [embed],
		components: addButtonsToMessage(components),
	};
	interaction ? interaction.editReply(messageOptions) : dmLogChannel!.send(messageOptions);
}
