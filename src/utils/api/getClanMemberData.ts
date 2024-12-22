import { BungieMembershipType, GetGroupsForMemberResponse, GroupType, GroupsForMemberFilter } from "bungie-api-ts/groupv2";
import Sequelize from "sequelize";
const { Op } = Sequelize;

import { DiscordClanMember } from "../../interfaces/Clan.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";
import { sendApiRequest } from "./sendApiRequest.js";

async function getClanMemberData(id: AuthData | string | { platform: BungieMembershipType; bungieId: string }): Promise<DiscordClanMember> {
	let authData: AuthData | null = null;

	if (id instanceof AuthData && id.bungieId && id.discordId && id.platform && id.accessToken) {
		authData = id;
	} else {
		const providedUserId =
			(id instanceof AuthData ? id.bungieId || id.discordId || id.membershipId : typeof id === "string" ? id : id.bungieId) || null;
		authData = await AuthData.findOne({
			where: { [Op.or]: [{ discordId: providedUserId }, { bungieId: providedUserId }, { membershipId: providedUserId }] },
		});
	}

	if (typeof id === "string" && !authData) {
		throw { name: "Ошибка. Пользователь не найден в клане" };
	}

	const { platform: membershipType, bungieId: membershipId } = typeof id === "object" && !(id instanceof AuthData) ? id : authData!;

	const destinyRequest = await sendApiRequest<GetGroupsForMemberResponse>(
		`/Platform/GroupV2/User/${membershipType}/${membershipId}/${GroupsForMemberFilter.All}/${GroupType.Clan}/`
	);

	if (!destinyRequest.results || destinyRequest.results.length === 0) {
		return {};
	}

	const clanData = destinyRequest.results[0];
	const returnData = {
		...(authData || {}),
		...(clanData || {}),
	};

	// Check if clan data exists and merge with authData
	if (destinyRequest.results.length === 1) {
		return returnData;
	} else {
		console.error("[Error code: 1905]", destinyRequest.results, authData?.bungieId || id, destinyRequest.totalResults);
		return returnData;
	}
}

export default getClanMemberData;
