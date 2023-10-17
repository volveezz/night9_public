import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { uploadImageToImgur } from "../general/uploadImageToImgur.js";
import { escapeString } from "../general/utilities.js";
let dmChannel = null;
export async function sendAdminNotification(message) {
    let embeds = [await buildBaseEmbed(message)];
    embeds = await processAttachments(message, embeds[0]);
    const primaryEmbed = embeds[0];
    if (message.cleanContent.length > 0) {
        primaryEmbed.setDescription(escapeString(message.cleanContent));
    }
    addNonImageAttachments(primaryEmbed, message);
    addStickers(primaryEmbed, message);
    const buttons = buildButtons();
    if (!dmChannel)
        dmChannel = await client.getTextChannel(process.env.DIRECT_MESSAGES_CHANNEL_ID);
    await dmChannel.send({
        embeds,
        components: addButtonsToMessage(buttons),
    });
}
async function buildBaseEmbed(message) {
    const member = await client.getMember(message.author.id);
    return new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Получено новое сообщение")
        .setAuthor({
        name: `Отправитель: ${member.displayName}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: message.author.displayAvatarURL(),
    })
        .setFooter({ text: `UId: ${message.author.id} | MId: ${message.id}` });
}
function buildButtons() {
    return [new ButtonBuilder().setCustomId("adminDirectMessageButton_reply").setLabel("Reply").setStyle(ButtonStyle.Success)];
}
async function processAttachments(message, primaryEmbed) {
    const embeds = [primaryEmbed];
    const arrayAttachment = [];
    for (const msgAttachment of message.attachments.values()) {
        try {
            const imgurLink = await uploadImageToImgur(msgAttachment.url);
            arrayAttachment.push(imgurLink);
            if (arrayAttachment.length === 1) {
                primaryEmbed.setImage(imgurLink);
                if (message.attachments.size > 1) {
                    primaryEmbed.setURL(message.url);
                }
            }
            else {
                const additionalEmbed = new EmbedBuilder().setImage(imgurLink).setURL(message.url);
                embeds.push(additionalEmbed);
            }
        }
        catch (error) {
            console.error(`[Error code: 2091] Failed to upload the attachment to Imgur: ${msgAttachment.url}`, error);
        }
    }
    return embeds;
}
function addNonImageAttachments(embed, message) {
    if (message.attachments.size > 0) {
        const nonImageAttachments = message.attachments
            .filter((att) => !att.contentType?.startsWith("image/"))
            .map((att) => att.url)
            .join(", ");
        if (nonImageAttachments.length > 0) {
            embed.addFields({
                name: "Вложения",
                value: nonImageAttachments,
            });
        }
    }
}
function addStickers(embed, message) {
    if (message.stickers.size > 0) {
        embed.addFields({
            name: "Стикеры",
            value: message.stickers.map((sticker) => `${sticker.name}:${sticker.description}`).join("\n"),
        });
    }
}
//# sourceMappingURL=dmHandler.js.map