const seasonalRoles = { currentSeasonRole: process.env.CUR_SEASON_ROLE!, nonCurrentSeasonRole: process.env.NON_CUR_SEASON_ROLE! };
const dlcRoles = {
	vanilla: process.env.VANILLA_ROLE_ID!,
	forsaken: process.env.FORSAKEN_ROLE_ID!,
	shadowkeep: process.env.SHADOWKEEP_ROLE_ID!,
	beyondLight: process.env.BEYONDLIGHT_ROLE_ID!,
	anniversary: process.env.ANNIVERSARY_ROLE_ID!,
	theWitchQueen: process.env.THE_WITCH_QUEEN_ROLE_ID!,
	lightfall: process.env.LIGHTFALL_ROLE_ID!,
	theFinalShape: process.env.THE_FINAL_SHAPE_ROLE_ID!,
};
const classRoles = [
	{ className: "hunter", id: process.env.HUNTER! },
	{ className: "warlock", id: process.env.WARLOCK! },
	{ className: "titan", id: process.env.TITAN! },
];
const raidRoles = {
	allRoles: [process.env.RAID_ROLE_50!, process.env.RAID_ROLE_30!, process.env.RAID_ROLE_7!, process.env.RAID_ROLE_2!],
	roles: [
		{ roleId: process.env.RAID_ROLE_50!, individualClears: 50, totalClears: 500 },
		{ roleId: process.env.RAID_ROLE_30!, individualClears: 30, totalClears: 300 },
		{ roleId: process.env.RAID_ROLE_7!, individualClears: 7, totalClears: 70 },
		{ roleId: process.env.RAID_ROLE_2!, individualClears: 2, totalClears: 20 },
	],
};
const clanJoinDateRoles = {
	allRoles: [
		process.env.CLAN_JOIN_DATE_ROLE_3_YEARS!,
		process.env.CLAN_JOIN_DATE_ROLE_2_YEARS!,
		process.env.CLAN_JOIN_DATE_ROLE_1_YEAR!,
		process.env.CLAN_JOIN_DATE_ROLE_189_DAYS!,
		process.env.CLAN_JOIN_DATE_ROLE_63_DAYS!,
		process.env.CLAN_JOIN_DATE_ROLE_21_DAYS!,
		process.env.CLAN_JOIN_DATE_ROLE_7_DAYS!,
	],
	roles: [
		{ roleId: process.env.CLAN_JOIN_DATE_ROLE_3_YEARS!, days: 1 * 365 * 3 },
		{ roleId: process.env.CLAN_JOIN_DATE_ROLE_2_YEARS!, days: 1 * 365 * 2 },
		{ roleId: process.env.CLAN_JOIN_DATE_ROLE_1_YEAR!, days: 1 * 365 },
		{ roleId: process.env.CLAN_JOIN_DATE_ROLE_189_DAYS!, days: 1 * 189 },
		{ roleId: process.env.CLAN_JOIN_DATE_ROLE_63_DAYS!, days: 1 * 63 },
		{ roleId: process.env.CLAN_JOIN_DATE_ROLE_21_DAYS!, days: 1 * 21 },
		{ roleId: process.env.CLAN_JOIN_DATE_ROLE_7_DAYS!, days: 1 * 7 },
	],
};
const statisticsRoles = {
	allActive: process.env.STATISTICS_ALL_ACTIVE_ROLES!.split(","),
	active: [
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_25000!, triumphScore: 25000 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_22500!, triumphScore: 22500 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_20000!, triumphScore: 20000 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_17500!, triumphScore: 17500 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_15000!, triumphScore: 15000 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_12500!, triumphScore: 12500 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_10000!, triumphScore: 10000 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_7500!, triumphScore: 7500 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_5000!, triumphScore: 5000 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_2500!, triumphScore: 2500 },
		{ roleId: process.env.STATISTICS_ACTIVE_ROLE_1000!, triumphScore: 1000 },
		{ roleId: process.env.STATISTICS_INACTIVE_ROLE!, triumphScore: 0 },
	],
	allKd: process.env.STATISTICS_ALL_KD_ROLES!.split(","),
	kd: [
		{ roleId: process.env.STATISTICS_KD_ROLE_15!, kd: 1.5 },
		{ roleId: process.env.STATISTICS_KD_ROLE_14!, kd: 1.4 },
		{ roleId: process.env.STATISTICS_KD_ROLE_13!, kd: 1.3 },
		{ roleId: process.env.STATISTICS_KD_ROLE_12!, kd: 1.2 },
		{ roleId: process.env.STATISTICS_KD_ROLE_11!, kd: 1.1 },
		{ roleId: process.env.STATISTICS_KD_ROLE_10!, kd: 1.0 },
		{ roleId: process.env.STATISTICS_KD_ROLE_09!, kd: 0.9 },
		{ roleId: process.env.STATISTICS_KD_ROLE_08!, kd: 0.8 },
		{ roleId: process.env.STATISTICS_KD_ROLE_07!, kd: 0.7 },
		{ roleId: process.env.STATISTICS_KD_ROLE_06!, kd: 0.6 },
		{ roleId: process.env.STATISTICS_KD_ROLE_05!, kd: 0.5 },
		{ roleId: process.env.STATISTICS_KD_ROLE_00!, kd: 0 },
	],
};

