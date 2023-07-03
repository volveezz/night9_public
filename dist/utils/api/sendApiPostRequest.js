export async function sendApiPostRequest({ apiEndpoint, authToken, requestData, shouldReturnResponse }) {
    const apiUrl = `https://www.bungie.net/${apiEndpoint}`;
    const headers = createHeaders(authToken);
    const options = createRequestOptions(headers, requestData);
    try {
        const response = await fetch(apiUrl, options);
        if (!response.ok) {
            console.error(`[Error code: 1831] Error fetching data: ${response.statusText}`);
            return undefined;
        }
        const jsonResponse = await parseJsonResponse(response);
        return jsonResponse.Response && shouldReturnResponse ? jsonResponse.Response : jsonResponse;
    }
    catch (error) {
        console.error("[Error code: 1833] Unexpected error:", error);
        return undefined;
    }
}
function createHeaders(authToken) {
    return {
        "Content-Type": "application/json",
        "X-API-Key": process.env.XAPI,
        ...(authToken ? { Authorization: `Bearer ${authToken.accessToken || authToken}` } : {}),
    };
}
function createRequestOptions(headers, requestData) {
    return {
        method: "POST",
        headers: headers,
        ...(requestData ? { body: JSON.stringify(requestData) } : {}),
    };
}
async function parseJsonResponse(response) {
    try {
        const jsonResponse = await response.json();
        return jsonResponse;
    }
    catch (error) {
        console.error("[Error code: 1832] Error parsing JSON response:", error.stack || error);
        return null;
    }
}
//# sourceMappingURL=sendApiPostRequest.js.map