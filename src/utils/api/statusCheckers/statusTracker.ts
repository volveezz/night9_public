import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import { startEndpointCheck } from "./endpointChecker.js";

export type EndpointType = "account" | "oauth" | "activity" | "api";

const endpointStatuses: Record<EndpointType, PlatformErrorCodes> = {
	account: PlatformErrorCodes.Success,
	oauth: PlatformErrorCodes.Success,
	activity: PlatformErrorCodes.Success,
	api: PlatformErrorCodes.Success,
};

export const endpointCheckers: Record<EndpointType, Promise<void> | undefined> = {
	account: undefined,
	oauth: undefined,
	activity: undefined,
	api: undefined,
};

export function updateEndpointStatus(endpoint: EndpointType, status: PlatformErrorCodes) {
	if (status === PlatformErrorCodes.DestinyPrivacyRestriction) {
		console.error("[Error code: 2081] Request failed due user's privacy settings");
		return;
	}

	endpointStatuses[endpoint] = status;

	if (status !== PlatformErrorCodes.Success && !endpointCheckers[endpoint]) {
		endpointCheckers[endpoint] = startEndpointCheck(endpoint);
	}
}

export function getEndpointStatus(endpoint: EndpointType) {
	if (endpointStatuses.api !== PlatformErrorCodes.Success) {
		return endpointStatuses.api;
	} else {
		return endpointStatuses[endpoint];
	}
}
