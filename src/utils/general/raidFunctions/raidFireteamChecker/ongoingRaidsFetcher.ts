import Sequelize from "sequelize";
import { RaidEvent } from "../../../persistence/sequelizeModels/raidEvent.js";

const { Op } = Sequelize;
const raidAttributes = ["id", "time", "joined", "hotJoined", "alt", "channelId", "inChannelMessageId", "messageId"];

async function fetchOngoingRaids(requestedRaidId?: number) {
	const currentTime = new Date();
	const currentHour = currentTime.getHours();

	// If it's 23:00:00 or later, adjust to the next day
	if (currentHour >= 23) {
		currentTime.setDate(currentTime.getDate() + 1);
	}

	currentTime.setHours(23, 0, 0, 0);
	const endTime = Math.floor(currentTime.getTime() / 1000);

	// console.debug(`Fetching ongoing raids until ${currentTime}`);

	if (requestedRaidId) {
		const raid = await RaidEvent.findOne({
			where: {
				id: requestedRaidId,
				time: { [Op.lte]: endTime },
			},
			attributes: raidAttributes,
		});
		return raid ? [raid] : [];
	} else {
		return await RaidEvent.findAll({
			where: { time: { [Op.lte]: endTime } },
			attributes: raidAttributes,
		});
	}
}

export default fetchOngoingRaids;
