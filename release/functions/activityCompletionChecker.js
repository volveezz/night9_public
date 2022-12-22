import { fetchRequest } from "./fetchRequest.js";
import { getRaidData } from "./raidFunctions.js";
const currentProfiles = new Map();
const completedPhases = new Map();
const currentlyRuning = new Map();
export async function activityCompletionChecker({ platform, bungieId: bungieId, accessToken: accessToken }, { id, raid }, characterId) {
    const { milestoneHash: activityMilestoneHash } = getRaidData(raid);
    let interval;
    let previousActivityHash;
    async function checkActivityHash() {
        try {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                accessToken,
            });
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
    currentlyRuning.set(id, interval);
    async function characterMilestonesChecker(response) {
        const characterMilestones = response.progressions.data.milestones;
        const updatedMilestone = characterMilestones[activityMilestoneHash];
        if (currentProfiles.has(bungieId)) {
            const cachedMilestone = currentProfiles.get(bungieId);
            if (cachedMilestone !== updatedMilestone) {
                for (const milestineIndex in updatedMilestone.activities) {
                    const cachedMilestoneActivity = cachedMilestone.activities[milestineIndex];
                    const updatedMilestoneActivity = updatedMilestone.activities[milestineIndex];
                    console.debug(`DEBUG1 checking ${milestineIndex}`);
                    for (const phaseIndexString in updatedMilestoneActivity.phases) {
                        const phaseIndex = parseInt(phaseIndexString);
                        const cachedMilestonePhase = cachedMilestoneActivity.phases[phaseIndex];
                        const updatedMilestonePhase = updatedMilestoneActivity.phases[phaseIndex];
                        console.debug(`DEBUG2 checking ${phaseIndex}`, cachedMilestonePhase.phaseHash, updatedMilestonePhase.phaseHash);
                        if (cachedMilestonePhase.phaseHash === updatedMilestonePhase.phaseHash) {
                            if (cachedMilestonePhase.complete !== updatedMilestonePhase.complete) {
                                let alreadyCompletedPhases = completedPhases.get(bungieId) || [
                                    { phase: updatedMilestoneActivity.phases[0].phaseHash, start: new Date().getTime(), end: 0 },
                                ];
                                if (alreadyCompletedPhases.some((ph) => ph.phase === phaseIndex)) {
                                    let phase = alreadyCompletedPhases.find((ph) => ph.phase === phaseIndex);
                                    console.debug(`DEBUG7 Checking ${phase}`);
                                    phase.end = new Date().getTime();
                                    alreadyCompletedPhases.splice(alreadyCompletedPhases.findIndex((ph) => ph.phase === phaseIndex), 1, { ...phase });
                                    if (updatedMilestoneActivity.phases[phaseIndex + 1] !== undefined)
                                        alreadyCompletedPhases.push({ phase: phaseIndex + 1, start: phase.end, end: -1 });
                                    console.debug(`DEBUG3 Completed phasesUpdated`, { alreadyCompletedPhases });
                                    completedPhases.set(bungieId, alreadyCompletedPhases);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        currentProfiles.set(bungieId, updatedMilestone);
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