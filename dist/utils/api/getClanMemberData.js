import { Op } from "sequelize";
import { AuthData } from "../persistence/sequelize.js";
import { sendApiRequest } from "./sendApiRequest.js";
async function getClanMemberData(id) {
    let authData = null;
    if (id instanceof AuthData && id.bungieId && id.discordId && id.platform && id.accessToken) {
        authData = id;
    }
    else {
        const providedUserId = id instanceof AuthData ? id.bungieId || id.discordId || id.membershipId : typeof id === "string" ? id : id.bungieId;
        authData = await AuthData.findOne({
            where: { [Op.or]: [{ discordId: providedUserId }, { bungieId: providedUserId }, { membershipId: providedUserId }] },
        });
    }
    if (typeof id === "string" && !authData) {
        throw { name: "Ошибка. Пользователь не найден в клане" };
    }
    const { platform: membershipType, bungieId: membershipId } = typeof id === "object" && !(id instanceof AuthData) ? id : authData;
    const destinyRequest = await sendApiRequest(`/Platform/GroupV2/User/${membershipType}/${membershipId}/${0}/${1}/`);
    if (destinyRequest.results && destinyRequest.results.length === 1) {
        const clanData = destinyRequest.results[0];
        return {
            ...(authData || {}),
            ...(clanData || {}),
        };
    }
    else if (destinyRequest.results && destinyRequest.results.length > 1) {
        console.error("[Error code: 1905]", destinyRequest.results, authData?.bungieId || id, destinyRequest.totalResults);
        const clanData = destinyRequest.results[0];
        return {
            ...(authData || {}),
            ...(clanData || {}),
        };
    }
    return {};
}
export default getClanMemberData;
//# sourceMappingURL=getClanMemberData.js.map