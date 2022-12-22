import { EmbedBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.channels.cache.get(ids.guildChnId);
export default new Event("channelCreate", (channel) => {
    const embed = new EmbedBuilder()
        .setColor("Green")
        .setAuthor({ name: `Канал ${channel.name} создан` })
        .setFooter({ text: `ChnId: ${channel.id}` })
        .addFields([{ name: `Канал`, value: `<#${channel.id}>`, inline: true }]);
    guildChannel.send({ embeds: [embed] });
});
