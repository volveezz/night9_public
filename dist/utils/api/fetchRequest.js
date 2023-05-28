import fetch from "node-fetch";
let logged = false;
export async function fetchRequest(cleanUrl, authorizationData) {
    const response = await fetch(`https://www.bungie.net/${cleanUrl}`, {
        headers: {
            "X-API-KEY": process.env.XAPI,
            Authorization: `${authorizationData ? `Bearer ${authorizationData.accessToken || authorizationData}` : ""}`,
        },
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
function handleFetchError(error, response) {
    const status = response?.status || error.body?.code || error.code || error.statusCode || error.status || error;
    if (status === 524) {
        console.error("[Error code: 1710] A timeout occurred");
    }
    else if (status === 503) {
        console.error("[Error code: 1683] Server is not avaliable");
    }
    else if (status === 502) {
        console.error("[Error code: 1099] Web error");
    }
    else if (status === 409) {
        console.error("[Error code: 1108] Confilt error");
    }
    else if (status === 522) {
        console.error("[Error code: 1117] Timed out error");
    }
    else if (status === 401) {
        console.error("[Error code: 1682] Authorization error");
    }
    else if (status === 500) {
        console.error("[Error code: 1757] Internal server error");
    }
    else if (status === "ERPROTO") {
        console.error("[Error code: 1810] ERPROTO request error");
    }
    else if (status === "ECONNRESET") {
        console.error("[Error code: 1812] ECONNRESET request error");
    }
    else if (status === "EHOSTUNREACH") {
        console.error("[Error code: 1811] EHOSTUNREACH request error");
    }
    else {
        if (status >= 400 && status <= 599 && !logged) {
            console.error(`[Error code: 1228] ${status} web error code\n`, response, response.body);
            logged = true;
        }
        else {
            console.error(`[Error code: 1064] ${status} statusCode\n`, error);
        }
    }
    return undefined;
}
