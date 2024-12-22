import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import {
	DestinyActivityHistoryResults,
	DestinyActivityModeType,
	DestinyHistoricalStatsPeriodGroup,
} from "bungie-api-ts/destiny2/interfaces.js";
import { GuildMember } from "discord.js";
import { RaidNames } from "../../configs/Raids.js";
import { checkedStoryActivities, forbiddenRaidIds } from "../../configs/ids.js";
import { activityRoles, raidRoles, trialsRoles } from "../../configs/roles.js";
import BungieAPIError from "../../structures/BungieAPIError.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { getEndpointStatus, updateEndpointStatus } from "../api/statusCheckers/statusTracker.js";
import { logActivityCompletion } from "../logging/activityLogger.js";
import getGrandmasterHashes from "../logging/getGrandmasterHashes.js";
import { completedRaidsData, userCharactersId } from "../persistence/dataStore.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";
import { getRaidNameFromHash } from "./raidFunctions.js";
import fetchCharacterStatsAndCache from "./setUserCharacters.js";

const envs = process.env;
const OWNER_ID = envs.OWNER_ID!;
const CLANMEMBER = envs.CLANMEMBER!;
const MEMBER = envs.MEMBER!;
const cachedKDData = new Map<string, number>();

interface DestinyActivityCheckerParams {
	authData: AuthData;
	mode: DestinyActivityModeType;
	member?: GuildMember;
	count?: number;
	recursiveCall?: boolean;
}

// Function to process individual activities
async function processPveActivities(
	activity: DestinyHistoricalStatsPeriodGroup,
	completedActivities: number[],
	activityAvailableTime: number
) {
	// Logic related to raids
	const activityMode = activity.activityDetails.mode;

	if (
		activity.values.completed.basic.value === 1 &&
		activity.values.completionReason.basic.value === 0 &&
		(activityMode === DestinyActivityModeType.Dungeon ||
			(activityMode === DestinyActivityModeType.ScoredNightfall &&
				(await getGrandmasterHashes()).has(activity.activityDetails.referenceId)) ||
			activityMode === DestinyActivityModeType.Raid ||
			(activityMode === DestinyActivityModeType.Story && checkedStoryActivities.includes(activity.activityDetails.referenceId)))
	) {
		if (new Date(activity.period).getTime() + activity.values.activityDurationSeconds.basic.value * 1000 > activityAvailableTime)
			logActivityCompletion(activity.activityDetails.instanceId);

		if (activityMode === DestinyActivityModeType.Raid && !forbiddenRaidIds.includes(activity.activityDetails.referenceId))
			completedActivities.push(activity.activityDetails.referenceId);
	}
}

