import { getAdminAccessToken } from "../../commands/clanCommand.js";
import { parseIdentifierString } from "../general/utilities.js";
import { sendApiPostRequest } from "./sendApiPostRequest.js";
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
        const call = await sendApiPostRequest({
            apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID}/Members/IndividualInviteCancel/${platform}/${bungieId}/`,
            authToken: adminAccessToken,
            shouldReturnResponse: false,
        });
        if (call.ErrorCode !== 1) {
            console.error("[Error code: 1911]", call, identifier, time, caller);
        }
        delete timeouts[bungieId];
    }, time * 1000 * 60);
}
//# sourceMappingURL=cancelClanInvitation.js.map