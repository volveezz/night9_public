import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import { DestinyActivityModeType, DestinyHistoricalStatsAccountResult, DestinyProfileResponse } from "bungie-api-ts/destiny2/interfaces.js";
import { GuildMember, Snowflake, User } from "discord.js";
import Sequelize from "sequelize";
import NightRoleCategory from "../../configs/RoleCategory.js";
import { activityRoles, guardianRankRoles, seasonalRoles, statisticsRoles, trialsRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import BungieAPIError from "../../structures/BungieAPIError.js";
import { sendApiRequest } from "../../utils/api/sendApiRequest.js";
import { getEndpointStatus, updateEndpointStatus } from "../../utils/api/statusCheckers/statusTracker.js";
import { destinyActivityChecker } from "../../utils/general/destinyActivityChecker.js";
import { pause } from "../../utils/general/utilities.js";
import { bungieNames, clanOnline, longOffline, userTimezones } from "../../utils/persistence/dataStore.js";
import { AuthData } from "../../utils/persistence/sequelizeModels/authData.js";
import { AutoRoleData } from "../../utils/persistence/sequelizeModels/autoRoleData.js";
import { UserActivityData } from "../../utils/persistence/sequelizeModels/userActivityData.js";
import clanMembersManagement from "../clanMembersManagement.js";
import assignDlcRoles from "./assignDlcRoles.js";
import { triumphsChecker } from "./checkUserTriumphs.js";
const { Op } = Sequelize;

let isThrottleRequired = false;

async function checkUserStatisticsRoles(
	{ platform, discordId, bungieId, accessToken, displayName, roleCategoriesBits, UserActivityData: userActivity }: AuthData,
	member: GuildMember,
	roleDataFromDatabase: AutoRoleData[],
	isEasyCheck: boolean = false
) {
	const roleIdsForAdding: string[] = [];
	const roleIdsForRemoval: string[] = [];

	const hasRole = (roleId: string) => member.roles.cache.has(roleId);
	const hasAnyRole = (roleIds: string[]) => member.roles.cache.hasAny(...roleIds);

	const response = await sendApiRequest<DestinyProfileResponse>(
		`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,900,1100`,
		accessToken
	);

	if (!response) {
		console.error(`[Error code: 1751] Received error for ${platform}/${bungieId} ${displayName}`);
		isThrottleRequired = true;
		return;
	}

	try {
		const profileData = response.profile.data;

		let promises = [];

		if (profileData != null) {
			const { dateLastPlayed, userInfo, currentGuardianRank, seasonHashes, versionsOwned } = profileData;

			if (!bungieNames.get(discordId)) {
				const { displayName, bungieGlobalDisplayName: bungieName, bungieGlobalDisplayNameCode: bungieNameCode } = userInfo;

				const bungieCode = (bungieNameCode ?? "0000").toString().padStart(4, "0");

				bungieNames.set(discordId, `${bungieName ?? displayName}#${bungieCode}`);
			}

			// If member not played in last hour it will add him to longOffline set
			// It prevents from checking him
			const lastPlayedDate = new Date(dateLastPlayed).getTime();
			if (Date.now() - lastPlayedDate > 1000 * 60 * 60) longOffline.add(member.id);

			// Give 'Verified' role to member if he doesn't have one already
			// Sometimes it removed from member for different reasons
			if (!hasRole(process.env.VERIFIED!)) roleIdsForAdding.push(process.env.VERIFIED!);

			try {
				const guardianRankRoleId = (guardianRankRoles.ranks[currentGuardianRank - 1] || guardianRankRoles.ranks[0]).roleId;

				const restRankRoles = guardianRankRoles.allRoles.filter((roleId) => roleId !== guardianRankRoleId);

				if (hasAnyRole(restRankRoles)) {
					roleIdsForRemoval.push(...restRankRoles);
				}
				if (!hasRole(guardianRankRoleId)) {
					roleIdsForAdding.push(guardianRankRoleId);
				}
			} catch (error) {
				console.error("[Error code: 1644]", error);
			}

			// Seasonal Roles checker
			const hasCurrentSeasonRole = hasRole(seasonalRoles.currentSeasonRole);
			const hasNonCurrentSeasonRole = hasRole(seasonalRoles.nonCurrentSeasonRole);
			const includesCurrentSeasonHash = seasonHashes.includes(profileData.currentSeasonHash!);

			if (includesCurrentSeasonHash) {
				if (!hasCurrentSeasonRole) roleIdsForAdding.push(seasonalRoles.currentSeasonRole);
				if (hasNonCurrentSeasonRole) roleIdsForRemoval.push(seasonalRoles.nonCurrentSeasonRole);
			} else {
				if (!hasNonCurrentSeasonRole) roleIdsForAdding.push(seasonalRoles.nonCurrentSeasonRole);
				if (hasCurrentSeasonRole) roleIdsForRemoval.push(seasonalRoles.currentSeasonRole);
			}

			promises.push(
				assignDlcRoles({
					addRoles: roleIdsForAdding,
					member,
					removeRoles: roleIdsForRemoval,
					versionsOwned,
				})
			);
		} else {
			console.error("[Error code: 2022] Profile data is null", response);
		}

		if (!isEasyCheck) {
			if (response.profileRecords.data) {
				promises.push(
					triumphsChecker({
						hasRole,
						hasAnyRole,
						member,
						profileResponse: response.profileRecords.data,
						roleCategoriesBits,
						characterResponse: response.characterRecords.data,
						roleData: roleDataFromDatabase,
						roleIdsForAdding,
						roleIdsForRemoval,
					})
				);
			}

			// Trials of osiris roles checker
			if (roleCategoriesBits & NightRoleCategory.Trials && response.metrics.data) {
				const metrics = response.metrics.data.metrics["1765255052"]?.objectiveProgress?.progress;
				if (metrics == null || isNaN(metrics)) {
					console.error(
						`[Error code: 1227] ${metrics} ${member.displayName}`,
						response.metrics.data.metrics["1765255052"]?.objectiveProgress
					);
					return;
				} else if (metrics > 0) {
					for (const { roleId, totalFlawless } of trialsRoles.roles) {
						if (totalFlawless <= metrics) {
							if (!hasRole(trialsRoles.category)) roleIdsForAdding.push(trialsRoles.category);

							const restTrialsRoles = trialsRoles.allRoles.filter((r) => r != roleId);

							if (hasAnyRole(restTrialsRoles)) {
								roleIdsForRemoval.push(...restTrialsRoles);
							}
							if (!hasRole(roleId)) {
								roleIdsForAdding.push(roleId);
							}
							break;
						}
					}
				}
			}

			// Activity roles checker
			if (roleCategoriesBits & NightRoleCategory.Activity) {
				if (!userActivity) {
					if (hasAnyRole(activityRoles.allVoice)) roleIdsForRemoval.push(...activityRoles.allVoice);
					if (hasAnyRole(activityRoles.allMessages)) roleIdsForRemoval.push(...activityRoles.allMessages);
					if (hasRole(activityRoles.category)) roleIdsForRemoval.push(activityRoles.category);
				} else {
					for (const { roleId, voiceMinutes } of activityRoles.voice) {
						if (voiceMinutes <= userActivity.voice) {
							if (!hasRole(activityRoles.category)) roleIdsForAdding.push(activityRoles.category);

							const restActivityRoles = activityRoles.allVoice.filter((r) => r != roleId);

							if (hasAnyRole(restActivityRoles)) {
								roleIdsForRemoval.push(...restActivityRoles);
							}
							if (!hasRole(roleId)) {
								roleIdsForAdding.push(roleId);
							}
							break;
						}
					}
					for (const { roleId, messageCount } of activityRoles.messages) {
						if (messageCount <= userActivity.messages) {
							if (!hasRole(activityRoles.category) && !roleIdsForAdding.includes(activityRoles.category))
								roleIdsForAdding.push(activityRoles.category);

							const restActivityRoles = activityRoles.allMessages.filter((r) => r != roleId);

							if (hasAnyRole(restActivityRoles)) {
								roleIdsForRemoval.push(...restActivityRoles);
							}
							if (!hasRole(roleId)) {
								roleIdsForAdding.push(roleId);
							}
							break;
						}
					}
				}
			}
		}

		await Promise.allSettled(promises);

		if (roleIdsForRemoval.length > 0) {
			await member.roles
				.remove(roleIdsForRemoval, "Role(s) removed by autorole system")
				.catch((e) => console.error(`[Error code: 1226] Error during removing roles`, e, roleIdsForRemoval));
		}
		if (roleIdsForAdding.length > 0) {
			await member.roles
				.add(roleIdsForAdding, "Role(s) added by autorole system")
				.catch((e) => console.error("[Error code: 1097] Error during adding roles", e, roleIdsForAdding));
		}
	} catch (e: any) {
		if (e.statusCode >= 400 || e.statusCode <= 599) {
			console.error(`[Error code: 1229] ${e.statusCode}`);
		} else {
			console.error("[Error code: 1230]", e.error?.stack || e.error || e, e.statusCode);
		}
	}
}

async function checkUserKDRatio({ platform, bungieId, accessToken }: AuthData, member: GuildMember) {
	if (getEndpointStatus("account") !== PlatformErrorCodes.Success) return;

	const hasRole = (roleId: string) => member.roles.cache.has(roleId);
	const hasAnyRole = (roleIds: string[]) => member.roles.cache.hasAny(...roleIds);

	try {
		const request = await sendApiRequest<DestinyHistoricalStatsAccountResult>(
			`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`,
			accessToken
		);

		if (!request) {
			isThrottleRequired = true;
			return;
		}

		if (!request.mergedAllCharacters?.results) {
			isThrottleRequired = true;
			return console.error(`[Error code: 1634] Got error ${(request as any)?.ErrorStatus} during checking KD of ${member.displayName}`);
		}

		const crucibleKdValue = request.mergedAllCharacters.results.allPvP?.allTime?.killsDeathsRatio?.basic?.value;

		// Exit if player never played crucible
		if (!crucibleKdValue) {
			await member.roles.add([statisticsRoles.allKd[statisticsRoles.allKd.length - 1], process.env.STATISTICS_CATEGORY!]);
			return;
		}

		for (const { roleId, kd } of statisticsRoles.kd) {
			if (kd <= crucibleKdValue) {
				const addedRoles: string[] = [];
				if (!hasRole(process.env.STATISTICS_CATEGORY!)) {
					addedRoles.push(process.env.STATISTICS_CATEGORY!);
				}

				const restKdRoles = statisticsRoles.allKd.filter((r) => r !== roleId);

				if (hasAnyRole(restKdRoles)) {
					await member.roles.remove(restKdRoles);
				}

				if (!hasRole(roleId)) {
					await member.roles.add([roleId, ...addedRoles]);
				}

				break;
			}
		}
	} catch (e: any) {
		if (e instanceof BungieAPIError && e.errorCode) {
			console.error(`[Error code: 2049] Received ${e.errorCode}/${e.errorStatus} error during checking KD of ${member.displayName}`);
			updateEndpointStatus("account", e.errorCode);
		} else if (e.statusCode >= 400 || e.statusCode <= 599) {
			console.error(`[Error code: 1219] ${e.statusCode} error for ${bungieId}`);
		} else {
			isThrottleRequired = true;
			console.error(
				"[Error code: 1016]",
				e.error?.message || e.message || e.error?.name || e.name,
				bungieId,
				e.statusCode || e,
				e?.ErrorStatus
			);
		}
	}
}

async function handleMemberStatistics() {
	(async () => {
		try {
			// Fetch data from the database
			const userDatabaseDataPromise = AuthData.findAll({
				attributes: ["discordId", "platform", "bungieId", "clan", "timezone", "accessToken", "roleCategoriesBits"],
			});
			const autoRoleDataPromise = AutoRoleData.findAll({
				where: {
					available: {
						[Op.or]: {
							[Op.gte]: 1,
							[Op.eq]: -99,
						},
					},
				},
			});

			const [userDatabaseData, autoRoleData] = await Promise.all([userDatabaseDataPromise, autoRoleDataPromise]);

			const cachedMembers = client.getCachedMembers();

			// Loop through each user data
			for (const userData of userDatabaseData) {
				const cachedMember = cachedMembers.get(userData.discordId);

				if (!userData.clan && cachedMember) {
					checkUserStatisticsRoles(userData, cachedMember, autoRoleData, true);
				}

				// Store timezone
				if (userData.timezone) {
					userTimezones.set(userData.discordId, userData.timezone);
				}

				// If member is not in cache, skip this iteration
				if (!cachedMember) continue;

				// Wait 1 second before calling activity checker
				await pause(1000);

				// Call activity checker
				destinyActivityChecker({ authData: userData, member: cachedMember, mode: DestinyActivityModeType.Raid, count: 250 });
			}
		} catch (error) {
			console.error("[Error code: 1918]", error);
		}
	})();

	async function startStatisticsChecking() {
		try {
			const autoRoleDataPromise = AutoRoleData.findAll({
				where: {
					available: {
						[Op.or]: {
							[Op.gte]: 1,
							[Op.eq]: -99,
						},
					},
				},
			});
			const rawDatabaseDataPromise = AuthData.findAll({
				attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "accessToken", "roleCategoriesBits"],
				include: UserActivityData,
			});

			const cachedMembers = client.getCachedMembers();

			const [autoRoleData, rawDatabaseData] = await Promise.all([autoRoleDataPromise, rawDatabaseDataPromise]);

			rawDatabaseData
				.filter((data) => !cachedMembers.has(data.discordId))
				.forEach((val) => {
					// console.debug(`[Error code: 1021] ${val.displayName}/${val.discordId} not found on server`);
				});

			const validatedDatabaseData = rawDatabaseData.filter((data) => cachedMembers.has(data.discordId));
			if (!validatedDatabaseData || validatedDatabaseData.length === 0) {
				return console.error(
					`[Error code: 1022] DB is ${validatedDatabaseData ? `${validatedDatabaseData.length} size` : "not available"}`
				);
			}

			async function processUsers() {
				if (getEndpointStatus("account") !== PlatformErrorCodes.Success) return;

				for (const userData of validatedDatabaseData) {
					const { discordId, displayName, roleCategoriesBits } = userData;

					const randomValue = Math.floor(Math.random() * 100);

					// Throttle if game API is not working properly
					if (isThrottleRequired) {
						isThrottleRequired = false;
						return;
					} else if (longOffline.has(discordId)) {
						if (randomValue > 90 || clanOnline.has(discordId)) longOffline.delete(discordId);
						continue;
					}

					const member = cachedMembers.get(discordId)!;
					if (!member) {
						await client.getCachedGuild().members.fetch();
						console.error(`[Error code: 1023] Member ${displayName} not found`);
						continue;
					}

					if (
						member.roles.cache.has(process.env.CLANMEMBER!) ||
						(userData.UserActivityData && (userData.UserActivityData.voice > 120 || userData.UserActivityData.messages > 5))
					) {
						switch (true) {
							case randomValue <= 30:
								checkUserStats();
								checkCompletedRaidStats();
								break;
							case randomValue <= 45:
								checkUserStats();
								break;
							case randomValue < 60:
								checkUserStats();
								checkTrialsKDStats();
								break;
							case randomValue <= 80:
								checkUserStats();
								break;
							default:
								checkUserKDRatioStats();
								break;
						}

						await pause(1000);
					} else if (!userData.UserActivityData) {
						console.error("[Error code: 2114] User has no user activity data", userData.discordId);
					}

					function checkUserStats() {
						checkUserStatisticsRoles(userData, member, autoRoleData);
					}

					function checkUserKDRatioStats() {
						if (roleCategoriesBits & NightRoleCategory.Stats) {
							checkUserKDRatio(userData, member);
						}
					}

					function checkCompletedRaidStats() {
						if (member.roles.cache.hasAny(process.env.CLANMEMBER!, process.env.MEMBER!)) {
							destinyActivityChecker({ authData: userData, member, mode: DestinyActivityModeType.Raid });
						}
					}

					function checkTrialsKDStats() {
						if (
							roleCategoriesBits & NightRoleCategory.Trials &&
							!member.roles.cache.has(trialsRoles.wintrader) &&
							member.roles.cache.has(trialsRoles.category)
						) {
							destinyActivityChecker({ authData: userData, member, mode: DestinyActivityModeType.TrialsOfOsiris });
						}
					}
				}
			}

			await Promise.all([processUsers(), clanMembersManagement(validatedDatabaseData)]);
		} catch (error: any) {
			console.error("[Error code: 1921]", error.stack || error);
		} finally {
			setTimeout(startStatisticsChecking, 1000 * 60 * 2);
		}
	}
	setTimeout(startStatisticsChecking, 1000 * 60 * 2);
}

async function checkIndiviualUserStatistics(user: User | GuildMember | Snowflake) {
	const userId = typeof user === "string" ? user : user.id;

	const memberPromise = client.getMember(userId);
	const databasePromise = AuthData.findOne({
		where: { discordId: userId },
		attributes: ["discordId", "bungieId", "platform", "accessToken", "displayName", "roleCategoriesBits"],
		include: UserActivityData,
	});
	const autoRoleDataPromise = AutoRoleData.findAll({
		where: {
			available: {
				[Op.or]: {
					[Op.gte]: 1,
					[Op.eq]: -99,
				},
			},
		},
	});

	const [databaseData, member, autoRoleData] = await Promise.all([databasePromise, memberPromise, autoRoleDataPromise]);

	if (!member || !databaseData) {
		console.error(`[Error code: 1737]`, member.id);
		return;
	}

	await checkUserStatisticsRoles(databaseData, member, autoRoleData, true);
	await destinyActivityChecker({ authData: databaseData, member, mode: DestinyActivityModeType.Raid, count: 250 });
}

export { checkIndiviualUserStatistics };
export default handleMemberStatistics;
