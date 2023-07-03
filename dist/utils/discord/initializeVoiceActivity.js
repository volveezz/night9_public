import { voiceChannelJoinTimestamps } from "./userActivityHandler.js";
export async function initializeVoiceActivity(client) {
    client.guilds.cache.forEach((guild) => {
        guild.members.fetch().then((members) => {
            members.forEach((member) => {
                if (member.voice.channel && !member.user.bot) {
                    const userId = member.id;
                    const voiceState = member.voice;
                    if (voiceState.channelId && voiceState.channelId !== voiceState.guild.afkChannelId) {
                        voiceChannelJoinTimestamps.set(userId, Date.now());
                    }
                }
            });
        });
    });
}
//# sourceMappingURL=initializeVoiceActivity.js.map