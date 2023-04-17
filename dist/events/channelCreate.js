import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildChannel = client.getCachedTextChannel(channelIds.guild);
export default new Event("channelCreate", (channel) => {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: `Канал ${channel.name} создан`,
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086266897907060756/5711-icon-moderation.png",
    })
        .setFooter({ text: `ChnId: ${channel.id}` })
        .addFields([{ name: `Канал`, value: `<#${channel.id}>`, inline: true }]);
    guildChannel.send({ embeds: [embed] });
});
