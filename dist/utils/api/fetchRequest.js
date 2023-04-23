import fetch from "node-fetch";
let logged = false;
export async function fetchRequest(cleanUrl, authorizationData) {
    const response = await fetch(`https://www.bungie.net/${cleanUrl}`, {
        headers: {
            "X-API-KEY": process.env.XAPI,
            Authorization: `${authorizationData ? `Bearer ${authorizationData.accessToken || authorizationData}` : ""}`,
        },
    });
    const jsonResponse = await response.json().catch(async (e) => {
        const status = response?.status;
        if (status === 524) {
            console.error(`[Error code: 1710] A timeout occurred`);
        }
        else if (status === 503) {
            console.error(`[Error code: 1683] Server is not avaliable`);
        }
        else if (status === 502) {
            console.error(`[Error code: 1099] Web error`);
        }
        else if (status === 409) {
            console.error(`[Error code: 1108] Confilt error`);
        }
        else if (status === 522) {
            console.error(`[Error code: 1117] Timed out error`);
        }
        else if (status === 401) {
            console.error(`[Error code: 1682] Authorization error`);
        }
        else {
            if (status >= 400 && status <= 599) {
                console.error(`[Error code: 1228] ${status} web error code\n`, response, response.body);
                logged = true;
            }
            else {
                console.error(`[Error code: 1064] ${status} statusCode\n`, e);
            }
        }
        return undefined;
    });
    if (jsonResponse == null) {
        return undefined;
    }
    if ((await jsonResponse?.status) >= 400) {
        console.error(`[Error code: 1083] ${jsonResponse?.status}`);
        return undefined;
    }
    if (jsonResponse.code === "EHOSTUNREACH" || jsonResponse.code === "ECONNRESET" || jsonResponse.code === "ERPROTO") {
        console.error(`[Error code: 1109] ${jsonResponse.code}${" " + authorizationData?.displayName || ""}`);
        return undefined;
    }
    return jsonResponse.Response ? jsonResponse.Response : jsonResponse;
}
