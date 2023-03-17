import { EmbedBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import colors from "../configs/colors.js";
const guildChannel = client.channels.cache.get(ids.guildChnId);
export default new Event("channelDelete", (channel) => {
    const embed = new EmbedBuilder().setColor(colors.error).setAuthor({
        name: "Канал удален",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086266897907060756/5711-icon-moderation.png",
    });
    if (!channel.isDMBased()) {
        embed.setFooter({ text: `ChnId: ${channel.id}` }).addFields([
            {
                name: "Название",
                value: channel.name,
                inline: true,
            },
            {
                name: "Дата создания",
                value: `<t:${Math.floor(channel.createdTimestamp / 1000)}>`,
                inline: true,
            },
        ]);
    }
    else {
        console.log(`[Error code: 1640] Deleted channel found as DM`, channel);
    }
    guildChannel.send({ embeds: [embed] });
});
