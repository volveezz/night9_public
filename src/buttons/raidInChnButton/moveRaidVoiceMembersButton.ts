import {
	ButtonInteraction,
	ChannelType,
	Collection,
	EmbedBuilder,
	Guild,
	GuildMember,
	InteractionResponse,
	VoiceChannel,
} from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import { pause } from "../../utils/general/utilities.js";
import { RaidEvent } from "../../utils/persistence/sequelizeModels/raidEvent.js";

type MoveRaidVoiceMembersParams = {
	interaction: ButtonInteraction;
	guild: Guild;
	raidEvent: RaidEvent;
	deferredReply: Promise<InteractionResponse<boolean>>;
};

const ERROR_EMBED = new EmbedBuilder()
	.setColor(colors.error)
	.setAuthor({ name: "Ошибка", iconURL: icons.error })
	.setDescription("Не удалось найти свободный голосовой канал");

async function moveRaidVoiceMembers({ guild, interaction, raidEvent, deferredReply }: MoveRaidVoiceMembersParams) {
	const guildVoiceChannels = guild.channels.cache.filter((guildChannel) => guildChannel.type === ChannelType.GuildVoice) as Collection<
		string,
		VoiceChannel
	>;

	const membersCollection: GuildMember[] = [];
	for (let i = 0; i < guildVoiceChannels.size; i++) {
		const voiceChannel = guildVoiceChannels.at(i)!;

		for (let i2 = 0; i2 < voiceChannel.members.size; i2++) {
			const voiceMember = voiceChannel.members.at(i2)!;
			if (!voiceMember.user.bot) membersCollection.push(voiceMember);
		}
	}

	const raidVoiceChannels = guildVoiceChannels.filter(
		(voiceChannel) => voiceChannel.parentId === process.env.RAID_CATEGORY! && voiceChannel.name.includes("Raid")
	);

	const availableRaidVoiceChannel =
		raidVoiceChannels.find((voiceChannel) => voiceChannel.members.has(raidEvent.creator)) ||
		raidVoiceChannels.find((voiceChannel) => voiceChannel.userLimit > voiceChannel.members.size);

	if (!availableRaidVoiceChannel) {
		await deferredReply;
		interaction.editReply({ embeds: [ERROR_EMBED] });
		return;
	}

	const movedUsers: string[] = [];
	const alreadyMovedUsers: string[] = [];

	const initiatorDisplayName = interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.username;

	for (let i = 0; i < raidEvent.joined.length; i++) {
		const joinedUserId = raidEvent.joined[i];

		const activeVoiceMember = membersCollection.find((m) => m.id === joinedUserId);

		if (!activeVoiceMember) {
			const cachedMember = await client.getMember(joinedUserId);
			if (!cachedMember) {
				alreadyMovedUsers.push(`<@${joinedUserId}>, похоже, не на сервере`);
				continue;
			}

			const cleanedName = nameCleaner(cachedMember.displayName, true);
			alreadyMovedUsers.push(`**${cleanedName}** не в голосовых каналах`);

			continue;
		}

		const memberDisplayName = nameCleaner(activeVoiceMember.displayName, true);

		if (availableRaidVoiceChannel.members.has(activeVoiceMember.id)) {
			alreadyMovedUsers.push(`**${memberDisplayName}** уже в канале`);
		} else {
			await activeVoiceMember.voice.setChannel(
				availableRaidVoiceChannel,
				`${initiatorDisplayName} переместил участников в рейдовый голосовой канал`
			);
			movedUsers.push(`**${memberDisplayName}** был перемещен`);

			// Wait a bit in order to avoid creation of duped voice channels
			if (movedUsers.length === 1) await pause(500);
		}
	}

	const replyEmbed = new EmbedBuilder()
		.setColor(colors.success)
		.setAuthor({
			name: `${movedUsers.length}/${raidEvent.joined.length - alreadyMovedUsers.length} пользователей перемещено`,
			iconURL: icons.success,
		})
		.setDescription(`${movedUsers.join("\n") + "\n" + alreadyMovedUsers.join("\n")}`);

	await deferredReply;
	interaction.editReply({ embeds: [replyEmbed] });
}

export default moveRaidVoiceMembers;
