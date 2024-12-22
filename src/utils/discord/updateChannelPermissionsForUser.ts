import { GuildBasedChannel, PrivateThreadChannel, PublicThreadChannel } from "discord.js";

type ExcludedThreads = Exclude<Exclude<GuildBasedChannel, PrivateThreadChannel>, PublicThreadChannel<boolean>>;

export async function updateChannelPermissionsForUser(channel: ExcludedThreads, userId: string, permissionsStatus: boolean) {
	if (permissionsStatus) {
		await channel.permissionOverwrites.create(userId, {
			ViewChannel: true,
			ReadMessageHistory: true,
		});
	} else {
		await channel.permissionOverwrites.delete(userId);
	}
}
