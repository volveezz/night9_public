import { EmbedBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const messageChannel = client.channels.cache.get(ids.messagesChnId);
export default new Event("messageDelete", (message) => {
    if (message.system ||
        message.author?.id === client.user.id ||
        (message.content?.length === 0 && message.attachments.size === 0 && message.stickers.size === 0) ||
        !message.author ||
        message.channelId === ids.messagesChnId)
        return;
    const embed = new EmbedBuilder()
        .setColor("DarkRed")
        .setAuthor({ name: "Сообщение удалено" })
        .setFooter({ text: `MsgId: ${message.id}` })
        .setTimestamp()
        .addFields([
        {
            name: "Автор",
            value: `<@${message.author.id}> (${message.author.id})`,
            inline: true,
        },
        {
            name: "Удалено в",
            value: `<#${message.channelId}>`,
            inline: true,
        },
    ]);
    if (message.content?.length > 0)
        embed.addFields([
            {
                name: "Текст",
                value: `\`${message.content?.length > 1000 ? "слишком длинное сообщение" : message.content}\``,
            },
        ]);
    if (message.embeds.length > 0)
        embed.addFields([{ name: "Embed-вложения", value: `\`${message.embeds.length}\`` }]);
    if (message.attachments.size !== 0) {
        const arrayAttachment = [];
        message.attachments.forEach((msgAttachment) => arrayAttachment.push(msgAttachment.url));
        embed.addFields([
            {
                name: message.attachments.size === 1 ? "Вложение" : "Вложения",
                value: arrayAttachment.join(`\n`).toString() ?? "blank",
            },
        ]);
    }
    if (message.stickers.size !== 0) {
        const stickerArr = [];
        message.stickers.forEach((sticker) => stickerArr.push(sticker.name));
        embed.addFields([
            {
                name: stickerArr.length === 1 ? "Стикер" : "Стикеры",
                value: stickerArr.join(`\n`).toString() ?? "blank",
            },
        ]);
    }
    messageChannel.send({ embeds: [embed] });
});
