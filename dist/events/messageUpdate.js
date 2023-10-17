import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import { escapeString } from "../utils/general/utilities.js";
let messageChannel = null;
export default new Event("messageUpdate", async (oldMessage, newMessage) => {
    if (!oldMessage.content?.length || oldMessage.content === newMessage.content || newMessage.author?.id === client.user.id)
        return;
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({
        name: "Сообщение изменено",
        url: `https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id}`,
        iconURL: icons.notify,
    })
        .setDescription(`<@${newMessage.author.id}> изменил сообщение в <#${newMessage.channelId}>`);
    oldMessage.content.length <= 1024 && newMessage.content && newMessage.content.length <= 1024
        ? embed.addFields({
            name: "До изменения",
            value: !oldMessage.content || oldMessage.content.length === 0 ? "сообщение не было в кеше" : escapeString(oldMessage.content),
        }, { name: "После", value: escapeString(newMessage.content) })
        : embed.addFields({ name: "⁣", value: "Текст сообщения слишком длинный" });
    if (!messageChannel)
        messageChannel = await client.getTextChannel(process.env.MESSAGES_CHANNEL_ID);
    if (newMessage.content === "[Original Message Deleted]")
        newMessage.delete().catch((_) => null);
    await messageChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=messageUpdate.js.map