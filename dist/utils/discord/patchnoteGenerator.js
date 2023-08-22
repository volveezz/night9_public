import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { descriptionFormatter } from "../general/utilities.js";
export async function generatePatchNotes(message) {
    const { member, channel } = message;
    if (!member) {
        console.error(`[Error code: 1111] ${message.author.id} not guildmember`);
        return;
    }
    if (!member.permissions.has("Administrator"))
        return;
    let patchnoteMessage = descriptionFormatter(message.content);
    let embed;
    if (patchnoteMessage.endsWith("embed")) {
        patchnoteMessage = patchnoteMessage.slice(0, -5).trim();
        embed = new EmbedBuilder().setColor(colors.default).setDescription(patchnoteMessage || "nothing");
    }
    if (!embed && patchnoteMessage.length > 2000) {
        throw new Error("Патчноут слишком длинный");
    }
    const components = [
        new ButtonBuilder().setCustomId("patchnoteEvent_sendToGods").setStyle(ButtonStyle.Primary).setLabel("Опубликовать в премиум-чате"),
        new ButtonBuilder().setCustomId("patchnoteEvent_sendToPublic").setStyle(ButtonStyle.Success).setLabel("Опубликовать для всех"),
        new ButtonBuilder().setCustomId("patchnoteEvent_cancel").setStyle(ButtonStyle.Danger).setLabel("Отменить"),
    ];
    channel
        .send({
        embeds: embed ? [embed] : undefined,
        content: embed ? undefined : patchnoteMessage,
        components: addButtonsToMessage(components),
    })
        .then((_r) => {
        message.delete();
    });
}
//# sourceMappingURL=patchnoteGenerator.js.map