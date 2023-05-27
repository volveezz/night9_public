import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import { escapeString } from "../utils/general/utilities.js";
const messageChannel = client.getCachedTextChannel(channelIds.messages);
export default new Event("messageUpdate", (oldMessage, newMessage) => {
    if (!oldMessage.content?.length || oldMessage.content === newMessage.content || newMessage.author?.id === client.user.id)
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
                value: !oldMessage.content || oldMessage.content.length === 0 ? "сообщение не было в кеше" : escapeString(oldMessage.content),
            },
            { name: "После", value: escapeString(newMessage.content) },
        ])
        : embed.addFields({ name: "⁣", value: "Текст сообщения слишком длинный" });
    messageChannel.send({ embeds: [embed] });
});
