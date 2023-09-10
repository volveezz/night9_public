import { parseIdentifierString } from "../general/utilities.js";
import cancelClanInvitation from "./cancelClanInvitation.js";
const timeouts = {};
export async function setupClanInviteCancellation(identifier, time, caller) {
    const { platform, bungieId } = parseIdentifierString(identifier);
    if (!platform || !bungieId) {
        console.error("[Error code: 1910]", identifier, time, caller);
        return;
    }
    if (timeouts[bungieId]) {
        clearTimeout(timeouts[bungieId]);
    }
    timeouts[bungieId] = setTimeout(async () => {
        const request = await cancelClanInvitation({ bungieId, platform, requestedBy: caller });
        if (request.ErrorCode !== 1) {
            console.error("[Error code: 1911]", request, identifier, time, caller);
        }
        delete timeouts[bungieId];
    }, time * 1000 * 60);
}
//# sourceMappingURL=setupClanInviteCancellation.js.map