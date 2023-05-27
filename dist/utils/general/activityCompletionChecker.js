import { clanOnline } from "../../core/userStatisticsManagement.js";
import { apiStatus } from "../../structures/apiStatus.js";
import { fetchRequest } from "../api/fetchRequest.js";
import { CachedDestinyActivityDefinition } from "../api/manifestHandler.js";
import { AuthData } from "../persistence/sequelize.js";
import { getRaidData } from "./raidFunctions.js";
import { raidMilestoneHashes } from "./raidMilestones.js";
import { timer } from "./utilities.js";
export const activityCompletionCurrentProfiles = new Map();
export const completedPhases = new Map();
const currentlyRunning = new Map();
const raidActivityModeHashes = 2043403989;
export async function clanOnlineMemberActivityChecker() {
    setInterval(async () => {
        if (apiStatus.status !== 1)
            return;
        const checkingUsers = new Map(clanOnline);
        for (const [discordId, { membershipId, platform }] of checkingUsers) {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${membershipId}/?components=204`);
            if (!response || !response.characterActivities) {
                console.error(`[Error code: 1612] ${platform}/${membershipId} of ${discordId}`, response);
                break;
            }
            const characterActivities = response.characterActivities.data;
            if (!characterActivities)
                continue;
            const mostRecentCharacterId = findMostRecentCharacterId(characterActivities);
            const activeCharacter = characterActivities[mostRecentCharacterId];
            if (!isRaidActivity(activeCharacter)) {
                await timer(2000);
                continue;
            }
            if (!activityCompletionCurrentProfiles.has(mostRecentCharacterId)) {
                const authData = await AuthData.findByPk(discordId, { attributes: ["platform", "bungieId", "accessToken"] });
                const raidMilestoneHash = raidMilestoneHashes.get(activeCharacter.currentActivityHash);
                if (!authData) {
                    console.error(`[Error code: 1438] No authorization data for user ${membershipId}`, raidMilestoneHash, activeCharacter);
                    continue;
                }
                if (!raidMilestoneHash) {
                    console.error(`[Error code: 1440] No raid milestone data for user ${authData.bungieId}\n${activeCharacter.currentActivityHash} - ${raidMilestoneHash}\n`, JSON.parse(activeCharacter.toString()));
                    continue;
                }
                activityCompletionChecker({
                    bungieId: membershipId,
                    characterId: mostRecentCharacterId,
                    platform,
                    raid: raidMilestoneHash,
                    discordId,
                });
            }
            await timer(4000);
        }
    }, 60 * 1000 * 8);
}
function findMostRecentCharacterId(characterActivities) {
    const characterIds = Object.keys(characterActivities);
    return characterIds.reduce((a, b) => {
        const aDate = new Date(characterActivities[a].dateActivityStarted);
        const bDate = new Date(characterActivities[b].dateActivityStarted);
        return aDate > bDate ? a : b;
    });
}
function isRaidActivity(activeCharacter) {
    return (activeCharacter.currentActivityModeType === 4 ||
        activeCharacter.currentActivityModeTypes?.includes(4) ||
        false ||
        raidActivityModeHashes === activeCharacter.currentActivityModeHash ||
        (activeCharacter.currentActivityHash &&
            CachedDestinyActivityDefinition[activeCharacter.currentActivityHash]?.activityTypeHash === raidActivityModeHashes) ||
        false);
}
function areAllPhasesComplete(phases) {
    return phases.every((phase) => phase.complete);
}
async function fetchCharacterResponse({ bungieId, characterId, platform, }) {
    try {
        const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`).catch((e) => console.error("[Error code: 1654]", e));
        if (!response) {
            throw { name: `[Error code: 1653] Got error upon checking ${platform}/${bungieId}` };
        }
        return response;
    }
    catch (error) {
        const authData = await AuthData.findOne({
            where: { bungieId },
            attributes: ["accessToken"],
        });
        if (authData && authData.accessToken) {
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                accessToken: authData.accessToken,
            });
            return response;
        }
        else {
            console.error(`[Error code: 1657] No accessToken for ${bungieId}`);
            return null;
        }
    }
}
export async function activityCompletionChecker({ bungieId, characterId, id, platform, raid, discordId }) {
    const milestoneHash = typeof raid === "string" ? getRaidData(raid).milestoneHash : raid;
    let startTime = Date.now();
    let interval;
    let previousActivityHash;
    let uniqueId = id || Math.floor(Math.random() * 1000);
    async function checkActivityHash() {
        const response = await fetchCharacterResponse({
            bungieId,
            characterId,
            platform,
        });
        const stopActivityHashChecker = () => {
            clearInterval(interval);
            currentlyRunning.delete(uniqueId);
            activityCompletionCurrentProfiles.delete(characterId);
            const cachedData = completedPhases.get(characterId);
            setTimeout(() => {
                if (completedPhases.get(characterId) === cachedData) {
                    completedPhases.delete(characterId);
                }
            }, 60 * 1000 * 20);
        };
        if (!response || !response.activities) {
            stopActivityHashChecker();
            return null;
        }
        const characterData = response?.activities?.data;
        const currentActivityHash = characterData?.currentActivityHash;
        if (characterData == null ||
            response == null ||
            response.activities?.data == null ||
            (currentActivityHash !== previousActivityHash && previousActivityHash !== undefined) ||
            currentActivityHash === 82913930 ||
            CachedDestinyActivityDefinition[currentActivityHash]?.activityTypeHash !== raidActivityModeHashes ||
            (previousActivityHash !== undefined &&
                !response.progressions.data.milestones[milestoneHash].activities.find((i) => i.activityHash === previousActivityHash)) ||
            (discordId && !clanOnline.has(discordId))) {
            stopActivityHashChecker();
            return null;
        }
        try {
            if (previousActivityHash === undefined) {
                previousActivityHash = currentActivityHash;
                const updatedMilestoneActivity = response.progressions.data.milestones[milestoneHash].activities.find((i) => i.activityHash === previousActivityHash);
                if (updatedMilestoneActivity && areAllPhasesComplete(updatedMilestoneActivity.phases)) {
                    clearInterval(interval);
                    currentlyRunning.delete(uniqueId);
                    activityCompletionCurrentProfiles.delete(characterId);
                    return null;
                }
            }
            await characterMilestonesChecker(response);
        }
        catch (error) {
            console.error("[Error code: 1636]", error);
        }
    }
    async function characterMilestonesChecker(response) {
        const characterMilestones = response.progressions.data.milestones;
        const updatedMilestone = characterMilestones[milestoneHash];
        if (activityCompletionCurrentProfiles.has(characterId)) {
            const cachedMilestone = activityCompletionCurrentProfiles.get(characterId);
            if (cachedMilestone !== updatedMilestone) {
                const cachedMilestoneActivity = cachedMilestone.activities.find((i) => i.activityHash === previousActivityHash);
                const updatedMilestoneActivity = updatedMilestone.activities.find((i) => i.activityHash === previousActivityHash);
                if (cachedMilestoneActivity == null ||
                    cachedMilestoneActivity.phases == null ||
                    updatedMilestoneActivity == null ||
                    updatedMilestoneActivity.phases == null ||
                    updatedMilestoneActivity.phases[0] == null ||
                    updatedMilestoneActivity.phases[0].phaseHash == null)
                    return console.error("[Error code: 1645]", cachedMilestoneActivity, updatedMilestoneActivity);
                for (const phaseIndexString in updatedMilestoneActivity.phases) {
                    const phaseIndex = parseInt(phaseIndexString);
                    if (phaseIndex == null)
                        return console.error("[Error code: 1651]", updatedMilestoneActivity);
                    const cachedMilestonePhase = cachedMilestoneActivity.phases[phaseIndex];
                    const updatedMilestonePhase = updatedMilestoneActivity.phases[phaseIndex];
                    if (cachedMilestonePhase?.phaseHash === updatedMilestonePhase?.phaseHash) {
                        if (cachedMilestonePhase.complete !== updatedMilestonePhase.complete && updatedMilestonePhase.complete === true) {
                            let alreadyCompletedPhases = completedPhases.get(characterId) || [
                                {
                                    phase: updatedMilestoneActivity.phases[phaseIndex].phaseHash,
                                    phaseIndex: phaseIndex + 1,
                                    start: startTime,
                                    end: -1,
                                },
                            ];
                            let phase = alreadyCompletedPhases[alreadyCompletedPhases.length - 1];
                            phase.end = Date.now();
                            alreadyCompletedPhases.splice(alreadyCompletedPhases.length > 0 ? alreadyCompletedPhases.length - 1 : 0, 1, {
                                ...phase,
                            });
                            if (updatedMilestoneActivity.phases[phaseIndex + 1] != null &&
                                updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash != null) {
                                const insertedPhaseIndex = alreadyCompletedPhases.findIndex((phase) => phase.phaseIndex === phaseIndex + 2);
                                const phaseData = {
                                    phase: updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash,
                                    phaseIndex: phaseIndex + 2,
                                    start: phase.end,
                                    end: -1,
                                };
                                if (insertedPhaseIndex === -1) {
                                    alreadyCompletedPhases.push(phaseData);
                                }
                                else {
                                    alreadyCompletedPhases.splice(insertedPhaseIndex, 1, {
                                        ...phaseData,
                                    });
                                }
                            }
                            else {
                                currentlyRunning.delete(uniqueId);
                                activityCompletionCurrentProfiles.delete(characterId);
                                setTimeout(() => {
                                    if (completedPhases.get(characterId) === alreadyCompletedPhases) {
                                        completedPhases.delete(characterId);
                                    }
                                }, 60 * 1000 * 20);
                            }
                            completedPhases.set(characterId, alreadyCompletedPhases);
                            break;
                        }
                    }
                    else if (!cachedMilestone || !updatedMilestone) {
                        console.error("[Error code: 1218]", cachedMilestone, updatedMilestone);
                    }
                }
            }
        }
        activityCompletionCurrentProfiles.set(characterId, updatedMilestone);
    }
    interval = setInterval(async () => {
        if (currentlyRunning.has(uniqueId)) {
            await checkActivityHash();
        }
        else {
            clearInterval(interval);
        }
    }, 50000);
    currentlyRunning.set(uniqueId, interval);
}
