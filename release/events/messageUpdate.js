import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { escapeString } from "../functions/utilities.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const messageChannel = client.getCachedTextChannel(ids.messagesChnId);
export default new Event("messageUpdate", (oldMessage, newMessage) => {
    if (!oldMessage.content?.length || oldMessage.content === newMessage.content)
        return;
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setAuthor({
        name: "Сообщение изменено",
        url: `https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id}`,
    })
        .setDescription(`<@${newMessage.author.id}> изменил сообщение в <#${newMessage.channelId}>`);
    oldMessage.content.length <= 1020 && newMessage.content && newMessage.content.length <= 1020
        ? embed.addFields([
            {
                name: "До изменения",
                value: oldMessage.content.length <= 0 ? "сообщение не было в кеше" : escapeString(oldMessage.content),
            },
            { name: "После", value: escapeString(newMessage.content) },
        ])
        : embed.addFields({ name: "⁣", value: "Текст сообщения слишком длинный" });
    messageChannel.send({ embeds: [embed] });
});
