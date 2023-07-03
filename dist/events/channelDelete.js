import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
let guildChannel = null;
export default new Event("channelDelete", async (channel) => {
    const embed = new EmbedBuilder().setColor(colors.error).setAuthor({
        name: "Канал удален",
        iconURL: icons.moderation,
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
        console.error("[Error code: 1640] Deleted channel found as DM", channel);
    }
    if (!guildChannel)
        guildChannel =
            client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID) || (await client.getAsyncTextChannel(process.env.GUILD_CHANNEL_ID));
    await guildChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=channelDelete.js.map