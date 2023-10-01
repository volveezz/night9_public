export async function findVoiceChannelWithMostActivityMembers(activityVoiceChannels, activityMembers) {
    let maxCount = 0;
    let optimalChannel = null;
    activityVoiceChannels.forEach((voiceChannel) => {
        const count = voiceChannel.members.filter((member) => activityMembers.includes(member.id)).size;
        if (count > maxCount) {
            maxCount = count;
            optimalChannel = voiceChannel;
        }
    });
    return optimalChannel;
}
//# sourceMappingURL=findVoiceChannelWithMostMembers.js.map