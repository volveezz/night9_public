import { PlatformErrorCodes } from "bungie-api-ts/common.js";
import { DestinyActivityModeType } from "bungie-api-ts/destiny2/interfaces.js";
import Sequelize from "sequelize";
const { Op } = Sequelize;

import { client } from "../index.js";
import { getEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { destinyActivityChecker } from "../utils/general/destinyActivityChecker.js";
import { pause } from "../utils/general/utilities.js";
import { clanOnline } from "../utils/persistence/dataStore.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";

async function checkClanActivitiesPeriodically() {
	if (process.env.NODE_ENV! === "development") return;

	setInterval(async () => {
		if (getEndpointStatus("activity") !== PlatformErrorCodes.Success) return;

		const onlineClanMembers = await AuthData.findAll({
			where: {
				discordId: {
					[Op.in]: Array.from(clanOnline.keys()),
				},
			},
			attributes: ["discordId", "bungieId", "displayName", "platform", "accessToken"],
		});

		// const missingUsers = onlineClanMembers
		// 	.filter((memberData) => !client.getCachedMembers().has(memberData.discordId))
		// 	.map((missingMember) => {
		// 		return `[Error code: 1008] ${missingMember.displayName}/${missingMember.discordId} not found on server`;
		// 	});

		// if (missingUsers.length > 0) {
		// 	await client.getCachedGuild().fetch();
		// 	console.error("[Error code: 1005]", missingUsers);
		// }

		const cachedMembers = client.getCachedMembers();

		for (const memberData of onlineClanMembers) {
			const member = cachedMembers.get(memberData.discordId);

			if (!member) {
				await client.getCachedGuild().fetch();
				console.error("[Error code: 1007]", memberData.displayName);
				continue;
			}

			await destinyActivityChecker({ authData: memberData, mode: DestinyActivityModeType.AllPvE, count: 3 });

			await pause(250);
		}
	}, 1000 * 60);
}

export default checkClanActivitiesPeriodically;
