import { RaidNames } from "../configs/Raids.js";

interface ActivityCompletionAuthData {
	platform: number;
	bungieId: string;
	discordId: string;
}
interface ActivityCompletionRaidEvent {
	raid: RaidNames | number;
	id?: number;
}

interface ActivityCompletionProperties {
	characterId: string;
}

export type ActivityCompletionChecker = ActivityCompletionAuthData & ActivityCompletionRaidEvent & ActivityCompletionProperties;
