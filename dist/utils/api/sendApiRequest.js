import fetch from "node-fetch";
export async function sendApiRequest(apiEndpoint, authToken) {
    const headers = createHeaders(authToken);
    try {
        const response = await fetch(`https://www.bungie.net/${apiEndpoint}`, { headers });
        if (!response.ok) {
            handleFetchError(response.status, response);
            return undefined;
        }
        const jsonResponse = await parseJsonResponse(response);
        return jsonResponse.Response ? jsonResponse.Response : jsonResponse;
    }
    catch (error) {
        handleFetchError(error.message, error);
        return undefined;
    }
}
function createHeaders(authToken) {
    return {
        "X-API-KEY": process.env.XAPI,
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken.accessToken || authToken}` } : {}),
    };
}
async function parseJsonResponse(response) {
    try {
        const jsonResponse = await response.json();
        return jsonResponse;
    }
    catch (error) {
        handleFetchError(error.message, error);
        return null;
    }
}
function handleFetchError(status, error) {
    const errorMessages = {
        "524": "[Error code: 1710] A timeout occurred",
        "503": "[Error code: 1683] Server is not avaliable",
        "502": "[Error code: 1099] Web error",
        "409": "[Error code: 1108] Confilt error",
        "522": "[Error code: 1117] Timed out error",
        "401": "[Error code: 1682] Authorization error",
        "500": "[Error code: 1757] Internal server error",
        EPROTO: "[Error code: 1827] EPROTO request error",
        ECONNRESET: "[Error code: 1828] ECONNRESET request error",
        EHOSTUNREACH: "[Error code: 1829] EHOSTUNREACH request error",
        ETIMEDOUT: "[Error code: 1922] ETIMEDOUT request error",
        ERR_STREAM_PREMATURE_CLOSE: "[Error code: 1830] ERR_STREAM_PREMATURE_CLOSE request error",
    };
    if (errorMessages.hasOwnProperty(status)) {
        console.error("[Error code: 1939]", errorMessages[status]);
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