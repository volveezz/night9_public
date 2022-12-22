import { EmbedBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.channels.cache.get(ids.guildChnId);
export default new Event("channelDelete", (channel) => {
    const embed = new EmbedBuilder().setColor("Red").setAuthor({ name: `Канал удален` });
    if (!channel.isDMBased()) {
        embed.setFooter({ text: `ChnId: ${channel.id}` }).addFields([
            {
                name: "Название",
                value: channel.name,
                inline: true,
            },
            {
                name: "Дата создания",
                value: `<t:${Math.round(channel.createdTimestamp / 1000)}>`,
                inline: true,
            },
        ]);
    }
    else
        console.log(`Deleted channel found as DM`, channel);
    guildChannel.send({ embeds: [embed] });
});
