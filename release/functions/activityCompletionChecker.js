import { AuthData } from "../handlers/sequelize.js";
import { fetchRequest } from "./fetchRequest.js";
import { getRaidData } from "./raidFunctions.js";
const currentProfiles = new Map();
const completedPhases = new Map();
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
    if (changes.length === 0) {
        console.log("DEBUG1 RaidCompletionChecker: Nothing is changed");
    }
    else {
        console.log(`DEBUG1 RaidCompletionChecker:`, changes);
    }
}
export async function activityCompletionChecker({ platform, bungieId, accessToken }, { id, raid }, characterId) {
    const { milestoneHash: activityMilestoneHash } = getRaidData(raid);
    let startTime = new Date().getTime();
    let interval;
    let previousActivityHash;
    async function checkActivityHash() {
        try {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                accessToken,
            });
            if (!response) {
                console.error(`[Error code: 1211]`, { response }, characterId);
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
                                        start: startTime,
                                        end: -1,
                                    },
                                ];
                                console.debug(`DEBUG2 checking`, alreadyCompletedPhases);
                                if (alreadyCompletedPhases.some((ph) => ph.phase === updatedMilestoneActivity.phases[phaseIndex].phaseHash)) {
                                    let phase = alreadyCompletedPhases.find((ph) => ph.phase === phaseIndex);
                                    console.debug(`DEBUG7 Checking ${phase}`);
                                    phase.end = new Date().getTime();
                                    alreadyCompletedPhases.splice(alreadyCompletedPhases.findIndex((ph) => ph.phase === updatedMilestoneActivity.phases[phaseIndex].phaseHash), 1, { ...phase });
                                    if (updatedMilestoneActivity.phases[phaseIndex + 1] !== undefined &&
                                        updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash !== undefined)
                                        alreadyCompletedPhases.push({
                                            phase: updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash,
                                            start: phase.end,
                                            end: -1,
                                        });
                                    console.debug(`DEBUG3 Completed phasesUpdated`, {
                                        alreadyCompletedPhases,
                                    });
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
