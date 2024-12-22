import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import { parseIdentifierString } from "../general/utilities.js";
import cancelClanInvitation from "./cancelClanInvitation.js";

// Object to store timeouts for each user
const timeouts: { [key: string]: NodeJS.Timeout } = {};

export async function setupClanInviteCancellation(identifier: string, time: number, caller: string) {
	const { platform, bungieId } = parseIdentifierString(identifier)!;

	if (!platform || !bungieId) {
		console.error("[Error code: 1910]", identifier, time, caller);
		return;
	}

	// Cancel the previous timeout for this user if exists
	if (timeouts[bungieId]) {
		clearTimeout(timeouts[bungieId]);
	}

	// Set a new timeout for this user
	timeouts[bungieId] = setTimeout(async () => {
		// This will be executed after the timeout

		const request = await cancelClanInvitation({ bungieId, platform, requestedBy: caller });

		if (request.ErrorCode !== PlatformErrorCodes.Success) {
			console.error("[Error code: 1911]", request, identifier, time, caller);
		}

		// Remove the timeout from the object
		delete timeouts[bungieId];
	}, time * 1000 * 60);
}
