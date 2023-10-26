import BungieAPIError from "../../structures/BungieAPIError.js";
import { GetManifest } from "../api/ManifestManager.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { getEndpointStatus, updateEndpointStatus } from "../api/statusCheckers/statusTracker.js";
import { clanOnline, completedPhases, raidMilestoneHashes } from "../persistence/dataStore.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";
import { getRaidDetails } from "./raidFunctions.js";
import { getWeeklyRaidActivityHashes } from "./raidFunctions/gerWeeklyRaid.js";
import { pause } from "./utilities.js";
const activityDefinition = await GetManifest("DestinyActivityDefinition");
const activityCompletionCurrentProfiles = new Map();
const currentlyRunning = new Map();
const raidActivityModeHash = 2043403989;
export async function clanOnlineMemberActivityChecker() {
    setInterval(async () => {
        if (getEndpointStatus("activity") !== 1)
            return;
        const checkingUsers = new Map(clanOnline);
        for (const [discordId, { membershipId, platform }] of checkingUsers) {
            if (getEndpointStatus("activity") !== 1)
                return;
            let response;
            try {
                response = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${membershipId}/?components=204`);
            }
            catch (error) {
                if (error instanceof BungieAPIError && error.errorCode) {
                    console.error(`[Error code: 2050] Received ${error.errorCode}/${error.errorStatus} error during checking ${platform}/${membershipId} of ${discordId}}`);
                    updateEndpointStatus("account", error.errorCode);
                    break;
                }
                console.error(`[Error code: 1997] Error during checking ${platform}/${membershipId} of ${discordId}`);
                continue;
            }
            if (!response?.characterActivities) {
                console.error(`[Error code: 1612] ${platform}/${membershipId} of ${discordId}`, response);
                break;
            }
            const characterActivities = response.characterActivities.data;
            if (!characterActivities)
                continue;
            const mostRecentCharacterId = findMostRecentCharacterId(characterActivities);
            const activeCharacter = characterActivities[mostRecentCharacterId];
            if (!isRaidActivity(activeCharacter) || isRaidIsWeekly(activeCharacter)) {
                await pause(2000);
                continue;
            }
            if (!activityCompletionCurrentProfiles.has(mostRecentCharacterId)) {
                const authData = await AuthData.findByPk(discordId, { attributes: ["platform", "bungieId", "accessToken"] });
                const raidMilestoneHash = raidMilestoneHashes.get(activeCharacter.currentActivityHash);
                if (!authData) {
                    console.error(`[Error code: 1438] No authorization data for user`, membershipId, raidMilestoneHash, activeCharacter);
                    continue;
                }
                if (!raidMilestoneHash) {
                    console.error(`[Error code: 1440] No raid milestone data for user ${authData.bungieId}\n${activeCharacter.currentActivityHash} - ${raidMilestoneHash}`);
                    continue;
                }
                activityCompletionChecker({
                    bungieId: membershipId,
                    characterId: mostRecentCharacterId,
                    platform,
                    raid: raidMilestoneHash,
                    discordId,
                }).catch((_) => null);
            }
            await pause(3333);
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
        raidActivityModeHash === activeCharacter.currentActivityModeHash ||
        (activeCharacter.currentActivityHash &&
            activityDefinition[activeCharacter.currentActivityHash]?.activityTypeHash === raidActivityModeHash) ||
        false);
}
function isRaidIsWeekly(activeCharacter) {
    const activityHash = activeCharacter.currentActivityHash;
    const { normal, master } = getWeeklyRaidActivityHashes();
    return activityHash === normal || activityHash === master ? true : false;
}
function areAllPhasesComplete(phases) {
    return phases.every((phase) => phase.complete);
}
async function fetchCharacterResponse({ bungieId, characterId, platform, }) {
    try {
        const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`).catch((e) => console.error("[Error code: 1654]", e));
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
        if (authData) {
            const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/Character/${characterId}/?components=202,204`, {
                accessToken: authData.accessToken,
            });
            return response;
        }
        else {
            console.error(`[Error code: 1657] No authorization data was found for ${bungieId}`);
            return null;
        }
    }
}
async function activityCompletionChecker({ bungieId, characterId, id, platform, raid, discordId }) {
    const milestoneHash = typeof raid === "string" ? getRaidDetails(raid).milestoneHash : raid;
    let startTime = Date.now();
    let interval;
    let previousActivityHash;
    let uniqueId = id || Math.floor(Math.random() * 1000);
    const stopActivityHashChecker = () => {
        clearInterval(interval);
        currentlyRunning.delete(uniqueId);
        activityCompletionCurrentProfiles.delete(characterId);
        const traceError = new Error(`StopActivityHashChecker called at:`);
        const cachedData = completedPhases.get(characterId);
        setTimeout(() => {
            if (completedPhases.has(characterId) && completedPhases.get(characterId) === cachedData) {
                console.debug(`Completed phases data for ${platform}/${bungieId}/${characterId} | ${discordId} was deleted at`, traceError.stack);
                completedPhases.delete(characterId);
            }
        }, 60 * 1000 * 30);
    };
    async function checkActivityHash() {
        const response = await fetchCharacterResponse({
            bungieId,
            characterId,
            platform,
        });
        if (!response || !response.activities || !response.progressions.data.milestones[milestoneHash].activities) {
            stopActivityHashChecker();
            return null;
        }
        const characterData = response?.activities?.data;
        const currentActivityHash = characterData?.currentActivityHash;
        if (!response?.activities?.data || !response.progressions.data) {
            console.error("[Error code: 2110] Error since the response wasn't fully completed", response);
            stopActivityHashChecker();
            return null;
        }
        if (discordId && !clanOnline.has(discordId)) {
            console.error("[Error code: 2111] User is no longer offline so his data is called to delete", discordId);
            stopActivityHashChecker();
            return null;
        }
        if (previousActivityHash && currentActivityHash !== previousActivityHash) {
            console.error("[Error code: 2112] Current activity hash is not equal to previous. Exiting", previousActivityHash, currentActivityHash);
            stopActivityHashChecker();
            return null;
        }
        if (currentActivityHash === 82913930 ||
            activityDefinition[currentActivityHash]?.activityTypeHash !== raidActivityModeHash ||
            (previousActivityHash &&
                !response.progressions.data.milestones[milestoneHash].activities.find((i) => i.activityHash === previousActivityHash))) {
            console.error("[Error code: 2113] Exiting because of one of the many reasons...", currentActivityHash, activityDefinition[currentActivityHash]?.activityTypeHash, response.progressions.data.milestones[milestoneHash].activities.find((i) => i.activityHash === previousActivityHash));
            stopActivityHashChecker();
            return null;
        }
        try {
            if (!previousActivityHash) {
                previousActivityHash = currentActivityHash;
                const updatedMilestoneActivity = response.progressions.data.milestones[milestoneHash].activities.find((i) => i.activityHash === previousActivityHash);
                if (updatedMilestoneActivity?.phases && areAllPhasesComplete(updatedMilestoneActivity.phases)) {
                    stopActivityHashChecker();
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
        if (!activityCompletionCurrentProfiles.has(characterId)) {
            activityCompletionCurrentProfiles.set(characterId, updatedMilestone);
            return;
        }
        const cachedMilestone = activityCompletionCurrentProfiles.get(characterId);
        if (cachedMilestone === updatedMilestone)
            return;
        const cachedMilestoneActivity = cachedMilestone.activities.find((i) => i.activityHash === previousActivityHash);
        const updatedMilestoneActivity = updatedMilestone.activities.find((i) => i.activityHash === previousActivityHash);
        if (!cachedMilestoneActivity?.phases || !updatedMilestoneActivity?.phases?.[0]?.phaseHash) {
            console.error("[Error code: 1645]", cachedMilestoneActivity, updatedMilestoneActivity);
            return;
        }
        for (const phaseIndexString in updatedMilestoneActivity.phases) {
            const phaseArrayIndex = parseInt(phaseIndexString);
            const phaseIndex = phaseArrayIndex + 1;
            if (phaseArrayIndex == null)
                return console.error("[Error code: 1651]", updatedMilestoneActivity);
            const cachedMilestonePhase = cachedMilestoneActivity.phases[phaseArrayIndex];
            const updatedMilestonePhase = updatedMilestoneActivity.phases[phaseArrayIndex];
            if (!cachedMilestone || !updatedMilestone) {
                console.error("[Error code: 1218]", cachedMilestone, updatedMilestone);
                continue;
            }
            if (cachedMilestonePhase.phaseHash === updatedMilestonePhase.phaseHash &&
                cachedMilestonePhase.complete !== updatedMilestonePhase.complete &&
                updatedMilestonePhase.complete === true) {
                let alreadyCompletedPhases = completedPhases.get(characterId) || [
                    {
                        phase: updatedMilestoneActivity.phases[phaseArrayIndex].phaseHash,
                        phaseIndex: phaseArrayIndex + 1,
                        start: startTime,
                        end: -1,
                    },
                ];
                let phase = alreadyCompletedPhases[alreadyCompletedPhases.length - 1];
                phase.end = Date.now();
                if (updatedMilestoneActivity.phases[phaseArrayIndex + 1]?.phaseHash) {
                    const insertedPhaseIndex = alreadyCompletedPhases.findIndex((phase) => phase.phaseIndex === phaseIndex + 1);
                    const phaseData = {
                        phase: updatedMilestoneActivity.phases[phaseArrayIndex + 1].phaseHash,
                        phaseIndex: phaseIndex + 1,
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
                    stopActivityHashChecker();
                }
                completedPhases.set(characterId, alreadyCompletedPhases);
                break;
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
//# sourceMappingURL=activityCompletionChecker.js.map