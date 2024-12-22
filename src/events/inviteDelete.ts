import { EmbedBuilder, TextChannel } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";

let guildChannel: TextChannel | null = null;

export default new Event("inviteDelete", async (invite) => {
	const embed = new EmbedBuilder()
		.setAuthor({ name: `Приглашение ${invite.code} удалено` })
		.setColor(colors.error)
		.addFields({
			name: "Приглашение в",
			value: `<#${invite.channelId}>`,
			inline: true,
		});

	if (!guildChannel)
		guildChannel =
			client.getCachedTextChannel(process.env.GUILD_CHANNEL_ID!) || (await client.getTextChannel(process.env.GUILD_CHANNEL_ID!));

	await guildChannel.send({ embeds: [embed] });
});