const activityRoles = {
	category: process.env.ACTIVITY_CATEGORY!,
	allVoice: [
		process.env.ACTIVITY_VOICE_ROLE_20H!,
		process.env.ACTIVITY_VOICE_ROLE_10H!,
		process.env.ACTIVITY_VOICE_ROLE_3H!,
		process.env.ACTIVITY_VOICE_ROLE_1H!,
	],
	allMessages: [
		process.env.ACTIVITY_MESSAGES_ROLE_300!,
		process.env.ACTIVITY_MESSAGES_ROLE_150!,
		process.env.ACTIVITY_MESSAGES_ROLE_50!,
		process.env.ACTIVITY_MESSAGES_ROLE_5!,
	],
	voice: [
		{ roleId: process.env.ACTIVITY_VOICE_ROLE_20H!, voiceMinutes: 60 * 60 * 20 },
		{ roleId: process.env.ACTIVITY_VOICE_ROLE_10H!, voiceMinutes: 60 * 60 * 10 },
		{ roleId: process.env.ACTIVITY_VOICE_ROLE_3H!, voiceMinutes: 60 * 60 * 3 },
		{ roleId: process.env.ACTIVITY_VOICE_ROLE_1H!, voiceMinutes: 60 * 60 * 1 },
	],
	messages: [
		{ roleId: process.env.ACTIVITY_MESSAGES_ROLE_300!, messageCount: 300 },
		{ roleId: process.env.ACTIVITY_MESSAGES_ROLE_150!, messageCount: 150 },
		{ roleId: process.env.ACTIVITY_MESSAGES_ROLE_50!, messageCount: 50 },
		{ roleId: process.env.ACTIVITY_MESSAGES_ROLE_5!, messageCount: 5 },
	],
};

