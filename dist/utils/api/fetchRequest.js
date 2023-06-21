import fetch from "node-fetch";
export async function fetchRequest(cleanUrl, authorizationData) {
    const headers = {
        "X-API-KEY": process.env.XAPI,
        "Content-Type": "application/json",
    };
    if (authorizationData) {
        headers.Authorization = `Bearer ${authorizationData.accessToken || authorizationData}`;
    }
    const response = await fetch(`https://www.bungie.net/${cleanUrl}`, {
        headers,
    }).catch((error) => {
        handleFetchError(error);
    });
    if (!response) {
        return undefined;
    }
    const jsonResponse = await response.json().catch(async (e) => {
        handleFetchError(e, response);
    });
    if (jsonResponse == null) {
        return undefined;
    }
    return jsonResponse.Response ? jsonResponse.Response : jsonResponse;
}
export async function fetchPostRequest(endpoint, data, accessToken, returnResponse = true) {
    const url = `https://www.bungie.net/${endpoint}`;
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.XAPI,
            ...(accessToken ? { Authorization: `Bearer ${accessToken.accessToken || accessToken}` } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
    };
    const response = await fetch(url, options).catch((error) => {
        console.error("[Error code: 1831] Error fetching data:", error);
    });
    if (!response) {
        return undefined;
    }
    const jsonResponse = await response.json().catch((e) => {
        console.error("[Error code: 1832] Error parsing JSON response:", e.stack);
    });
    if (jsonResponse == null) {
        return undefined;
    }
    return jsonResponse.Response && returnResponse ? jsonResponse.Response : jsonResponse;
}
function handleFetchError(error, response) {
    const status = response?.status || error.body?.code || error.code || error.statusCode || error.status || error;
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
        console.error(errorMessages[status]);
    }
    else {
        if (typeof status === "number" && status >= 400 && status <= 599) {
            console.error(`[Error code: 1228] ${status} web error code\n`, response, response?.body);
        }
        else {
            console.error(`[Error code: 1064] ${status} statusCode\n`, error);
            if (error.stack) {
                console.error("[Error code: 1826] Stack trace:", error.stack);
            }
        }
    }
    return undefined;
}
