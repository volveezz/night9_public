import { ChannelType } from "discord.js";
import { client } from "../../index.js";
import { voiceChannelJoinTimestamps } from "./userActivityHandler.js";
export async function cacheGuildsVoiceAndMessagesData() {
    const guilds = client.guilds.cache;
    for (const [_, guild] of guilds) {
        const [channels, _] = await Promise.all([guild.channels.fetch(), guild.members.fetch()]);
        for (const [_, channel] of channels) {
            if (!channel)
                continue;
            if (channel.type === ChannelType.GuildVoice) {
                for (const [_, member] of channel.members) {
                    if (!member.user.bot && member.voice.channel && member.voice.channelId !== member.voice.guild.afkChannelId) {
                        voiceChannelJoinTimestamps.set(member.id, Date.now());
                    }
                }
            }
            else if (channel.isTextBased()) {
                try {
                    await channel.messages.fetch({ limit: 15 });
                }
                catch (error) {
                    console.error(`[Error code: 1991] Looks like channel ${channel.name} was deleted during caching messages. Error: ${error.code}`);
                }
            }
        }
    }
}
//# sourceMappingURL=initializeVoiceActivity.js.map