const trialsRoles = {
	allRoles: [
		process.env.TRIALS_TOTAL_FLAWLESS_ROLE_50!,
		process.env.TRIALS_TOTAL_FLAWLESS_ROLE_25!,
		process.env.TRIALS_TOTAL_FLAWLESS_ROLE_15!,
		process.env.TRIALS_TOTAL_FLAWLESS_ROLE_10!,
		process.env.TRIALS_TOTAL_FLAWLESS_ROLE_5!,
		process.env.TRIALS_TOTAL_FLAWLESS_ROLE_3!,
		process.env.TRIALS_TOTAL_FLAWLESS_ROLE_1!,
	],
	category: process.env.TRIALS_CATEGORY!,
	roles: [
		{ roleId: process.env.TRIALS_TOTAL_FLAWLESS_ROLE_50!, totalFlawless: 50 },
		{ roleId: process.env.TRIALS_TOTAL_FLAWLESS_ROLE_25!, totalFlawless: 25 },
		{ roleId: process.env.TRIALS_TOTAL_FLAWLESS_ROLE_15!, totalFlawless: 15 },
		{ roleId: process.env.TRIALS_TOTAL_FLAWLESS_ROLE_10!, totalFlawless: 10 },
		{ roleId: process.env.TRIALS_TOTAL_FLAWLESS_ROLE_5!, totalFlawless: 5 },
		{ roleId: process.env.TRIALS_TOTAL_FLAWLESS_ROLE_3!, totalFlawless: 3 },
		{ roleId: process.env.TRIALS_TOTAL_FLAWLESS_ROLE_1!, totalFlawless: 1 },
	],
	allKd: [
		process.env.TRIALS_KD_ROLE_15!,
		process.env.TRIALS_KD_ROLE_14!,
		process.env.TRIALS_KD_ROLE_13!,
		process.env.TRIALS_KD_ROLE_12!,
		process.env.TRIALS_KD_ROLE_11!,
		process.env.TRIALS_KD_ROLE_10!,
		process.env.TRIALS_KD_ROLE_09!,
		process.env.TRIALS_KD_ROLE_08!,
		process.env.TRIALS_KD_ROLE_07!,
		process.env.TRIALS_KD_ROLE_00!,
	],
	kd: [
		{ roleId: process.env.TRIALS_KD_ROLE_15!, kd: 1.5 },
		{ roleId: process.env.TRIALS_KD_ROLE_14!, kd: 1.4 },
		{ roleId: process.env.TRIALS_KD_ROLE_13!, kd: 1.3 },
		{ roleId: process.env.TRIALS_KD_ROLE_12!, kd: 1.2 },
		{ roleId: process.env.TRIALS_KD_ROLE_11!, kd: 1.1 },
		{ roleId: process.env.TRIALS_KD_ROLE_10!, kd: 1.0 },
		{ roleId: process.env.TRIALS_KD_ROLE_09!, kd: 0.9 },
		{ roleId: process.env.TRIALS_KD_ROLE_08!, kd: 0.8 },
		{ roleId: process.env.TRIALS_KD_ROLE_07!, kd: 0.7 },
		{ roleId: process.env.TRIALS_KD_ROLE_00!, kd: 0 },
	],
	wintrader: process.env.TRIALS_WINTRADER_ROLE!,
};

const guardianRankRoles = {
	allRoles: [
		process.env.GUARDIAN_RANK_11!,
		process.env.GUARDIAN_RANK_10!,
		process.env.GUARDIAN_RANK_9!,
		process.env.GUARDIAN_RANK_8!,
		process.env.GUARDIAN_RANK_7!,
		process.env.GUARDIAN_RANK_6!,
		process.env.GUARDIAN_RANK_5!,
		process.env.GUARDIAN_RANK_4!,
		process.env.GUARDIAN_RANK_3!,
		process.env.GUARDIAN_RANK_2!,
		process.env.GUARDIAN_RANK_1!,
	],
	ranks: [
		{ roleId: process.env.GUARDIAN_RANK_1!, rank: 1 },
		{ roleId: process.env.GUARDIAN_RANK_2!, rank: 2 },
		{ roleId: process.env.GUARDIAN_RANK_3!, rank: 3 },
		{ roleId: process.env.GUARDIAN_RANK_4!, rank: 4 },
		{ roleId: process.env.GUARDIAN_RANK_5!, rank: 5 },
		{ roleId: process.env.GUARDIAN_RANK_6!, rank: 6 },
		{ roleId: process.env.GUARDIAN_RANK_7!, rank: 7 },
		{ roleId: process.env.GUARDIAN_RANK_8!, rank: 8 },
		{ roleId: process.env.GUARDIAN_RANK_9!, rank: 9 },
		{ roleId: process.env.GUARDIAN_RANK_10!, rank: 10 },
		{ roleId: process.env.GUARDIAN_RANK_11!, rank: 11 },
	],
};

// const premiumRoles = [
// 	{ roleId: process.env.PREMIUM_ROLE_1!, tier: 1 },
// 	{ roleId: process.env.PREMIUM_ROLE_2!, tier: 2 },
// 	{ roleId: process.env.PREMIUM_ROLE_3!, tier: 3 },
// 	{ roleId: process.env.PREMIUM_ROLE_4!, tier: 4 },
// ];
const allPremiumRoles = [
	process.env.PREMIUM_ROLE_1!,
	process.env.PREMIUM_ROLE_2!,
	process.env.PREMIUM_ROLE_3!,
	process.env.PREMIUM_ROLE_4!,
];

export {
	activityRoles,
	allPremiumRoles,
	clanJoinDateRoles,
	classRoles,
	dlcRoles,
	guardianRankRoles,
	// premiumRoles,
	raidRoles,
	seasonalRoles,
	statisticsRoles,
	trialsRoles,
};
