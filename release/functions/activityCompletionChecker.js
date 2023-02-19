import { AuthData } from "../handlers/sequelize.js";
import { fetchRequest } from "./fetchRequest.js";
import { getRaidData } from "./raidFunctions.js";
import { clanOnline } from "../features/memberStatisticsHandler.js";
import raidMilestoneHashes from "./raidMilestones.js";
import { timer } from "./utilities.js";
export const activityCompletionCurrentProfiles = new Map();
export const completedPhases = new Map();
const currentlyRuning = new Map();
function compareObjects(obj1, obj2) {
    let changes = [];
    for (let i = 0; i < obj1.length; i++) {
        for (let key in obj1[i]) {
            if (obj1[i][key] !== obj2[i][key]) {
                changes.push(`${key} on index ${i} was changed`, obj1, obj2);
            }
        }
    }
    if (changes.length !== 0) {
        console.log(`DEBUG1 RaidCompletionChecker:`, changes);
    }
    else {
        console.log(`RaidCompletionChecker: Still same data`);
    }
}
export async function clanOnlineMemberActivityChecker() {
    const raidActivityModeHashes = [2166136261, 2043403989];
    for await (const [discordId, { membershipId, platform }] of clanOnline) {
        const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${membershipId}/?components=204`);
        const characterActivities = response.characterActivities.data;
        if (!characterActivities)
            continue;
        const characterIds = Object.keys(characterActivities);
        const mostRecentCharacterId = characterIds.reduce((a, b) => {
            const aDate = new Date(characterActivities[a].dateActivityStarted);
            const bDate = new Date(characterActivities[b].dateActivityStarted);
            return aDate > bDate ? a : b;
        });
        console.debug(`DEBUG 16002 Most recent character of ${discordId} | ${platform}/${membershipId} is ${mostRecentCharacterId}`);
        const activeCharacter = characterActivities[mostRecentCharacterId];
        if (activeCharacter.currentActivityModeType === 4 ||
            activeCharacter.currentActivityModeTypes?.includes(4) ||
            raidActivityModeHashes.includes(activeCharacter.currentActivityModeHash)) {
            console.debug(`DEBUG 16003 User found in raid activity ${discordId} | ${platform}/${membershipId} at ${mostRecentCharacterId}`);
            if (!activityCompletionCurrentProfiles.has(membershipId)) {
                console.debug(`DEBUG 16004 User not already checking ${discordId} | ${platform}/${membershipId} at ${mostRecentCharacterId}`);
                const authData = await AuthData.findByPk(discordId, { attributes: ["platform", "bungieId", "accessToken"] });
                const raidMilestoneHash = raidMilestoneHashes.get(activeCharacter.currentActivityHash);
                if (!authData)
                    return console.error(`[Error code: 1438] No authorization data for user ${membershipId}`, raidMilestoneHash, activeCharacter);
                if (!raidMilestoneHash)
                    return console.error(`[Error code: 1440] No raid milestone data for user ${authData.bungieId}\n${activeCharacter.currentActivityHash} - ${raidMilestoneHash}\n`, activeCharacter.currentActivityHash, activeCharacter.currentActivityModeHash, activeCharacter.dateActivityStarted, activeCharacter.currentActivityModeHashes, activeCharacter.currentActivityModeType, activeCharacter.currentActivityModeTypes);
                console.debug(`DEBUG 16005 User sent to checking ${discordId} | ${platform}/${membershipId} at ${mostRecentCharacterId}`);
                activityCompletionChecker({
                    accessToken: authData.accessToken,
                    bungieId: membershipId,
                    characterId: mostRecentCharacterId,
                    platform,
                    raid: raidMilestoneHash,
                });
            }
        }
        await timer(5000);
    }
    setTimeout(() => {
        clanOnlineMemberActivityChecker();
    }, 60 * 1000 * 4);
}
export async function activityCompletionChecker({ accessToken, bungieId, characterId, id, platform, raid }) {
    console.debug(`DEBUG 17000 Started activityCompletionChecker for ${platform}/${bungieId} | ${raid}`);
    const milestoneHash = typeof raid === "string" ? getRaidData(raid).milestoneHash : raid;
    let startTime = new Date().getTime();
    let interval;
    let previousActivityHash;
    let uniqueId = id || Math.floor(Math.random() * (1000 - 101 + 1)) + 101;
    async function checkActivityHash() {
        try {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                accessToken,
            });
            if (!response) {
                console.error(`[Error code: 1211] Error during checking character inside checkActivityHash function\n`, response, characterId);
                const authData = await AuthData.findOne({
                    where: { bungieId },
                    attributes: ["accessToken"],
                });
                if (authData && authData.accessToken)
                    accessToken = authData.accessToken;
                return null;
            }
            if (!response.activities?.data) {
                clearInterval(interval);
                currentlyRuning.delete(uniqueId);
                activityCompletionCurrentProfiles.delete(bungieId);
                return null;
            }
            const characterData = response.activities.data;
            const currentActivityHash = characterData.currentActivityHash;
            if (previousActivityHash === undefined) {
                previousActivityHash = currentActivityHash;
            }
            else if (currentActivityHash !== previousActivityHash) {
                clearInterval(interval);
                console.debug(`DEBUG4 Activity no longer checking becouse of changing it`);
                currentlyRuning.delete(uniqueId);
                activityCompletionCurrentProfiles.delete(bungieId);
                return null;
            }
            characterMilestonesChecker(response);
        }
        catch (error) {
            console.error(`[Error code: 1209]`, error);
        }
    }
    interval = setInterval(() => checkActivityHash(), 50000);
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
                    compareObjects(cachedMilestoneActivity.phases, updatedMilestoneActivity.phases);
                    for (const phaseIndexString in updatedMilestoneActivity.phases) {
                        const phaseIndex = parseInt(phaseIndexString);
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
                                let phase = alreadyCompletedPhases.find((ph) => ph.phase === updatedMilestoneActivity.phases[phaseIndex].phaseHash);
                                if (phase) {
                                    phase.end = new Date().getTime();
                                    alreadyCompletedPhases.splice(alreadyCompletedPhases.findIndex((ph) => ph.phase === updatedMilestoneActivity.phases[phaseIndex].phaseHash), 1, { ...phase });
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
                                        console.debug(`DEBUG9 | Activity checker ended due completion of actvitiy`);
                                    }
                                    console.debug(`DEBUG3 Index: ${phaseIndex}`, alreadyCompletedPhases);
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
export async function activityCompletionCheckerCancel({ id }) {
    if (currentlyRuning.has(id)) {
        clearInterval(currentlyRuning.get(id));
        currentlyRuning.delete(id);
        return "success";
    }
    else {
        return "not found";
    }
}
