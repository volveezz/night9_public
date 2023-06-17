import { groupId } from "../../configs/ids.js";
import { fetchPostRequest } from "./fetchRequest.js";
const kickClanMember = async (platform, bungieId, accessToken) => {
    console.debug("Kicking the user", platform, bungieId);
    const post = await fetchPostRequest(`Platform/GroupV2/${groupId}/Members/${platform}/${bungieId}/Kick/`, {}, accessToken, false);
    if (post.ErrorCode !== 1)
        console.error("[Error code: 1908]", post);
    return post.ErrorCode;
};
export default kickClanMember;
