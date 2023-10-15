import { ChannelType, EmbedBuilder, GuildMember } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import { pause } from "../../utils/general/utilities.js";
const ERROR_EMBED = new EmbedBuilder()
    .setColor(colors.error)
    .setAuthor({ name: "Ошибка", iconURL: icons.error })
    .setDescription("Не удалось найти свободный голосовой канал");
async function moveRaidVoiceMembers({ guild, interaction, raidEvent }) {
    const guildVoiceChannels = guild.channels.cache.filter((guildChannel) => guildChannel.type === ChannelType.GuildVoice);
    const membersCollection = [];
    for (let i = 0; i < guildVoiceChannels.size; i++) {
        const voiceChannel = guildVoiceChannels.at(i);
        for (let i2 = 0; i2 < voiceChannel.members.size; i2++) {
            const voiceMember = voiceChannel.members.at(i2);
            if (!voiceMember.user.bot)
                membersCollection.push(voiceMember);
        }
    }
    const raidVoiceChannels = guildVoiceChannels.filter((voiceChannel) => voiceChannel.parentId === process.env.RAID_CATEGORY && voiceChannel.name.includes("Raid"));
    const availableRaidVoiceChannel = raidVoiceChannels.find((voiceChannel) => voiceChannel.members.has(raidEvent.creator)) ||
        raidVoiceChannels.find((voiceChannel) => voiceChannel.userLimit > voiceChannel.members.size);
    if (!availableRaidVoiceChannel) {
        interaction.reply({ embeds: [ERROR_EMBED], ephemeral: true });
        return;
    }
    const movedUsers = [];
    const alreadyMovedUsers = [];
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
        }
        else {
            await activeVoiceMember.voice.setChannel(availableRaidVoiceChannel, `${initiatorDisplayName} переместил участников в рейдовый голосовой канал`);
            movedUsers.push(`**${memberDisplayName}** был перемещен`);
            if (movedUsers.length === 1)
                await pause(500);
        }
    }
    const replyEmbed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: `${movedUsers.length}/${raidEvent.joined.length - alreadyMovedUsers.length} пользователей перемещено`,
        iconURL: icons.success,
    })
        .setDescription(`${movedUsers.join("\n") + "\n" + alreadyMovedUsers.join("\n")}`);
    interaction.reply({ embeds: [replyEmbed], ephemeral: true });
}
export default moveRaidVoiceMembers;
//# sourceMappingURL=moveRaidVoiceMembersButton.js.map