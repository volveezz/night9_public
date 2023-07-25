import { requestTokenRefresh } from "../../../core/tokenManagement.js";
import { AuthData } from "../../persistence/sequelize.js";
import { sendApiRequest } from "../sendApiRequest.js";
export async function checkEndpointStatus(endpoint) {
    let endpointURL = "";
    const userData = await AuthData.findOne({
        where: { discordId: process.env.OWNER_ID },
        attributes: ["bungieId", "platform", "accessToken"],
    });
    if (!userData) {
        console.error("[Error code: 1971] No data was found for endpoint checking");
        return 5;
    }
    const { platform, bungieId, accessToken } = userData;
    switch (endpoint) {
        case "account":
            endpointURL = `/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=204,1000`;
            break;
        case "oauth":
            endpointURL = endpoint;
            break;
        case "activity":
            endpointURL = `/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`;
            break;
        case "api":
            endpointURL = `/Platform/GroupV2/${process.env.GROUP_ID}/Members/?memberType=None`;
            break;
    }
    return await handleApiCall(endpointURL, accessToken || null);
}
async function handleApiCall(endpointURL, accessToken) {
    if (endpointURL === "oauth") {
        const status = await requestTokenRefresh({ userId: process.env.OWNER_ID }).catch((e) => {
            console.error("[Error code: 1969]", e);
            return null;
        });
        return status != null && status.refresh_token != null ? 1 : 5;
    }
    const request = await sendApiRequest(endpointURL, accessToken, false).catch((e) => {
        console.error("[Error code: 1970]", e);
        return null;
    });
    if (request && request.ErrorCode != null)
        return request.ErrorCode;
    return 5;
}
//# sourceMappingURL=endpointStatusChecker.js.map