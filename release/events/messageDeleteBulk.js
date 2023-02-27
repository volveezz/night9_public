import { EmbedBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const messageChannel = client.channels.cache.get(ids.messagesChnId);
export default new Event("messageDeleteBulk", (messages) => {
    const messagesArray = messages.reverse();
    const embed = new EmbedBuilder().setColor("DarkRed").setAuthor({ name: "Группа сообщений удалена" });
    for (let i = 0; i < messagesArray.size && i < 24; i++) {
        const m = messagesArray.at(i);
        embed.addFields([
            {
                name: `Сообщение ${m?.member?.displayName} (${m?.id})`,
                value: `${m?.content?.length > 0
                    ? `\`${m?.content?.length > 1000 ? "*в сообщении слишком много текста*" : m?.content}\``
                    : m?.embeds[0]?.title
                        ? `\`${m?.embeds[0]?.title}\``
                        : "*в сообщении нет текста*"}`,
            },
        ]);
    }
    messagesArray.size > 24 ? embed.setFooter({ text: `И ещё ${messagesArray.size - 24} сообщений` }) : [];
    messageChannel.send({ embeds: [embed] });
});
