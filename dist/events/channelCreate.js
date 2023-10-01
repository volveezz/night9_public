import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
let guildChannel = null;
export default new Event("channelCreate", async (channel) => {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: `Канал ${channel.name} создан`,
        iconURL: icons.moderation,
    })
        .setFooter({ text: `ChnId: ${channel.id}` })
        .addFields({ name: "Канал", value: `<#${channel.id}>`, inline: true });
    if (!guildChannel)
        guildChannel =
            client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID) || (await client.getTextChannel(process.env.GUILD_CHANNEL_ID));
    guildChannel.send({ embeds: [embed] });
});
//# sourceMappingURL=channelCreate.js.map