import { RaidEvent } from "../utils/persistence/sequelizeModels/raidEvent.js";

export interface updatePrivateRaidMessageType {
	raidEvent: RaidEvent | null;
	retry?: boolean;
}
