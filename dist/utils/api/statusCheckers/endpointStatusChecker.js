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
        try {
            console.debug("Making a Token Refresh request");
            const status = await requestTokenRefresh({ userId: process.env.OWNER_ID });
            console.debug(`Token refresh completed, status: ${status != null && status.refresh_token != null ? 1 : 5}`);
            return status != null && status.refresh_token != null ? 1 : 5;
        }
        catch (error) {
            console.error("[Error code: 1969]", error);
            return 5;
        }
    }
    try {
        console.debug("Making a request to", endpointURL);
        const request = await sendApiRequest(endpointURL, accessToken, true);
        console.debug("Made a request to", endpointURL, "and got", request.ErrorCode);
        if (request && request.ErrorCode != null) {
            console.debug(`[Error code: 2000] Error code for ${endpointURL} is ${request.ErrorCode}`);
            return request.ErrorCode;
        }
    }
    catch (error) {
        console.error("[Error code: 1970]", error);
        return 5;
    }
    return 5;
}
//# sourceMappingURL=endpointStatusChecker.js.map