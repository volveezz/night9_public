import { Collection, Snowflake, VoiceChannel } from "discord.js";
import { findVoiceChannelWithMostActivityMembers } from "./findVoiceChannelWithMostMembers.js";

// let isCreatingInvite = false;
// let availableInvites = new Map<number, string>();

type ActivityInviteParameters = {
	channels: Collection<string, VoiceChannel>;
	joinedUsers: string[];
	creatorId?: Snowflake;
};

// export async function createActivityVoiceInvite({ channels, creatorId, joinedUsers }: ActivityInviteParameters) {
// 	try {
// 		if (creatorId) {
// 			return (
// 				await channels
// 					.find((channel) => channel.members.has(creatorId))
// 					?.createInvite({ reason: "Automatic voice invite to its creator", maxAge: 60 * 120 })
// 			)?.url;
// 		}

// 		let inviteChannel = await findVoiceChannelWithMostActivityMembers(channels, joinedUsers);

// 		if (!inviteChannel) {
// 			inviteChannel = channels.reduce((prev, curr) => {
// 				if (prev && prev.members.size > curr.members.size) {
// 					return prev;
// 				} else {
// 					return curr;
// 				}
// 			});
// 		}

// 		if (inviteChannel) {
// console.debug(`[DEBUG] Creating invite for ${inviteChannel.name}`);
// 			const newRaidInvite = (await inviteChannel.createInvite({ reason: "Automatic invitation to members", maxAge: 60 * 120 })).url;

// 			return newRaidInvite;
// 		}
// 	} catch (error) {
// 		console.error("[Error code: 1993]", error);
// 	}
// }\

// Map to store created invites against creatorId.
const invitesMap = new Map<Snowflake, string>();

export async function createActivityVoiceInvite({ channels, creatorId, joinedUsers }: ActivityInviteParameters) {
	try {
		if (creatorId && channels.some((channel) => channel.members.has(creatorId))) {
			const creatorChannel = channels.find((channel) => channel.members.has(creatorId));

			const existingInvite = invitesMap.get(creatorId);

			if (existingInvite) {
				// console.debug(`[DEBUG] Using existing invite for creatorId ${creatorId}`);
				return existingInvite;
			}

			if (creatorChannel) {
				const newInvite = await creatorChannel.createInvite({ reason: "Automatic voice invite to its creator", maxAge: 60 * 120 });
				invitesMap.set(creatorId, newInvite.url); // Store the new invite against creatorId.
				return newInvite.url;
			}
		} else if (creatorId) {
			return null;
		}

		let inviteChannel = await findVoiceChannelWithMostActivityMembers(channels, joinedUsers);

		if (!inviteChannel) {
			inviteChannel = channels.reduce((prev, curr) => (prev && prev.members.size < curr.members.size ? prev : curr));
		}

		if (inviteChannel) {
			// console.debug(`[DEBUG] Creating invite for ${inviteChannel.name}`);
			const newRaidInvite = await inviteChannel.createInvite({ reason: "Automatic invitation to members", maxAge: 60 * 120 });
			return newRaidInvite.url;
		}
	} catch (error) {
		console.error("[Error code: 1993]", error);
	}
}
