import { character_data } from "../features/memberStatisticsHandler.js";
import { fetchRequest } from "./fetchRequest.js";
export async function setUserCharacters(authData, member) {
    const { discordId, platform, bungieId, accessToken } = authData;
    try {
        const destinyCharacterRequest = await fetchRequest(`Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken);
        if (!destinyCharacterRequest.characters)
            return console.error(`[Error code: 1105] For ${member.displayName}`);
        const charIdArray = [];
        destinyCharacterRequest.characters.forEach((ch) => charIdArray.push(ch.characterId));
        character_data.set(discordId, charIdArray);
    }
    catch (e) {
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1017] ${e.statusCode} error for ${bungieId}`);
        else
            console.error("[Error code: 1241]", e.error?.message || e.error?.name || e.message || e.name, bungieId, e.statusCode);
    }
}
