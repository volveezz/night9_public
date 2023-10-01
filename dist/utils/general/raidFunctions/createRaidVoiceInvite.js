import { findVoiceChannelWithMostActivityMembers } from "./findVoiceChannelWithMostMembers.js";
const invitesMap = new Map();
export async function createActivityVoiceInvite({ channels, creatorId, joinedUsers }) {
    try {
        if (creatorId && channels.some((channel) => channel.members.has(creatorId))) {
            const creatorChannel = channels.find((channel) => channel.members.has(creatorId));
            const existingInvite = invitesMap.get(creatorId);
            if (existingInvite) {
                console.debug(`[DEBUG] Using existing invite for creatorId ${creatorId}`);
                return existingInvite;
            }
            if (creatorChannel) {
                const newInvite = await creatorChannel.createInvite({ reason: "Automatic voice invite to its creator", maxAge: 60 * 120 });
                invitesMap.set(creatorId, newInvite.url);
                return newInvite.url;
            }
        }
        else if (creatorId) {
            return null;
        }
        let inviteChannel = await findVoiceChannelWithMostActivityMembers(channels, joinedUsers);
        if (!inviteChannel) {
            inviteChannel = channels.reduce((prev, curr) => (prev && prev.members.size > curr.members.size ? prev : curr));
        }
        if (inviteChannel) {
            console.debug(`[DEBUG] Creating invite for ${inviteChannel.name}`);
            const newRaidInvite = await inviteChannel.createInvite({ reason: "Automatic invitation to members", maxAge: 60 * 120 });
            return newRaidInvite.url;
        }
    }
    catch (error) {
        console.error("[Error code: 1993]", error);
    }
}
//# sourceMappingURL=createRaidVoiceInvite.js.map