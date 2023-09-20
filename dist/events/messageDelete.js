import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
let messageChannel = null;
export default new Event("messageDelete", async (message) => {
    if (message.system ||
        !message.author ||
        message.author.id === client.user.id ||
        (message.content?.length === 0 && message.attachments.size === 0 && message.stickers.size === 0) ||
        message.channelId === process.env.MESSAGES_CHANNEL_ID)
        return;
    const embed = new EmbedBuilder()
        .setColor(colors.error)
        .setAuthor({
        name: "Сообщение удалено",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086264381832179742/1984-icon-delete.png",
    })
        .setFooter({ text: `UId: ${message.author.id} | MsgId: ${message.id}` })
        .addFields([
        {
            name: "Автор",
            value: `<@${message.author.id}>`,
            inline: true,
        },
        {
            name: "Удалено в",
            value: message.channel.isDMBased() ? `В личных сообщениях` : `<#${message.channelId}>`,
            inline: true,
        },
    ]);
    if (message.content && message.content.length > 0) {
        embed.addFields({
            name: "Текст",
            value: `${message.content.length > 1024 ? "слишком длинное сообщение" : message.content}`,
        });
    }
    if (message.embeds.length > 0)
        embed.addFields([{ name: "Embed-вложения", value: `${message.embeds.length}` }]);
    if (message.attachments.size !== 0) {
        const arrayAttachment = [];
        message.attachments.forEach((msgAttachment) => arrayAttachment.push(msgAttachment.url));
        try {
            embed.setImage(arrayAttachment[0]);
        }
        catch (error) {
            console.error("[Error code: 2019] Failed to set a image for the embed", error, arrayAttachment[0]);
        }
        embed.addFields([
            {
                name: message.attachments.size === 1 ? "Вложение" : "Вложения",
                value: arrayAttachment.join("\n").toString() ?? "blank",
            },
        ]);
    }
    if (message.stickers.size !== 0) {
        const stickerArr = [];
        message.stickers.forEach((sticker) => stickerArr.push(sticker.name));
        embed.addFields([
            {
                name: stickerArr.length === 1 ? "Стикер" : "Стикеры",
                value: stickerArr.join("\n").toString() ?? "blank",
            },
        ]);
    }
    if (!messageChannel)
        messageChannel =
            client.getCachedTextChannel(process.env.MESSAGES_CHANNEL_ID) ||
                (await client.getAsyncTextChannel(process.env.MESSAGES_CHANNEL_ID));
    messageChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=messageDelete.js.map