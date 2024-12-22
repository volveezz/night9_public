import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import { DestinyProfileResponse } from "bungie-api-ts/destiny2/interfaces.js";
import { sendApiRequest } from "../../api/sendApiRequest.js";
import { getEndpointStatus } from "../../api/statusCheckers/statusTracker.js";
import { AuthData } from "../../persistence/sequelizeModels/authData.js";
import checkRequirements from "./checkRequirements.js";

async function checkUserRequirements(authData: AuthData) {
	if (getEndpointStatus("account") !== PlatformErrorCodes.Success) return;

	const { platform, bungieId, accessToken } = authData;
	const userProfile = await sendApiRequest<DestinyProfileResponse>(
		`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=900`,
		accessToken
	);

	if (!userProfile || !userProfile.profileRecords.data) {
		return false;
	}

	const { allRequirementsMet, message } = checkRequirements(userProfile);

	return allRequirementsMet ? true : message;
}

export default checkUserRequirements;
