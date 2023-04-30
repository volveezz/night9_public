import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const messageChannel = client.getCachedTextChannel(channelIds.messages);
export default new Event("messageDeleteBulk", (messages) => {
    const messagesArray = messages.reverse();
    const embed = new EmbedBuilder().setColor(colors.error).setAuthor({
        name: "Группа сообщений удалена",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086264381832179742/1984-icon-delete.png",
    });
    for (let i = 0; i < messagesArray.size && i < 24; i++) {
        const m = messagesArray.at(i);
        embed.addFields([
            {
                name: `Сообщение ${m?.member?.displayName} (${m?.id})`,
                value: `${m?.content?.length > 0
                    ? "'${m?.content?.length! > 1000 ? \"*в сообщении слишком много текста*\" : m?.content}'"
                    : m?.embeds[0]?.title
                        ? "'${m?.embeds[0]?.title}'"
                        : "*в сообщении нет текста*"}`,
            },
        ]);
    }
    messagesArray.size > 24 ? embed.setFooter({ text: `И ещё ${messagesArray.size - 24} сообщений` }) : [];
    messageChannel.send({ embeds: [embed] });
});
