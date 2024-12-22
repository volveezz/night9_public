import { PlatformErrorCodes, ServerResponse } from "bungie-api-ts/common.js";
import { requestTokenRefresh } from "../../../core/tokenManagement.js";
import { AuthData } from "../../persistence/sequelizeModels/authData.js";
import { sendApiRequest } from "../sendApiRequest.js";
import { EndpointType } from "./statusTracker.js";

export async function checkEndpointStatus(endpoint: EndpointType): Promise<PlatformErrorCodes> {
	let endpointURL = "";

	const userData = await AuthData.findOne({
		where: { discordId: process.env.OWNER_ID! },
		attributes: ["bungieId", "platform", "accessToken"],
	});

	if (!userData) {
		console.error("[Error code: 1971] No data was found for endpoint checking");
		return PlatformErrorCodes.SystemDisabled;
	}

	const { platform, bungieId, accessToken } = userData;

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
			endpointURL = `/Platform/GroupV2/${process.env.GROUP_ID!}/Members/?memberType=None`;
			break;
	}

	return await handleApiCall(endpointURL, accessToken || null);
}

async function handleApiCall(endpointURL: string, accessToken: string | null) {
	if (endpointURL === "oauth") {
		try {
			// console.debug("Making a Token Refresh request");
			const status = await requestTokenRefresh({ userId: process.env.OWNER_ID! });
			// console.debug(
			// 	`Token refresh completed, status: ${
			// 		status != null && status.refresh_token != null ? PlatformErrorCodes.Success : PlatformErrorCodes.SystemDisabled
			// 	}`
			// );
			return status != null && status.refresh_token != null ? PlatformErrorCodes.Success : PlatformErrorCodes.SystemDisabled;
		} catch (error) {
			console.error("[Error code: 1969]", error);
			return PlatformErrorCodes.SystemDisabled;
		}
	}

	try {
		// console.debug(`Making a request to", endpointURL);
		const request = await sendApiRequest<ServerResponse<any>>(endpointURL, accessToken, true).catch((e) => e);

		const errorCode = request && (request.ErrorCode || request.errorCode);

		// console.debug(`Made a request to", endpointURL, "and got", errorCode);
		if (request && errorCode != null) {
			// console.debug(`[Error code: 2000] Error code for ${endpointURL} is ${errorCode}`);
			return errorCode;
		}
	} catch (error) {
		const { statusCode, statusText, errorCode, errorStatus } = error as any;

		// Log the extracted values
		console.error(
			`[Error code: 1970] StatusCode: ${statusCode}, StatusText: ${statusText}, ErrorCode: ${errorCode}, ErrorStatus: ${errorStatus}`
		);

		// console.error("[Error code: 1970]", error);
		return PlatformErrorCodes.SystemDisabled;
	}

	return PlatformErrorCodes.SystemDisabled;
}
