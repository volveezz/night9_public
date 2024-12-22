import { activeRaidEventFunctions } from "../../persistence/dataStore.js";
import { RaidEvent } from "../../persistence/sequelizeModels/raidEvent.js";
import { pause } from "../utilities.js";

export default async function getRaidEventData(id: number) {
	if (activeRaidEventFunctions.has(id)) {
		await pause(500);
		let attempt = activeRaidEventFunctions.get(id);
		if (attempt) {
			return attempt;
		}
		await pause(1000);
		attempt = activeRaidEventFunctions.get(id);
		if (attempt) {
			return attempt;
		}
	}

	activeRaidEventFunctions.set(id, null);

	const raidData = await RaidEvent.findOne({ where: { id } });

	activeRaidEventFunctions.set(id, raidData);

	setTimeout(() => {
		activeRaidEventFunctions.delete(id);
	}, 30 * 1000);

	return raidData;
}
