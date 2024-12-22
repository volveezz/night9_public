import { Message } from "discord.js";
import { LfgEvent } from "../../interfaces/ChannelData.js";
import { CompletedPhase } from "../../interfaces/CompletedPhases.js";
import { CompletedRaidsData } from "../../interfaces/CompletedRaidsData.js";
import { AuthData } from "./sequelizeModels/authData.js";
import { RaidEvent } from "./sequelizeModels/raidEvent.js";

type TwitterVoteRecord = {
	original: Set<string>;
	translation: Set<string>;
};

export const recentlyNotifiedKickedMembers = new Set<string>();
export const recentActivityCreators = new Map<string, NodeJS.Timeout>();
export const recentlyExpiredAuthUsersBungieIds = new Set<string>();
export const channelDataMap = new Map<string, LfgEvent>();
export const channelsForDeletion = new Set<string>();
export const completedRaidsData = new Map<string, CompletedRaidsData>();
export const originalTweetData = new Map<string, string>();
export const twitterOriginalVoters: Map<string, TwitterVoteRecord> = new Map();
export const activeRaidEventFunctions = new Map<number, RaidEvent | null>();
export const processedRssLinks = new Set<string>();
export const stringVariablesMap: Record<number, number> = {};
export const clanJoinWelcomeMessages = new Map<string, Message<boolean>>(); // Key is member ID, value is message ID
export const completedPhases = new Map<string, CompletedPhase[]>();

/**
 * @key Post id
 * @value Message with the post
 */
export const lastTwitterPublishedPosts = new Map<string, Message<boolean>>();

export const userCharactersId = new Map<string, string[]>();
export const longOffline = new Set<string>();
export const grandmasterHashes = new Set<number>();

export const raidMilestoneHashes = new Map<number, number>();

/**
 * @key discordId
 * @value Username#BungieId
 */
export const bungieNames = new Map<string, string>();
export const userTimezones = new Map<string, number>();
export const clanOnline = new Map<string, { platform: number; membershipId: string }>();

export const cachedRaidMembers = new Map<number, { userDataList: AuthData[]; lastCheckedTime: number }>();
