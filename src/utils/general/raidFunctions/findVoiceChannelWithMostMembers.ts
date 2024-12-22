import { Collection, VoiceChannel } from "discord.js";

export async function findVoiceChannelWithMostActivityMembers(
	activityVoiceChannels: Collection<string, VoiceChannel>,
	activityMembers: string[]
): Promise<VoiceChannel | null> {
	let maxCount = 0;
	let optimalChannel: VoiceChannel | null = null;

	activityVoiceChannels.forEach((voiceChannel) => {
		const count = voiceChannel.members.filter((member) => activityMembers.includes(member.id)).size;
		if (count > maxCount) {
			maxCount = count;
			optimalChannel = voiceChannel;
		}
	});

	return optimalChannel;
}
