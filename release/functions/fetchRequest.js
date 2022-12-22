export async function fetchRequest(url, authorizationData) {
    const cleanUrl = url.startsWith("https://bungie.net/") || url.startsWith("https://www.bungie.net/")
        ? console.error("[Error code: 1025]", "Wrong url", url)
        : url.startsWith("/")
            ? url.slice(1)
            : url;
    const response = await fetch(`https://www.bungie.net/${cleanUrl}`, {
        headers: {
            "X-API-KEY": process.env.XAPI,
            Authorization: `${authorizationData ? `Bearer ${authorizationData.accessToken ?? authorizationData}` : ""}`,
        },
    });
    const jsonResponse = await response.json().catch(async (e) => {
        const status = response?.status;
        if (status === 502)
            return console.error(`[Error code: 1099] Web error`);
        if (status === 409)
            return console.error(`[Error code: 1108] Confilt error`);
        if (status === 522)
            return console.error(`[Error code: 1117] Timed out error`);
        if (status >= 400 || status <= 599)
            return console.error(`[Error code: 1228] ${status} web error code`);
        console.error(`[Error code: 1064] ${status} statusCode\n`, response?.body, "\n", e.stack);
        return undefined;
    });
    if (!jsonResponse || (await jsonResponse?.status) >= 400) {
        if (!jsonResponse)
            return;
        console.error(`[Error code: 1083] ${jsonResponse?.status}`);
        return;
    }
    if (jsonResponse.code === "EHOSTUNREACH" || jsonResponse.code === "ECONNRESET" || jsonResponse.code === "ERPROTO") {
        console.error(`[Error code: 1109] ${jsonResponse.code}${" " + authorizationData?.displayName || ""}`);
        return;
    }
    return jsonResponse.Response ? jsonResponse.Response : jsonResponse;
}
