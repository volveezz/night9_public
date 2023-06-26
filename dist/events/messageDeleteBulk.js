import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import nameCleaner from "../utils/general/nameClearer.js";
const messageChannel = await client.getAsyncTextChannel(channelIds.messages);
const createFieldValue = (message) => {
    let fieldValue = "";
    if (message.partial) {
        fieldValue = "*неполное сообщение*";
    }
    else {
        const title = message.embeds?.[0]?.title;
        const authorName = message.embeds?.[0].author?.name;
        if (message.content.length > 0) {
            fieldValue = message.content.length > 1020 ? "*в сообщении слишком много текста*" : message.content;
        }
        else if (title || authorName) {
            fieldValue += `\n\`${title || authorName}\``;
        }
        else {
            fieldValue += "\n*в сообщении нет текста*";
        }
    }
    if (message.attachments.size > 0 && fieldValue.length < 990) {
        fieldValue += "\n*Прикрепленные файлы:*";
        message.attachments.forEach((attachment) => {
            if (fieldValue.length + attachment.name.length + attachment.url.length > 1020)
                return;
            fieldValue += `\n[${attachment.name}](${attachment.url})`;
        });
    }
    return fieldValue;
};
const getEmbedSize = (embed) => {
    let size = 0;
    size += embed.data.author?.name?.length || 0;
    size += embed.data.footer?.text?.length || 0;
    (embed.data.fields || []).forEach((field) => {
        size += field.name.length + field.value.length;
    });
    return size;
};
const getTotalEmbedsSize = (embeds) => {
    return embeds.reduce((totalSize, embed) => {
        return totalSize + getEmbedSize(embed);
    }, 0);
};
export default new Event("messageDeleteBulk", async (messages) => {
    const messagesArray = messages.reverse();
    const createNewEmbed = () => {
        return new EmbedBuilder().setColor(colors.error).setAuthor({
            name: "Группа сообщений удалена",
            iconURL: icons.delete,
        });
    };
    let embed = createNewEmbed();
    const embeds = [embed];
    for (let i = 0; i < messagesArray.size; i++) {
        const message = messagesArray.at(i);
        if (!message)
            continue;
        const displayName = nameCleaner(message.member?.displayName || "неизвестный пользователь", true);
        const memberId = message.member?.id;
        const fieldValue = createFieldValue(message);
        const fieldSize = `Сообщение ${displayName}`.length + fieldValue.length;
        if ((embed.data.fields || []).length >= 25 || getTotalEmbedsSize(embeds) + fieldSize > 6000) {
            if (embeds.length < 10) {
                embed = createNewEmbed();
                embeds.push(embed);
            }
            else {
                break;
            }
        }
        embed.addFields({
            name: `Сообщение ${displayName}`,
            value: fieldValue,
        });
    }
    const remainingMessages = messagesArray.size - embeds.reduce((acc, curr) => acc + (curr.data.fields || []).length, 0);
    if (remainingMessages > 0) {
        embed.setFooter({ text: `И ещё ${remainingMessages} сообщений` });
    }
    await messageChannel.send({ embeds: embeds });
});
