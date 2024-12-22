import { EmbedBuilder, TextChannel } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";

let guildChannel: TextChannel | null = null;

export default new Event("channelCreate", async (channel) => {
	const embed = new EmbedBuilder()
		.setColor(colors.success)
		.setAuthor({
			name: `Канал ${channel.name} создан`,
			iconURL: icons.moderation,
		})
		.setFooter({ text: `ChannelId: ${channel.id}` })
		.addFields({ name: "Канал", value: `<#${channel.id}>`, inline: true });

	if (!guildChannel) guildChannel = await client.getTextChannel(process.env.GUILD_CHANNEL_ID!);

	guildChannel.send({ embeds: [embed] });
});
