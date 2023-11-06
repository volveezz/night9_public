import { getAdminAccessToken } from "../../commands/clan/main.js";
import { sendApiPostRequest } from "./sendApiPostRequest.js";
const kickClanMember = async (platform, bungieId, receivedAccessToken) => {
    const accessToken = receivedAccessToken || (await getAdminAccessToken(process.env.OWNER_ID));
    const request = await sendApiPostRequest({
        apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID}/Members/${platform}/${bungieId}/Kick/`,
        accessToken,
        returnResponse: false,
    });
    if (!request || request.ErrorCode == null) {
        console.error("[Error code: 1945]", request);
        return undefined;
    }
    if (request.ErrorCode !== 1) {
        console.error("[Error code: 1908]", request);
    }
    else {
    }
    return request.ErrorCode;
};
export default kickClanMember;
//# sourceMappingURL=kickClanMember.js.map