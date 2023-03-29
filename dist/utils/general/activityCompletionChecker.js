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
            const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${membershipId}/?components=204,1000`);
            if (!response || !response.characterActivities) {
                console.error(`[Error code: 1612] Error during checking clan members`, response);
                break;
            }
            const characterActivities = response.characterActivities.data;
            if (!characterActivities)
                continue;
            const mostRecentCharacterId = findMostRecentCharacterId(characterActivities);
            const activeCharacter = characterActivities[mostRecentCharacterId];
            if (isRaidActivity(activeCharacter)) {
                if (!activityCompletionCurrentProfiles.has(membershipId)) {
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
    }, 60 * 1000 * 3);
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
async function fetchCharacterResponse(accessToken, bungieId, characterId, platform) {
    try {
        const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
            accessToken,
        });
        return response;
    }
    catch (error) {
        console.error(`[Error code: 1636]`, error);
        const authData = await AuthData.findOne({
            where: { bungieId },
            attributes: ["accessToken"],
        });
        if (authData && authData.accessToken) {
            accessToken = authData.accessToken;
            try {
                const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                    accessToken,
                });
                return response;
            }
            catch (retryError) {
                console.error(`[Error code: 1636] Retry failed`, retryError);
                return null;
            }
        }
        else {
            return null;
        }
    }
}
export async function activityCompletionChecker({ accessToken, bungieId, characterId, id, platform, raid, discordId, }) {
    console.debug(`STARTED activityCompletionChecker FOR ${platform}/${bungieId}`);
    const milestoneHash = typeof raid === "string" ? getRaidData(raid).milestoneHash : raid;
    let startTime = Date.now();
    let interval;
    let previousActivityHash;
    let uniqueId = id || Math.floor(Math.random() * 1000);
    async function checkActivityHash() {
        const response = await fetchCharacterResponse(accessToken, bungieId, characterId, platform);
        const characterData = response?.activities.data;
        const currentActivityHash = characterData?.currentActivityHash;
        if (response == null ||
            response.activities?.data == null ||
            (currentActivityHash !== previousActivityHash && previousActivityHash !== undefined) ||
            currentActivityHash === 82913930 ||
            CachedDestinyActivityDefinition[currentActivityHash]?.activityTypeHash !== raidActivityModeHashes ||
            (discordId && !clanOnline.has(discordId))) {
            console.debug(`Interval cleared`);
            clearInterval(interval);
            currentlyRunning.delete(uniqueId);
            activityCompletionCurrentProfiles.delete(bungieId);
            const cachedData = completedPhases.get(bungieId);
            setTimeout(() => {
                if (completedPhases.get(bungieId) === cachedData && !activityCompletionCurrentProfiles.has(bungieId)) {
                    completedPhases.delete(bungieId);
                }
            }, 60 * 1000 * 30);
            return null;
        }
        try {
            if (previousActivityHash === undefined) {
                previousActivityHash = currentActivityHash;
            }
            await characterMilestonesChecker(response);
        }
        catch (error) {
            console.error(`[Error code: 1636]`, error);
        }
    }
    async function characterMilestonesChecker(response) {
        console.debug(`STARTED characterMilestonesChecker FOR ${platform}/${bungieId}`);
        const characterMilestones = response.progressions.data.milestones;
        const updatedMilestone = characterMilestones[milestoneHash];
        if (activityCompletionCurrentProfiles.has(bungieId)) {
            const cachedMilestone = activityCompletionCurrentProfiles.get(bungieId);
            if (cachedMilestone !== updatedMilestone) {
                console.debug(`STARTED ADVANCED CHECKER FOR ${platform}/${bungieId}`);
                for (const milestineIndex in updatedMilestone.activities) {
                    const cachedMilestoneActivity = cachedMilestone.activities[milestineIndex];
                    const updatedMilestoneActivity = updatedMilestone.activities[milestineIndex];
                    if (cachedMilestoneActivity == null ||
                        cachedMilestoneActivity.phases == null ||
                        updatedMilestoneActivity == null ||
                        updatedMilestoneActivity.phases == null ||
                        updatedMilestoneActivity.phases[0] == null ||
                        updatedMilestoneActivity.phases[0].phaseHash == null)
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
                                phase.end = Date.now();
                                alreadyCompletedPhases.splice(alreadyCompletedPhases.length > 0 ? alreadyCompletedPhases.length - 1 : 0, 1, {
                                    ...phase,
                                });
                                if (updatedMilestoneActivity.phases[phaseIndex + 1] != null &&
                                    updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash != null) {
                                    const imsertedPhaseIndex = alreadyCompletedPhases.findIndex((phase) => phase.phaseIndex === phaseIndex + 1);
                                    const phaseData = {
                                        phase: updatedMilestoneActivity.phases[phaseIndex + 1].phaseHash,
                                        phaseIndex: phaseIndex + 2,
                                        start: phase.end,
                                        end: -1,
                                    };
                                    if (imsertedPhaseIndex === -1) {
                                        alreadyCompletedPhases.push(phaseData);
                                    }
                                    else {
                                        alreadyCompletedPhases.splice(imsertedPhaseIndex, 1, {
                                            ...phaseData,
                                        });
                                    }
                                }
                                else {
                                    currentlyRunning.delete(uniqueId);
                                }
                                completedPhases.set(bungieId, alreadyCompletedPhases);
                                break;
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
    interval = setInterval(async () => {
        console.log(uniqueId, currentlyRunning.has(uniqueId));
        if (currentlyRunning.has(uniqueId)) {
            await checkActivityHash();
        }
        else {
            clearInterval(interval);
        }
    }, 50000);
    currentlyRunning.set(uniqueId, interval);
}
