import { fetchRequest } from "./fetchRequest.js";
const currentProfiles = new Map();
const completedPhases = new Map();
export async function activityCompletionChecker({ platform, bungieId: bungieId, accessToken: accessToken }, characterId) {
    let interval;
    let previousActivityHash;
    let activityMilestoneHash;
    async function checkActivityHash() {
        try {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                accessToken,
            });
            if (!response.activities.data)
                return null;
            const characterData = response.activities.data;
            const currentActivityHash = characterData.currentActivityHash;
            if (previousActivityHash === undefined) {
                previousActivityHash = currentActivityHash;
            }
            else if (currentActivityHash !== previousActivityHash) {
                clearInterval(interval);
                return "Активность более не проверяется т.к. вы сменили её";
            }
            characterMilestonesChecker(response);
        }
        catch (error) {
            console.error(`[Error code: 1209]`, error);
        }
    }
    interval = setInterval(checkActivityHash, 60000);
    async function characterMilestonesChecker(response) {
        const characterMilestones = response.progressions.data.milestones;
        if (!activityMilestoneHash) {
            for (const milestoneHash in characterMilestones) {
                const milestone = characterMilestones[milestoneHash];
                if (milestone.activities.some((activity) => activity.activityHash === previousActivityHash)) {
                    activityMilestoneHash = milestoneHash;
                    break;
                }
            }
        }
        const updatedMilestone = characterMilestones[parseInt(activityMilestoneHash)];
        if (currentProfiles.has(bungieId)) {
            const cachedMilestone = currentProfiles.get(bungieId);
            if (cachedMilestone !== updatedMilestone) {
                for (const milestineIndex in updatedMilestone.activities) {
                    const cachedMilestoneActivity = cachedMilestone.activities[milestineIndex];
                    const updatedMilestoneActivity = updatedMilestone.activities[milestineIndex];
                    for (const phaseIndex in updatedMilestoneActivity.phases) {
                        const cachedMilestonePhase = cachedMilestoneActivity.phases[parseInt(phaseIndex)];
                        const updatedMilestonePhase = updatedMilestoneActivity.phases[parseInt(phaseIndex)];
                        if (cachedMilestonePhase.phaseHash === updatedMilestonePhase.phaseHash) {
                            if (cachedMilestonePhase.complete !== updatedMilestonePhase.complete) {
                                let alreadyCompletedPhases = completedPhases.get(bungieId);
                                if (!alreadyCompletedPhases) {
                                    break;
                                }
                                if (alreadyCompletedPhases.some((ph) => ph.phase === phaseIndex)) {
                                    let phase = alreadyCompletedPhases.find((ph) => ph.phase === phaseIndex);
                                    phase.end = new Date().getTime();
                                    alreadyCompletedPhases.splice(alreadyCompletedPhases.findIndex((ph) => ph.phase === phaseIndex), 1, { ...phase });
                                    if (updatedMilestoneActivity.phases[parseInt(phaseIndex) + 1] !== undefined)
                                        alreadyCompletedPhases.push({ phase: phaseIndex + 1, start: phase.end, end: -1 });
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
