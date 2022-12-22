import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const messageChannel = client.channels.cache.get(ids.messagesChnId);
export default new Event("messageUpdate", (oldMessage, newMessage) => {
    if (!oldMessage.content?.length || oldMessage.content === newMessage.content)
        return;
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setAuthor({ name: "Сообщение изменено" })
        .setDescription(`<@${newMessage.author.id}> изменил сообщение в <#${newMessage.channelId}>. [Перейти к сообщению](https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id})`);
    oldMessage.content.length <= 1000 && newMessage.content && newMessage.content.length <= 1000
        ? embed.addFields([
            {
                name: "До изменения",
                value: oldMessage.content.length <= 0 ? "сообщение не было в кеше" : `\`${oldMessage.content}\``,
            },
            { name: "После", value: `\`${newMessage.content}\`` },
        ])
        : embed.addFields({ name: "⁣", value: "Текст сообщения слишком длинный" });
    messageChannel.send({ embeds: [embed] });
});
