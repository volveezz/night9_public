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
    const raidActivityModeHash = 2043403989;
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
        const activeCharacter = characterActivities[mostRecentCharacterId];
        if ((activeCharacter.currentActivityModeType === 4 ||
            activeCharacter.currentActivityModeTypes?.includes(4)) &&
            activeCharacter.currentActivityModeHash === raidActivityModeHash) {
            if (!activityCompletionCurrentProfiles.has(membershipId)) {
                const authData = await AuthData.findByPk(discordId, { attributes: ["platform", "bungieId", "accessToken"] });
                const raidMilestoneHash = raidMilestoneHashes.get(activeCharacter.currentActivityHash);
                if (!authData || !raidMilestoneHash)
                    return console.error(`[Error code: 1438]`, authData, raidMilestoneHash, activeCharacter);
                activityCompletionChecker({
                    accessToken: authData.accessToken,
                    bungieId: membershipId,
                    characterId: mostRecentCharacterId,
                    platform,
                    raid: raidMilestoneHash,
                });
                console.debug(`DEBUG775 Started auto checker for ${platform}/${membershipId}/${mostRecentCharacterId}`);
            }
        }
        await timer(5000);
    }
    setTimeout(() => {
        clanOnlineMemberActivityChecker();
    }, 60 * 1000 * 8);
}
export async function activityCompletionChecker({ accessToken, bungieId, characterId, id, platform, raid }) {
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
                    where: { bungieId: bungieId },
                    attributes: ["accessToken"],
                });
                if (authData && authData.accessToken)
                    accessToken = authData.accessToken;
                return null;
            }
            if (!response.activities?.data) {
                clearInterval(interval);
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
                return null;
            }
            characterMilestonesChecker(response);
        }
        catch (error) {
            console.error(`[Error code: 1209]`, error);
        }
    }
    interval = setInterval(() => checkActivityHash(), 60000);
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
