import { BungieMembershipType } from "bungie-api-ts/common.js";
import { getAdminAccessToken } from "../../commands/clan/main.js";
import { sendApiPostRequest } from "./sendApiPostRequest.js";

type ClanInviteCancelParams = {
	bungieId: string;
	platform: BungieMembershipType | string;
	requestedBy?: string;
};

async function cancelClanInvitation({ platform, bungieId, requestedBy }: ClanInviteCancelParams) {
	const adminAccessToken = await getAdminAccessToken(requestedBy || process.env.OWNER_ID!);

	const request = await sendApiPostRequest({
		apiEndpoint: `/Platform/GroupV2/${process.env.GROUP_ID!}/Members/IndividualInviteCancel/${platform}/${bungieId}/`,
		accessToken: adminAccessToken,
		returnResponse: false,
	});

	return request;
}

export default cancelClanInvitation;
