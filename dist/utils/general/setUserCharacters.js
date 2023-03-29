import { userCharactersId } from "../../core/userStatisticsManagement.js";
import { fetchRequest } from "../api/fetchRequest.js";
export async function setUserCharacters(authData, member) {
    const { discordId, platform, bungieId, accessToken } = authData;
    try {
        const destinyCharacterRequest = await fetchRequest(`Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
        if (!destinyCharacterRequest.characters)
            return console.error(`[Error code: 1105] Error during caching characters of ${member.displayName}`);
        const charIdArray = [];
        destinyCharacterRequest.characters.sort((a, b) => (a.deleted === false ? 1 : 0));
        destinyCharacterRequest.characters.forEach((ch) => charIdArray.push(ch.characterId));
        userCharactersId.set(discordId, charIdArray);
    }
    catch (e) {
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1017] ${e.statusCode} error for ${bungieId}`);
        else
            console.error("[Error code: 1241]", e.error?.message || e.error?.name || e.message || e.name, bungieId, e.statusCode);
    }
}
