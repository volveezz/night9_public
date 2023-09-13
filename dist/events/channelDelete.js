import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
let guildChannel = null;
export default new Event("channelDelete", async (channel) => {
    if (channel.isDMBased())
        return;
    const embed = new EmbedBuilder().setColor(colors.error).setAuthor({
        name: `Канал ${channel.name} удален`,
        iconURL: icons.moderation,
    });
    embed.setFooter({ text: `ChnId: ${channel.id}` }).addFields({
        name: "Дата создания",
        value: `<t:${Math.floor(channel.createdTimestamp / 1000)}>`,
        inline: true,
    });
    if (!guildChannel)
        guildChannel =
            client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID) || (await client.getAsyncTextChannel(process.env.GUILD_CHANNEL_ID));
    guildChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=channelDelete.js.map