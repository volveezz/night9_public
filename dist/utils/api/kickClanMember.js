import { getAdminAccessToken } from "../../commands/clan/main.js";
import { sendApiPostRequest } from "./sendApiPostRequest.js";
export default async (platform, bungieId, receivedAccessToken) => {
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
    else if (request.ErrorCode !== 1) {
        console.error("[Error code: 1908]", request);
    }
    return request.ErrorCode;
};
//# sourceMappingURL=kickClanMember.js.map