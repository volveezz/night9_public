import { sendApiPostRequest } from "./sendApiPostRequest.js";
const kickClanMember = async (platform, bungieId, accessToken) => {
    console.debug(`Kicking the user: ${platform}/${bungieId}`);
    const request = await sendApiPostRequest({
        apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID}/Members/${platform}/${bungieId}/Kick/`,
        accessToken,
        shouldReturnResponse: false,
    });
    if (!request || request.ErrorCode == null) {
        console.error("[Error code: 1945]", request);
        return undefined;
    }
    if (request.ErrorCode !== 1) {
        console.error("[Error code: 1908]", request);
    }
    else {
        console.debug("User kicked successfully");
    }
    return request.ErrorCode;
};
export default kickClanMember;
//# sourceMappingURL=kickClanMember.js.map