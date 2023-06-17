import { getAdminAccessToken } from "../../commands/adminonly/clanCommand.js";
import { groupId } from "../../configs/ids.js";
import { parseIdentifierString } from "../general/utilities.js";
import { fetchPostRequest } from "./fetchRequest.js";
const timeouts = {};
export async function cancelClanInvitation(identifier, time, caller) {
    const { platform, bungieId } = parseIdentifierString(identifier);
    if (!platform || !bungieId) {
        console.error("[Error code: 1910]", identifier, time, caller);
        return;
    }
    const adminAccessToken = await getAdminAccessToken(caller);
    if (timeouts[bungieId]) {
        clearTimeout(timeouts[bungieId]);
    }
    timeouts[bungieId] = setTimeout(async () => {
        const call = await fetchPostRequest(`Platform/GroupV2/${groupId}/Members/IndividualInviteCancel/${platform}/${bungieId}/`, {}, adminAccessToken, false);
        if (call.ErrorCode !== 1) {
            console.error("[Error code: 1911]", call, identifier, time, caller);
        }
        delete timeouts[bungieId];
    }, time * 1000 * 60);
}
