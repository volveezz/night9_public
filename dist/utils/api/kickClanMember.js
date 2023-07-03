import { sendApiPostRequest } from "./sendApiPostRequest.js";
const kickClanMember = async (platform, bungieId, accessToken) => {
    console.debug("Kicking the user", platform, bungieId);
    const post = await sendApiPostRequest({
        apiEndpoint: `Platform/GroupV2/${process.env.GROUP_ID}/Members/${platform}/${bungieId}/Kick/`,
        authToken: accessToken,
        shouldReturnResponse: false,
    });
    if (post.ErrorCode !== 1)
        console.error("[Error code: 1908]", post);
    return post.ErrorCode;
};
export default kickClanMember;
//# sourceMappingURL=kickClanMember.js.map