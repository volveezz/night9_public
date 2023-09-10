import { getAdminAccessToken } from "../../commands/clan/main.js";
import { sendApiPostRequest } from "./sendApiPostRequest.js";
async function cancelClanInvitation({ platform, bungieId, requestedBy }) {
    const adminAccessToken = await getAdminAccessToken(requestedBy || process.env.OWNER_ID);
    const request = await sendApiPostRequest({
        apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID}/Members/IndividualInviteCancel/${platform}/${bungieId}/`,
        accessToken: adminAccessToken,
        returnResponse: false,
    });
    return request;
}
export default cancelClanInvitation;
//# sourceMappingURL=cancelClanInvitation.js.map