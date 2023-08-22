import { getAdminAccessToken } from "../../commands/clan/main.js";
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
        const request = await sendApiPostRequest({
            apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID}/Members/IndividualInviteCancel/${platform}/${bungieId}/`,
            accessToken: adminAccessToken,
            shouldReturnResponse: false,
        });
        if (request.ErrorCode !== 1) {
            console.error("[Error code: 1911]", request, identifier, time, caller);
        }
        delete timeouts[bungieId];
    }, time * 1000 * 60);
}
//# sourceMappingURL=cancelClanInvitation.js.map