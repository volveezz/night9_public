import { EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import setMemberRoles from "../discord/setRoles.js";
import nameCleaner from "../general/nameClearer.js";
import { escapeString } from "../general/utilities.js";
import { clanJoinWelcomeMessages } from "../persistence/dataStore.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";

let clanLogChannel: TextChannel | null = null;
let generalLogChannel: TextChannel | null = null;

const recentlyJoinedMembersIds = new Set<string>();

export async function updateClanRolesWithLogging(result: AuthData, join: boolean) {
	const [member, clanLogChannelRequest] = await Promise.all([
		client.getMember(result.discordId),
		clanLogChannel || client.getTextChannel(process.env.CLAN_CHANNEL_ID!),
	]);

	if (!clanLogChannel) {
		clanLogChannel = clanLogChannelRequest;
	}

	const embed = new EmbedBuilder().addFields([
		{ name: "BungieId", value: result.bungieId, inline: true },
		{ name: "Ник в игре", value: `${escapeString(result.displayName)}`, inline: true },
	]);

	if (member) {
		if (join) {
			const givenRoles: string[] = [];
			if (!member.roles.cache.has(process.env.CLANMEMBER!)) {
				givenRoles.push(process.env.CLANMEMBER!);
			}
			if (!member.roles.cache.has(process.env.VERIFIED!)) {
				givenRoles.push(process.env.VERIFIED!);
			}
			if (givenRoles.length > 0) {
				await member.roles.add(givenRoles, "User joined the clan").then((m) => {
					setTimeout(() => {
						if (!m.roles.cache.hasAll(...givenRoles)) {
							console.error(
								`[Error code: 2106] Found that ${m.displayName} doesn't have all given roles. Trying to give them again...`
							);
							m.roles.add(givenRoles, "Second attempt to give roles");
						}
					}, 1000 * 5);
				});
			}
			if (member.roles.cache.hasAny(process.env.KICKED!, process.env.NEWBIE!, process.env.MEMBER!)) {
				await member.roles.remove([process.env.KICKED!, process.env.NEWBIE!, process.env.MEMBER!], "User joined the clan").then((m) => {
					setTimeout(() => {
						if (m.roles.cache.hasAny(process.env.KICKED!, process.env.NEWBIE!, process.env.MEMBER!)) {
							console.error(
								`[Error code: 2107] Found that ${m.displayName} still has some of the old roles. Trying to remove them again...`
							);
							m.roles.remove([process.env.KICKED!, process.env.NEWBIE!, process.env.MEMBER!], "Second attempt to remove roles");
						}
					}, 1000 * 6);
				});
			}

			embed
				.setAuthor({
					name: `${member.displayName} вступил в клан`,
					iconURL: member.displayAvatarURL(),
				})
				.setColor(colors.success);

			try {
				if (recentlyJoinedMembersIds.has(member.id)) return;
				recentlyJoinedMembersIds.add(member.id);
				notifyJoinedUser(member);
			} catch (error) {
				console.error(`[Error code: 1806] ${member.displayName} blocked his DMs`, error);
			}

			try {
				if (!generalLogChannel) {
					generalLogChannel = await client.getTextChannel(process.env.MAIN_CHANNEL_ID!);
				}
				const welcomeMessage = await generalLogChannel.send(
					`<a:d2ghost:732676128094814228> Приветствуем нового участника клана, ${member}!`
				);
				await welcomeMessage.react("<:doge_hug:1073864905129721887>");
				clanJoinWelcomeMessages.set(member.id, welcomeMessage);
			} catch (error) {
				console.error("[Error code: 1925]", error);
			}
		} else {
			const setRoles = member.roles.cache.has(process.env.VERIFIED!)
				? [process.env.KICKED!, process.env.VERIFIED!]
				: [process.env.KICKED!];
			await setMemberRoles({ member, roles: setRoles, reason: "Member left the clan" });

			embed
				.setAuthor({
					name: `${member.displayName} покинул клан`,
					iconURL: member.displayAvatarURL(),
				})
				.setColor(colors.kicked);

			const welcomeMessage = clanJoinWelcomeMessages.get(member.id);
			if (welcomeMessage) {
				welcomeMessage.edit("https://tenor.com/view/palla-deserto-desert-hot-gif-6014273");
				welcomeMessage.reactions.removeAll();
				clanJoinWelcomeMessages.delete(member.id);
			}
		}
	} else {
		embed
			.setAuthor({
				name: join ? "Неизвестный на сервере пользователь вступил в клан" : "Неизвестный на сервере пользователь покинул клан",
			})
			.setColor(join ? colors.success : colors.kicked);
	}

	clanLogChannel.send({ embeds: [embed] });
}

async function notifyJoinedUser(member: GuildMember) {
	const clientId = client.user.id;
	const ownerId = process.env.OWNER_ID!;

	const ownerDisplayName = client.getCachedMembers().get(ownerId)?.displayName || "Вольве";
	const cleanedOwnerDisplayName = nameCleaner(ownerDisplayName);

	const embed = new EmbedBuilder()
		.setColor(colors.success)
		.setAuthor({ name: "Вы были приняты в клан!", iconURL: member.guild.iconURL() || icons.success })
		.setDescription(
			`Вы также получили все необходимые роли для доступа к каналам клана.\nНа сервере имеются многочисленные системы, команды и возможности. Если хотите, введите \`/\`, и Discord предложит вам все слеш-команды сервера. Обратите внимание, что большинство команд доступно только на этом сервере, в любых каналах.\n\nНа сервере работает несколько разных ботов с их командами, но два из них являются клановыми: основной - Night 9, <@${clientId}> и музыкальный бот - Alfred Jodl, <@719262521768280074>.\n\nПо любым вопросам **в любое время** обращайтесь к лидеру клана ${cleanedOwnerDisplayName} <@${ownerId}> в личные сообщения или к <@${clientId}> в этом чате.`
		);

	await member.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch((e) => null);
}
