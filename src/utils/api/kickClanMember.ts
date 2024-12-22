import { BungieMembershipType, GroupMemberLeaveResult, PlatformErrorCodes } from "bungie-api-ts/groupv2";
import { ServerResponse } from "bungie-api-ts/user";
import { getAdminAccessToken } from "../../commands/clan/main.js";
import { sendApiPostRequest } from "./sendApiPostRequest.js";

export default async (platform: BungieMembershipType, bungieId: string, receivedAccessToken?: string) => {
	// console.debug(`Kicking the user: ${platform}/${bungieId}`);

	const accessToken = receivedAccessToken || (await getAdminAccessToken(process.env.OWNER_ID!));

	const request = await sendApiPostRequest<ServerResponse<GroupMemberLeaveResult>>({
		apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID!}/Members/${platform}/${bungieId}/Kick/`,
		accessToken,
		returnResponse: false,
	});

	if (!request || request.ErrorCode == null) {
		console.error("[Error code: 1945]", request);
		return undefined;
	} else if (request.ErrorCode !== PlatformErrorCodes.Success) {
		console.error("[Error code: 1908]", request);
	}

	// Write some logging about the kicked user
	

	return request.ErrorCode;
};
