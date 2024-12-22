import { PlatformErrorCodes, ServerResponse } from "bungie-api-ts/common.js";
import fetch, { HeadersInit } from "node-fetch";
import BungieAPIError from "../../structures/BungieAPIError.js";
import tokenRefresher from "../../structures/tokenRefresher.js";
import { updateEndpointStatus } from "./statusCheckers/statusTracker.js";

const bungieNetUrl = "https://www.bungie.net";

export async function sendApiRequest<T = any, R extends boolean = true>(
	apiEndpoint: string,
	authToken?: any,
	serverResponse?: boolean
): Promise<R extends true ? T : ServerResponse<T>> {
	const headers = createHeaders(authToken);

	const response = await fetch(`${bungieNetUrl}${apiEndpoint}`, { headers }).catch((error) => {
		handleFetchError(error.code || error.message, error);
		throw new Error("[Error code: 1951] Error happened during fetching data");
	});

	if (!response.ok) {
		let errorCode: PlatformErrorCodes | undefined;
		let errorStatus: string | undefined;

		try {
			const json: ServerResponse<any> = (await response.json()) as any;
			errorCode = json?.ErrorCode;
			errorStatus = json?.ErrorStatus;
			// console.debug(`[Error code: 2012]", json?.ErrorStatus || json);
		} catch (error) {
			handleFetchError(response.status, response);
		}

		throw new BungieAPIError(
			"[Error code: 2032] Error happened during fetching data",
			response.status,
			response.statusText,
			errorCode,
			errorStatus
		);
	}

	const jsonResponse = await parseJsonResponse(response).catch((error) => {
		handleFetchError(error.code || error.message, error);
		throw new Error("[Error code: 1953] Error happened during fetching data");
	});

	if (!jsonResponse) {
		console.error("[Error code: 2025]", response.type);
		throw new Error("[Error code: 2027] Error happened during fetching data");
	}

	return jsonResponse.Response && !serverResponse ? jsonResponse.Response : jsonResponse;
}

function createHeaders(authToken?: any): HeadersInit {
	return {
		"X-API-KEY": process.env.XAPI!,
		"Content-Type": "application/json",
		...(authToken && tokenRefresher.wasRefreshedRecently() ? { Authorization: `Bearer ${authToken.accessToken || authToken}` } : {}),
	};
}

async function parseJsonResponse(response: any) {
	try {
		const jsonResponse = await response.json();
		return jsonResponse;
	} catch (error: any) {
		handleFetchError(error.code || error.message, error);
		return null;
	}
}

function handleFetchError(status: any, error: any) {
	const errorMessages: { [key: string]: string } = {
		"524": "A timeout occurred",
		"503": "Server is not available",
		"502": "Web error",
		"409": "Conflict error",
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

		if (status === "401") {
			updateEndpointStatus("oauth", PlatformErrorCodes.TokenInvalid);
		}
	} else {
		if (typeof status === "number" && status >= 400 && status <= 599) {
			console.error(`[Error code: 1228] ${status} web error code\n`);
		} else if (error.stack) {
			console.error(
				`[Error code: 1826] ${error.code} ${error.messageCode} ${error.errorCode} ${error.status} ${error.statusCode}\nStack trace:`,
				error.stack
			);
		} else {
			console.error(`[Error code: 1064] ${status} statusCode\n`, error);
		}
	}
}
