import { sendApiRequest } from "../api/sendApiRequest.js";
import { userCharactersId } from "../persistence/dataStore.js";
async function fetchCharacterStatsAndCache({ discordId, platform, bungieId, accessToken }) {
    if (!bungieId || !discordId || !platform) {
        console.trace(`[Error code: 2003] Found missing data for ${discordId} during caching characters`);
    }
    try {
        const statsRequestUrl = `/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`;
        const characterStats = await sendApiRequest(statsRequestUrl, accessToken);
        if (!characterStats.characters) {
            console.error(`[Error code: 1105] Error during caching characters of ${bungieId} for ${discordId}`);
            return;
        }
        const validCharacters = characterStats.characters
            .sort((a, _) => (a.deleted === false ? 1 : 0))
            .map((ch) => ch.characterId);
        userCharactersId.set(discordId, validCharacters);
    }
    catch (error) {
        const { bungieId, statusCode } = error;
        if (statusCode >= 400 || statusCode <= 599) {
            console.error(`[Error code: 1017] ${statusCode} error for ${bungieId}`);
        }
        else {
            console.error("[Error code: 1241]", error.error?.message || error.error?.name || error.message || error.name, bungieId, statusCode);
        }
    }
}
export default fetchCharacterStatsAndCache;
//# sourceMappingURL=setUserCharacters.js.map