export async function destinyActivityChecker({ authData, mode, member, count = 250, recursiveCall = false }: DestinyActivityCheckerParams) {
	// Exit if API is not working
	if (getEndpointStatus("activity") !== PlatformErrorCodes.Success) return;

	const activityAvailableTime = Date.now() - 1000 * 60 * 60 * 2;
	const { platform, bungieId, accessToken, discordId } = authData;
	const userCharactersArray = userCharactersId.get(discordId);

	if (!userCharactersArray) {
		if (recursiveCall) return;

		await fetchCharacterStatsAndCache(authData);
		destinyActivityChecker({ authData, mode, member, count, recursiveCall: true });
		return;
	}

	let completedActivities: number[] = [];
	let kills = 0;
	let deaths = 0;
	let wintradedMatches = 0;
	let isPreviousMatchWintraded = false;
	let isWintrader = false;

	for (const character of userCharactersArray) {
		if (getEndpointStatus("activity") !== PlatformErrorCodes.Success) return;

		let page = 0;
		try {
			await fetchAndProcessActivities();
		} catch (error) {
			if (error instanceof BungieAPIError && error.errorCode) {
				console.error(
					`[Error code: 2108] Received ${error.errorCode}/${error.errorStatus} error during checking ${mode} mode of ${
						authData.displayName || discordId || bungieId
					}`
				);
				updateEndpointStatus("activity", error.errorCode);
			} else {
				updateEndpointStatus("activity", PlatformErrorCodes.ExternalServiceTimeout);
				console.error(
					`[Error code: 1996] Error happened during checking ${mode} mode of ${authData.displayName || discordId || bungieId}`
				);
			}
			return;
		}

		async function fetchAndProcessActivities() {
			if (getEndpointStatus("activity") !== PlatformErrorCodes.Success) return;

			const response = await sendApiRequest<DestinyActivityHistoryResults>(
				`/Platform/Destiny2/${platform}/Account/${bungieId}/Character/${character}/Stats/Activities/?count=${count}&mode=${mode}&page=${page}`,
				accessToken
			);

			if (!response) {
				return console.error(`[Error code: 1018] Response error for ${bungieId} during checking ${mode} mode`, response);
			}

			if (!response.activities || response.activities.length <= 0) {
				return;
			}

			const activityRequests = response.activities.map(async (activity) => {
				if (mode !== DestinyActivityModeType.TrialsOfOsiris) {
					await processPveActivities(activity, completedActivities, activityAvailableTime);
				} else {
					if (activity.values.completionReason.basic.value === 3) {
						if (isPreviousMatchWintraded === true) {
							wintradedMatches = wintradedMatches + 1;
							isWintrader = true;
						} else {
							isPreviousMatchWintraded = true;
						}
					} else if (isPreviousMatchWintraded === true) {
						isPreviousMatchWintraded = false;

						if (isWintrader === true) {
							wintradedMatches = wintradedMatches + 1;
							isWintrader = false;
						}
					}

					kills += activity.values.kills.basic.value;
					deaths += activity.values.deaths.basic.value;
				}
			});

			await Promise.all([activityRequests]);

			if (response.activities.length === 250) {
				page++;
				await fetchAndProcessActivities();
			}
		}
	}

	if (!member) return;

	// Process raids and trials
	if (mode === DestinyActivityModeType.Raid && count === 250) {
		const completedRaidCount = completedActivities.length;
		const previousTotalRaidCount = completedRaidsData.get(discordId)?.totalRaidClears;

		if (previousTotalRaidCount && previousTotalRaidCount >= completedRaidCount) {
			return;
		}

		const raidCounts = completedActivities.reduce(
			(counts, activity) => {
				const raidName = getRaidNameFromHash(activity);
				if (raidName !== "unknown") {
					counts[raidName as RaidNames] += 1;
				}
				return counts;
			},
			{
				se: 0,
				seMaster: 0,
				ce: 0,
				ceMaster: 0,
				ron: 0,
				ronMaster: 0,
				kf: 0,
				kfMaster: 0,
				votd: 0,
				votdMaster: 0,
				vog: 0,
				vogMaster: 0,
				dsc: 0,
				gos: 0,
				lw: 0,
			}
		);

		completedRaidsData.set(discordId, {
			...raidCounts,
			totalRaidClears: completedRaidCount,
		});

		if (
			member.roles.cache.has(CLANMEMBER) ||
			(member.roles.cache.has(MEMBER) && member.roles.cache.hasAny(...activityRoles.allMessages, ...activityRoles.allVoice)) ||
			authData.UserActivityData !== undefined
		) {
			const {
				se,
				seMaster,
				ce,
				ceMaster,
				ron,
				ronMaster,
				kf,
				kfMaster,
				votd,
				votdMaster,
				dsc,
				gos,
				vog,
				vogMaster,
				lw,
				totalRaidClears,
			} = completedRaidsData.get(discordId)!;

			const seClears = se + seMaster;
			const ceClears = ce + ceMaster;
			const ronClears = ron + ronMaster;
			const kfClears = kf + kfMaster;
			const votdClears = votd + votdMaster;
			const vogClears = vog + vogMaster;

			for (const { individualClears, roleId, totalClears } of raidRoles.roles) {
				if (
					(seClears >= individualClears &&
						ceClears >= individualClears &&
						ronClears >= individualClears &&
						kfClears >= individualClears &&
						votdClears >= individualClears &&
						vogClears >= individualClears &&
						dsc >= individualClears &&
						gos >= individualClears &&
						lw >= individualClears) ||
					totalRaidClears >= totalClears
				) {
					const allRolesExceptCurrent = raidRoles.allRoles.filter((r) => r !== roleId);

					if (member.roles.cache.hasAny(...allRolesExceptCurrent)) {
						await member.roles.remove(allRolesExceptCurrent);
					}
					if (!member.roles.cache.has(roleId)) {
						await member.roles.add(roleId);
					}
					break;
				}
			}
		}
	} else if (mode === DestinyActivityModeType.TrialsOfOsiris) {
		if (wintradedMatches >= 10 && discordId !== OWNER_ID) {
			if (member.roles.cache.hasAny(...trialsRoles.allKd)) {
				await member.roles.remove(trialsRoles.allKd);
			}
			if (!member.roles.cache.has(trialsRoles.wintrader)) {
				await member.roles.add(trialsRoles.wintrader);
			}
			return;
		}

		const userKD = kills / deaths;
		const cachedUserKd = cachedKDData.get(discordId);

		if (!cachedUserKd || cachedUserKd < kills + deaths) {
			cachedKDData.set(discordId, kills + deaths);
		} else if (cachedUserKd > kills + deaths) {
			return;
		}

		if (isNaN(userKD)) {
			console.error(`[Error code: 1019] KD is NaN for ${member.displayName}`);
			return;
		}

		for (const { kd, roleId } of trialsRoles.kd) {
			if (userKD < kd) continue;

			if (member.roles.cache.hasAny(...trialsRoles.allKd.filter((r) => r !== roleId))) {
				await member.roles.remove(trialsRoles.allKd.filter((r) => r !== roleId));
			}
			if (!member.roles.cache.has(roleId)) {
				await member.roles.add(!member.roles.cache.has(trialsRoles.category) ? [roleId, trialsRoles.category] : [roleId]);
			}

			return;
		}
	}
}
