import fetch from "node-fetch";
const bungieNetUrl = "https://www.bungie.net";
export async function sendApiRequest(apiEndpoint, authToken, serverResponse) {
    const headers = createHeaders(authToken);
    const response = await fetch(`${bungieNetUrl}${apiEndpoint}`, { headers }).catch((error) => {
        handleFetchError(error.code || error.message, error);
        throw new Error("[Error code: 1951] Error happened during fetching data");
    });
    if (!response.ok) {
        try {
            console.debug(await response.json());
        }
        catch (error) {
            handleFetchError(response.status, response);
        }
        throw new Error("[Error code: 1952] Error happened during fetching data");
    }
    const jsonResponse = await parseJsonResponse(response).catch((error) => {
        handleFetchError(error.code || error.message, error);
        throw new Error("[Error code: 1953] Error happened during fetching data");
    });
    return jsonResponse.Response && !serverResponse ? jsonResponse.Response : jsonResponse;
}
function createHeaders(authToken) {
    return {
        "X-API-KEY": process.env.XAPI,
        "Content-Type": "application/json",
        ...(authToken
            ? { Authorization: `Bearer ${authToken?.accessToken || authToken}` }
            : {}),
    };
}
async function parseJsonResponse(response) {
    try {
        const jsonResponse = await response.json();
        return jsonResponse;
    }
    catch (error) {
        handleFetchError(error.code || error.message, error);
        return null;
    }
}
function handleFetchError(status, error) {
    const errorMessages = {
        "524": "A timeout occurred",
        "503": "Server is not avaliable",
        "502": "Web error",
        "409": "Confilt error",
        "522": "Timed out error",
        "401": "Authorization error",
        "500": "Internal server error",
        EPROTO: "EPROTO request error",
        ECONNRESET: "ECONNRESET request error",
        EHOSTUNREACH: "EHOSTUNREACH request error",
        ETIMEDOUT: "ETIMEDOUT request error",
        ERR_STREAM_PREMATURE_CLOSE: "ERR_STREAM_PREMATURE_CLOSE request error",
    };
    if (errorMessages.hasOwnProperty(status) || errorMessages.hasOwnProperty(String(status))) {
        console.error("[Error code: 1939]", errorMessages[String(status)]);
    }
    else {
        if (typeof status === "number" && status >= 400 && status <= 599) {
            console.error(`[Error code: 1228] ${status} web error code\n`, error, error?.body);
        }
        else if (error.stack) {
            console.error(`[Error code: 1826] ${error.code} ${error.messageCode} ${error.errorCode} ${error.status} ${error.statusCode}\nStack trace:`, error.stack);
        }
        else {
            console.error(`[Error code: 1064] ${status} statusCode\n`, error);
        }
    }
}
//# sourceMappingURL=sendApiRequest.js.map