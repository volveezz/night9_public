import { EmbedBuilder, GuildMember, TextChannel, User } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import nameCleaner from "../general/nameClearer.js";

let authLogChannel: TextChannel | null = null;

export async function logUserRegistrationAttempt(state: string, memberOrUser: GuildMember | User, isNewUser: boolean) {
	const memberDisplayName = nameCleaner((await client.getMember(memberOrUser)).displayName);

	const embed = new EmbedBuilder()
		.setColor(colors.serious)
		.setAuthor({
			name: `${memberDisplayName} начал регистрацию`,
			iconURL: memberOrUser.displayAvatarURL(),
		})
		.addFields([
			{ name: "Пользователь", value: `<@${memberOrUser.id}>`, inline: true },
			{ name: "State", value: state.toString(), inline: true },
			{ name: "Впервые", value: `${isNewUser}`, inline: true },
		]);

	if (!authLogChannel) authLogChannel = await client.getTextChannel(process.env.BOT_CHANNEL_ID!);

	await authLogChannel.send({ embeds: [embed] });
}
