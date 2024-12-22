import { BungieMembershipType } from "bungie-api-ts/common.js";
import { GroupMembership, RuntimeGroupMemberType } from "bungie-api-ts/groupv2";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
import { UserActivityData } from "../utils/persistence/sequelizeModels/userActivityData.js";

export interface ClanList {
	isOnline: boolean;
	lastOnlineStatusChange: number;
	joinDate: number;
	displayName: string;
	membershipType: number;
	platform: BungieMembershipType;
	bungieId: string;
	rank: RuntimeGroupMemberType;
	UserActivityData?: UserActivityData;
	discordId?: string;
}

export type DiscordClanMember = Partial<AuthData> & Partial<GroupMembership>;
