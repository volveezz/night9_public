import { GetManifest } from "../api/ManifestManager.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { stringVariablesMap } from "../persistence/dataStore.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";
import { pause } from "./utilities.js";
const activityCache = {};
async function fetchAndCacheActivities() {
    const ownerId = process.env.OWNER_ID;
    const authDataQuery = ownerId && { where: { discordId: ownerId }, attributes: ["bungieId", "platform", "accessToken"] };
    let ownerAuthData = authDataQuery && (await AuthData.findOne(authDataQuery));
    if (!ownerAuthData) {
        ownerAuthData = await AuthData.findOne({ attributes: ["bungieId", "platform", "accessToken"] });
        if (!ownerAuthData) {
            console.warn("[Error code: 2038] No available authentication data in the database");
            return;
        }
    }
    const { accessToken, bungieId, platform } = ownerAuthData;
    const profileData = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=204,1200`, accessToken);
    const characterActivities = profileData.characterActivities.data;
    if (!characterActivities) {
        console.warn(`[Error code: 2039] No character activities found for ${platform}${bungieId} [AccessToken: ${accessToken?.length}]`);
        return;
    }
    const mostActiveCharacterId = Object.keys(characterActivities).reduce((prevId, currId) => characterActivities[prevId].availableActivities.length > characterActivities[currId].availableActivities.length ? prevId : currId);
    const charactersStringVariablesData = profileData.characterStringVariables?.data;
    if (charactersStringVariablesData) {
        const characterWithMostVariables = Object.keys(charactersStringVariablesData).reduce((prevId, currId) => {
            const prevCount = Object.keys(charactersStringVariablesData[prevId].integerValuesByHash || {}).length;
            const currCount = Object.keys(charactersStringVariablesData[currId].integerValuesByHash || {}).length;
            return currCount > prevCount ? currId : prevId;
        });
        if (characterWithMostVariables) {
            const selectedCharacterVariables = charactersStringVariablesData[characterWithMostVariables].integerValuesByHash || {};
            Object.assign(stringVariablesMap, selectedCharacterVariables);
        }
    }
    const relevantActivities = characterActivities[mostActiveCharacterId].availableActivities;
    const [modifierDefinitions, activityDefinitions] = await Promise.all([
        GetManifest("DestinyActivityModifierDefinition"),
        GetManifest("DestinyActivityDefinition"),
    ]);
    const newActivityCache = {};
    for (const { modifierHashes, activityHash, recommendedLight } of relevantActivities) {
        const verifiedModifiers = modifierHashes && modifierHashes.filter((modHash) => modifierDefinitions[modHash]?.displayProperties.name.length > 1);
        const displayName = activityDefinitions[activityHash]?.displayProperties?.name;
        newActivityCache[activityHash] = {
            recommendedPowerLevel: recommendedLight ?? 0,
            validModifiers: verifiedModifiers?.length > 0 ? verifiedModifiers : undefined,
            displayName,
        };
    }
    for (const activityHash in activityCache) {
        if (!newActivityCache[activityHash]) {
            delete activityCache[activityHash];
            console.info(`Removed activity ${activityHash} from activity cache`);
        }
    }
    Object.assign(activityCache, newActivityCache);
    console.info(`Updated activity cache. (${Object.keys(activityCache).length} activities)`);
}
let isUpdating = false;
async function fetchAndRetry(attempt = 1) {
    try {
        await fetchAndCacheActivities();
    }
    catch (error) {
        console.error(`[Error code: 2040] Attempt ${attempt} failed. Retrying in ${30 * attempt} seconds...`, error);
        await pause(30_000 * attempt);
        await fetchAndRetry(attempt + 1);
    }
}
async function updateActivityCache() {
    console.debug("Updating activity cache");
    if (isUpdating)
        return;
    isUpdating = true;
    await fetchAndRetry()
        .catch((error) => {
        console.error(`[Error code: 2041] Unable to update activity cache: ${error}`);
    })
        .finally(() => {
        isUpdating = false;
    });
}
export { activityCache, updateActivityCache };
//# sourceMappingURL=cacheAvailableActivities.js.map