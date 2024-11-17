import Sequelize from "sequelize";
const { Op } = Sequelize;
import { AuthData } from "../persistence/sequelizeModels/authData.js";
import { sendApiRequest } from "./sendApiRequest.js";
async function getClanMemberData(id) {
    let authData = null;
    if (id instanceof AuthData && id.bungieId && id.discordId && id.platform && id.accessToken) {
        authData = id;
    }
    else {
        const providedUserId = (id instanceof AuthData ? id.bungieId || id.discordId || id.membershipId : typeof id === "string" ? id : id.bungieId) || null;
        authData = await AuthData.findOne({
            where: { [Op.or]: [{ discordId: providedUserId }, { bungieId: providedUserId }, { membershipId: providedUserId }] },
        });
    }
    if (typeof id === "string" && !authData) {
        throw { name: "Ошибка. Пользователь не найден в клане" };
    }
    const { platform: membershipType, bungieId: membershipId } = typeof id === "object" && !(id instanceof AuthData) ? id : authData;
    const destinyRequest = await sendApiRequest(`/Platform/GroupV2/User/${membershipType}/${membershipId}/${0}/${1}/`);
    if (!destinyRequest.results || destinyRequest.results.length === 0) {
        return {};
    }
    const clanData = destinyRequest.results[0];
    const returnData = {
        ...(authData || {}),
        ...(clanData || {}),
    };
    if (destinyRequest.results.length === 1) {
        return returnData;
    }
    else {
        console.error("[Error code: 1905]", destinyRequest.results, authData?.bungieId || id, destinyRequest.totalResults);
        return returnData;
    }
}
export default getClanMemberData;
//# sourceMappingURL=getClanMemberData.js.map