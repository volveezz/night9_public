import { ServerResponse } from "bungie-api-ts/common.js";

export interface ApiRequestParams {
	apiEndpoint: string;
	requestData?: any;
	accessToken?: any;
	returnResponse?: boolean;
}

export async function sendApiPostRequest(params: ApiRequestParams & { returnResponse: false }): Promise<ServerResponse<any>>;
export async function sendApiPostRequest<T>(params: ApiRequestParams): Promise<T>;
export async function sendApiPostRequest({ apiEndpoint, accessToken, requestData, returnResponse }: ApiRequestParams): Promise<any> {
	const apiUrl = `https://www.bungie.net${apiEndpoint}`;

	const headers = createHeaders(accessToken);
	const options = createRequestOptions(headers, requestData);

	try {
		const response = await fetch(apiUrl, options);
		if (!response.ok) {
			console.error(`[Error code: 1831] Error fetching data: ${response.status} ${response.type}`);
			return undefined;
		}

		const jsonResponse = await parseJsonResponse(response);
		return jsonResponse.Response && returnResponse ? jsonResponse.Response : jsonResponse;
	} catch (error) {
		console.error("[Error code: 1833] Unexpected error:", error);
		return undefined;
	}
}

function createHeaders(authToken?: any) {
	return {
		"Content-Type": "application/json",
		"X-API-Key": process.env.XAPI!,
		...(authToken ? { Authorization: `Bearer ${authToken.accessToken || authToken}` } : {}),
	};
}

function createRequestOptions(headers: any, requestData?: any) {
	return {
		method: "POST",
		headers: headers,
		...(requestData ? { body: JSON.stringify(requestData) } : {}),
	};
}

async function parseJsonResponse(response: any) {
	try {
		const jsonResponse = await response.json();
		return jsonResponse;
	} catch (error: any) {
		console.error("[Error code: 1832] Error parsing JSON response:", error.stack || error);
		return null;
	}
}
