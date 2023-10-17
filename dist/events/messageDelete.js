import { AuditLogEvent, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { uploadImageToImgur } from "../utils/general/uploadImageToImgur.js";
let messageChannel = null;
function isValidMessage(message) {
    if (message.system ||
        !message.author ||
        message.author.id === client.user.id ||
        (message.content?.length === 0 && message.attachments.size === 0 && message.stickers.size === 0) ||
        message.channelId === process.env.MESSAGES_CHANNEL_ID) {
        return false;
    }
    return true;
}
function createDeletedMessageEmbed(message) {
    return new EmbedBuilder()
        .setColor(colors.error)
        .setAuthor({
        name: "Сообщение удалено",
        iconURL: icons.delete,
    })
        .setFooter({ text: `UserId: ${message.author.id} | MessageId: ${message.id}` })
        .addFields({
        name: "Автор",
        value: `<@${message.author.id}>`,
        inline: true,
    }, {
        name: "Удалено в",
        value: message.channel.isDMBased() ? `В личных сообщениях` : `<#${message.channelId}>`,
        inline: true,
    });
}
async function getDeleterFromAuditLogs(message, embed) {
    if (!message.guild)
        return Promise.resolve();
    const auditLogs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MessageDelete,
    });
    const firstEntry = auditLogs.entries.first();
    if (!firstEntry) {
        console.error("[Error code: 2093] Failed to fetch audit logs for message delete event");
        return Promise.resolve();
    }
    const { executorId, targetId, extra } = firstEntry;
    if (targetId !== message.author.id || extra.channel.id !== message.channelId) {
        return;
    }
    const fieldObject = { name: "Удалил сообщение", value: "Сам пользователь", inline: true };
    if (executorId === targetId) {
        embed.addFields(fieldObject);
    }
    else {
        const deleter = await client.getMember(executorId);
        if (deleter) {
            fieldObject.value = `**${nameCleaner(deleter.displayName, true)}**`;
        }
        else {
            fieldObject.value = `<@${executorId}>`;
        }
        embed.spliceFields(2, 0, fieldObject);
    }
}
export default new Event("messageDelete", async (message) => {
    if (!isValidMessage(message))
        return;
    const embed = createDeletedMessageEmbed(message);
    let attachmentsPromise;
    let deleterPromise = getDeleterFromAuditLogs(message, embed);
    const embeds = [embed];
    if (message.content && message.content.length > 0) {
        embed.addFields({
            name: "Текст",
            value: `${message.content.length > 1024 ? "слишком длинное сообщение" : message.content}`,
        });
    }
    if (message.embeds.length > 0) {
        processEmbeds();
    }
    if (message.attachments.size > 0) {
        attachmentsPromise = processAttachments();
    }
    if (message.stickers.size !== 0) {
        processStickers();
    }
    if (!messageChannel)
        messageChannel = await client.getTextChannel(process.env.MESSAGES_CHANNEL_ID);
    await Promise.all([attachmentsPromise, deleterPromise]);
    messageChannel.send({ embeds });
    function processEmbeds() {
        let embedTitles = [];
        let embedAuthorFields = [];
        for (let embed of message.embeds) {
            if (embed.title) {
                embedTitles.push(embed.title);
            }
            if (embed.author && embed.author.name) {
                embedAuthorFields.push(embed.author.name);
            }
        }
        let valueField = "";
        if (embedTitles.length > 0) {
            valueField += `Заголовки: \`${embedTitles.join("`, `")}\``;
        }
        if (embedAuthorFields.length > 0) {
            valueField += `${embedTitles.length > 0 ? "\n" : ""}Поля автора: \`${embedAuthorFields.join("`, `")}\``;
        }
        embed.addFields({
            name: "Embed-вложения",
            value: valueField,
        });
    }
    async function processAttachments() {
        const arrayAttachment = [];
        const uploadPromises = message.attachments.map(async (msgAttachment) => {
            try {
                const imgurLink = await uploadImageToImgur(msgAttachment.url);
                arrayAttachment.push(imgurLink);
                if (arrayAttachment.length === 1) {
                    try {
                        embed.setImage(imgurLink);
                        if (message.attachments.size > 1) {
                            embed.setURL(message.url);
                        }
                    }
                    catch (error) {
                        console.error("[Error code: 2019] Failed to set a image for the embed", error, arrayAttachment[0]);
                    }
                }
                else {
                    try {
                        const newEmbed = new EmbedBuilder();
                        newEmbed.setURL(message.url);
                        newEmbed.setImage(imgurLink);
                        embeds.push(newEmbed);
                    }
                    catch (error) {
                        console.error("[Error code: 2090] Failed to add a new embed", error, imgurLink);
                    }
                }
            }
            catch (error) {
                console.error(`[Error code: 2091] Failed to upload the attachment to Imgur: ${msgAttachment.url}`, error);
            }
        });
        if (arrayAttachment.length > 0) {
            embed.addFields({
                name: message.attachments.size === 1 ? "Вложение" : "Вложения",
                value: arrayAttachment.join("\n") || "ссылки не найдены",
            });
        }
        await Promise.allSettled(uploadPromises);
    }
    function processStickers() {
        const stickerNamesArray = [];
        message.stickers.forEach((sticker) => stickerNamesArray.push(sticker.name));
        if (stickerNamesArray.length > 0) {
            embed.addFields({
                name: stickerNamesArray.length === 1 ? "Стикер" : "Стикеры",
                value: stickerNamesArray.join("\n") || "стикеры не найдены",
            });
        }
    }
});
//# sourceMappingURL=messageDelete.js.map