import { requestUpdateTokens } from "../core/tokenManagement.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { timer } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelize.js";
let apiStatuses = {
    account: 1,
    oauth: 1,
    activity: 1,
    api: 1,
};
let checkers = {
    account: undefined,
    oauth: undefined,
    activity: undefined,
    api: undefined,
};
export function SetApiStatus(endpoint, status) {
    apiStatuses[endpoint] = status;
    if (status !== 1 && !checkers[endpoint]) {
        checkers[endpoint] = startApiStatusCheck(endpoint);
    }
}
export function GetApiStatus(endpoint) {
    if (apiStatuses.api !== 1) {
        return apiStatuses.api;
    }
    else {
        return apiStatuses[endpoint];
    }
}
export async function mockApiCall(endpoint) {
    let endpointURL = "";
    const data = await AuthData.findOne({
        where: { discordId: process.env.OWNER_ID },
        attributes: ["bungieId", "platform", "accessToken"],
    });
    if (!data) {
        console.error("[Error code: 1971] No data was found for endpoint checking");
        return 5;
    }
    const { platform, bungieId, accessToken } = data;
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
    return await handleEndpoint(endpointURL, accessToken || null);
}
export async function startApiStatusCheck(endpoint) {
    try {
        while (true) {
            await timer(1000 * 60);
            const status = await mockApiCall(endpoint);
            apiStatuses[endpoint] = status;
            if (status === 1) {
                break;
            }
        }
    }
    finally {
        checkers[endpoint] = undefined;
    }
}
async function handleEndpoint(endpointURL, accessToken) {
    if (endpointURL === "oauth") {
        const status = await requestUpdateTokens({ userId: process.env.OWNER_ID }).catch((e) => {
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
//# sourceMappingURL=apiStatus.js.map