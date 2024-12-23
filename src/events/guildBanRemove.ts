import { EmbedBuilder, TextChannel } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";

let guildMemberChannel: TextChannel | null = null;

export default new Event("guildBanRemove", async (member) => {
	const embed = new EmbedBuilder()
		.setColor(colors.success)
		.setAuthor({
			name: `${member.user.username} разбанен`,
			iconURL: member.user.displayAvatarURL(),
		})
		.setFooter({ text: `Id: ${member.user.id}` });

	if (member.reason) {
		embed.addFields({
			name: "Причина бана",
			value: member.reason.length > 1024 ? "*слишком длинная причина бана*" : member.reason,
		});
	}

	if (!guildMemberChannel)
		guildMemberChannel =
			client.getCachedTextChannel(process.env.GUILD_MEMBER_CHANNEL_ID!) ||
			(await client.getTextChannel(process.env.GUILD_MEMBER_CHANNEL_ID!));

	guildMemberChannel.send({ embeds: [embed] });
});
