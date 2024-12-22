import { ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from "discord.js";
import { PatchnoteButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { descriptionFormatter } from "../general/utilities.js";

export async function generatePatchNotes(message: Message) {
	const { member, channel } = message;

	if (!member) {
		console.error(`[Error code: 1111] ${message.author.id} not guildmember`);
		return;
	}
	if (!member.permissions.has("Administrator")) return;

	let patchnoteMessage = descriptionFormatter(message.content);
	let embed: EmbedBuilder | undefined;

	if (patchnoteMessage.endsWith("embed")) {
		patchnoteMessage = patchnoteMessage.slice(0, -5).trim();
		embed = new EmbedBuilder().setColor(colors.default).setDescription(patchnoteMessage || "nothing");
	}

	if (!embed && patchnoteMessage.length > 2000) {
		throw new Error("Патчноут слишком длинный");
	}

	const components = [
		new ButtonBuilder().setCustomId(PatchnoteButtons.sendToGods).setStyle(ButtonStyle.Primary).setLabel("Отправить в премиум-чат"),
		new ButtonBuilder()
			.setCustomId(PatchnoteButtons.sendToGodsWithoutButtons)
			.setStyle(ButtonStyle.Secondary)
			.setLabel("Отправить в премиум чат (без кнопок)"),
		new ButtonBuilder().setCustomId(PatchnoteButtons.sendToPublic).setStyle(ButtonStyle.Success).setLabel("Отправить для всех"),
		new ButtonBuilder().setCustomId(PatchnoteButtons.cancel).setStyle(ButtonStyle.Danger).setLabel("Отменить"),
	];

	(channel as TextChannel)
		.send({
			embeds: embed ? [embed] : undefined,
			content: embed ? undefined : patchnoteMessage,
			components: addButtonsToMessage(components),
		})
		.then((_r) => {
			message.delete();
		});
}
