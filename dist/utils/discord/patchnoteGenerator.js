import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { PatchnoteButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { addButtonComponentsToMessage } from "../general/addButtonsToMessage.js";
import { descriptionFormatter } from "../general/utilities.js";
export async function generatePatchNotes(message) {
    const { member, channel } = message;
    if (!member)
        return console.error(`[Error code: 1111] ${message.author.id} not guildmember`);
    if (!member.permissions.has("Administrator"))
        return;
    let patchnoteMessage = descriptionFormatter(message.content);
    let embed;
    if (patchnoteMessage.endsWith("embed")) {
        patchnoteMessage = patchnoteMessage.slice(0, -5).trim();
        embed = new EmbedBuilder().setColor(colors.default).setDescription(patchnoteMessage || "nothing");
    }
    const components = [
        new ButtonBuilder().setCustomId(PatchnoteButtons.sendToGods).setStyle(ButtonStyle.Primary).setLabel("Опубликовать в премиум-чате"),
        new ButtonBuilder().setCustomId(PatchnoteButtons.sendToPublic).setStyle(ButtonStyle.Success).setLabel("Опубликовать для всех"),
        new ButtonBuilder().setCustomId(PatchnoteButtons.cancel).setStyle(ButtonStyle.Danger).setLabel("Отменить"),
    ];
    channel
        .send({
        embeds: embed ? [embed] : undefined,
        content: embed ? undefined : patchnoteMessage,
        components: await addButtonComponentsToMessage(components),
    })
        .then((_r) => {
        message.delete();
    });
}
