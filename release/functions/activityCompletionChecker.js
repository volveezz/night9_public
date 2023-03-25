import { clanOnline } from "../features/memberStatisticsHandler.js";
import { AuthData } from "../handlers/sequelize.js";
import { apiStatus } from "../structures/apiStatus.js";
import { fetchRequest } from "./fetchRequest.js";
import { CachedDestinyActivityDefinition } from "./manifestHandler.js";
import { getRaidData } from "./raidFunctions.js";
import raidMilestoneHashes from "./raidMilestones.js";
import { timer } from "./utilities.js";
export const activityCompletionCurrentProfiles = new Map();
export const completedPhases = new Map();
const currentlyRuning = new Map();
const raidActivityModeHashes = 2043403989;
export async function clanOnlineMemberActivityChecker() {
    setInterval(async () => {
        if (apiStatus.status !== 1)
            return;
        const checkingUsers = new Map(clanOnline);
        for (const [discordId, { membershipId, platform }] of checkingUsers) {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${membershipId}/?components=204,1000`);
            if (!response || !response.characterActivities) {
                console.error(`[Error code: 1612] Error during checking clan members`, response);
                break;
            }
            const characterActivities = response.characterActivities.data;
            if (!characterActivities)
                continue;
            const characterIds = Object.keys(characterActivities);
            const mostRecentCharacterId = characterIds.reduce((a, b) => {
                const aDate = new Date(characterActivities[a].dateActivityStarted);
                const bDate = new Date(characterActivities[b].dateActivityStarted);
                return aDate > bDate ? a : b;
            });
            const activeCharacter = characterActivities[mostRecentCharacterId];
            if (activeCharacter.currentActivityModeType === 4 ||
                (activeCharacter.currentActivityModeTypes && activeCharacter.currentActivityModeTypes.includes(4)) ||
                raidActivityModeHashes === activeCharacter.currentActivityModeHash ||
                (activeCharacter.currentActivityHash &&
                    CachedDestinyActivityDefinition[activeCharacter.currentActivityHash]?.activityTypeHash === raidActivityModeHashes)) {
                if (!activityCompletionCurrentProfiles.has(membershipId)) {
                    const authData = await AuthData.findByPk(discordId, { attributes: ["platform", "bungieId", "accessToken"] });
                    const raidMilestoneHash = raidMilestoneHashes.get(activeCharacter.currentActivityHash);
                    if (!authData)
                        return console.error(`[Error code: 1438] No authorization data for user ${membershipId}`, raidMilestoneHash, activeCharacter);
                    if (!raidMilestoneHash)
                        return console.error(`[Error code: 1440] No raid milestone data for user ${authData.bungieId}\n${activeCharacter.currentActivityHash} - ${raidMilestoneHash}\n`, JSON.parse(activeCharacter.toString()));
                    activityCompletionChecker({
                        accessToken: authData.accessToken,
                        bungieId: membershipId,
                        characterId: mostRecentCharacterId,
                        platform,
                        raid: raidMilestoneHash,
                        discordId,
                    });
                }
            }
            await timer(4000);
        }
    }, 60 * 1000 * 8);
}
export async function activityCompletionChecker({ accessToken, bungieId, characterId, id, platform, raid, discordId, }) {
    const milestoneHash = typeof raid === "string" ? getRaidData(raid).milestoneHash : raid;
    let startTime = Date.now();
    let interval;
    let previousActivityHash;
    let uniqueId = id || Math.floor(Math.random() * (1000 - 101 + 1)) + 101;
    let isErrorHappen = false;
    async function checkActivityHash() {
        try {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                accessToken,
            });
            if (!response) {
                if (isErrorHappen) {
                    clearInterval(interval);
                    currentlyRuning.delete(uniqueId);
                    activityCompletionCurrentProfiles.delete(bungieId);
                    console.error(`[Error code: 1611] Checker stopped for ${platform}/${bungieId}/${characterId} becouse of continuous errors\n`);
                }
                isErrorHappen = true;
                console.error(`[Error code: 1630] Error during checking character of (${platform}/${bungieId}/${characterId}) inside checkActivityHash function`);
                const authData = await AuthData.findOne({
                    where: { bungieId },
                    attributes: ["accessToken"],
                });
                if (authData && authData.accessToken)
                    accessToken = authData.accessToken;
                return;
            }
            if (!response.activities?.data) {
                clearInterval(interval);
                currentlyRuning.delete(uniqueId);
                activityCompletionCurrentProfiles.delete(bungieId);
                console.debug(`DEBUG 17001 Exit from checkActivityHash due of not found character data`);
                return;
            }
            const characterData = response.activities.data;
            const currentActivityHash = characterData.currentActivityHash;
            if (previousActivityHash === undefined) {
                previousActivityHash = currentActivityHash;
            }
            else if (currentActivityHash !== previousActivityHash ||
                currentActivityHash === 82913930 ||
                CachedDestinyActivityDefinition[currentActivityHash]?.activityTypeHash !== raidActivityModeHashes ||
                (discordId && !clanOnline.has(discordId))) {
                clearInterval(interval);
                currentlyRuning.delete(uniqueId);
                activityCompletionCurrentProfiles.delete(bungieId);
                const cachedData = completedPhases.get(bungieId);
                setTimeout(() => {
                    if (completedPhases.get(bungieId) === cachedData)
                        completedPhases.delete(bungieId);
                }, 60 * 1000 * 30);
                return null;
            }
            characterMilestonesChecker(response);
        }
        catch (error) {
            console.error(`[Error code: 1636]`, error);
        }
    }
    interval = setInterval(() => {
        if (currentlyRuning.has(uniqueId)) {
            checkActivityHash();
        }
        else {
            clearInterval(interval);
        }
    }, 50000);
    currentlyRuning.set(uniqueId, interval);
    async function characterMilestonesChecker(response) {
        const characterMilestones = response.progressions.data.milestones;
        const updatedMilestone = characterMilestones[milestoneHash];
        if (activityCompletionCurrentProfiles.has(bungieId)) {
            const cachedMilestone = activityCompletionCurrentProfiles.get(bungieId);
            if (cachedMilestone !== updatedMilestone) {
                for (const milestineIndex in updatedMilestone.activities) {
                    const cachedMilestoneActivity = cachedMilestone.activities[milestineIndex];
                    const updatedMilestoneActivity = updatedMilestone.activities[milestineIndex];
                    if (!cachedMilestoneActivity ||
                        !cachedMilestoneActivity.phases ||
                        !updatedMilestoneActivity ||
                        !updatedMilestoneActivity.phases ||
                        !updatedMilestoneActivity.phases[0] ||
                        !updatedMilestoneActivity.phases[0].phaseHash)
                        return console.error(`[Error code: 1645]`, cachedMilestoneActivity, updatedMilestoneActivity);
                    for (const phaseIndexString in updatedMilestoneActivity.phases) {
                        const phaseIndex = parseInt(phaseIndexString);
                        if (phaseIndex == null)
                            return console.error(`[Error code: 1651]`, updatedMilestoneActivity);
                        const cachedMilestonePhase = cachedMilestoneActivity.phases[phaseIndex];
                        const updatedMilestonePhase = updatedMilestoneActivity.phases[phaseIndex];
                        if (cachedMilestonePhase?.phaseHash === updatedMilestonePhase?.phaseHash) {
                            if (cachedMilestonePhase.complete !== updatedMilestonePhase.complete) {
                                let alreadyCompletedPhases = completedPhases.get(bungieId) || [
                                    {
                                        phase: updatedMilestoneActivity.phases[phaseIndex].phaseHash,
                                        phaseIndex: phaseIndex + 1,
                                        start: startTime,
                                        end: -1,
                                    },
                                ];
                                let phase = alreadyCompletedPhases[alreadyCompletedPhases.length - 1];
                                if (phase) {
                                    phase.end = Date.now();
                                    alreadyCompletedPhases.splice(alreadyCompletedPhases.length > 0 ? alreadyCompletedPhases.length - 1 : 0, 1, {
                                        ...phase,
                                    });
                                    if (updatedMilestoneActivity.phases[phaseIndex + 1] !== undefined &&
                                        updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash !== undefined) {
                                        alreadyCompletedPhases.push({
                                            phase: updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash,
                                            phaseIndex: phaseIndex + 2,
                                            start: phase.end,
                                            end: -1,
                                        });
                                    }
                                    else {
                                        currentlyRuning.delete(uniqueId);
                                    }
                                    completedPhases.set(bungieId, alreadyCompletedPhases);
                                    break;
                                }
                            }
                        }
                        else if (!cachedMilestone || !updatedMilestone) {
                            console.error(`[Error code: 1218]`, cachedMilestone, updatedMilestone);
                        }
                    }
                }
            }
        }
        activityCompletionCurrentProfiles.set(bungieId, updatedMilestone);
    }
}
