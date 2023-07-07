import { sendApiPostRequest } from "./sendApiPostRequest.js";
const kickClanMember = async (platform, bungieId, accessToken) => {
    console.debug("Kicking the user", platform, bungieId);
    const post = await sendApiPostRequest({
        apiEndpoint: `Platform/GroupV2/${process.env.GROUP_ID}/Members/${platform}/${bungieId}/Kick/`,
        authToken: accessToken,
        shouldReturnResponse: false,
    });
    if (!post || post.ErrorCode == null) {
        console.error("[Error code: 1945]", post);
        return undefined;
    }
    if (post.ErrorCode !== 1)
        console.error("[Error code: 1908]", post);
    return post.ErrorCode;
};
export default kickClanMember;
//# sourceMappingURL=kickClanMember.js.map