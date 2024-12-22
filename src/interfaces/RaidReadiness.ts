import { Message, Snowflake, TextChannel } from "discord.js";
import { RaidReadinessButtons } from "../configs/Buttons.js";
import { RaidEvent } from "../utils/persistence/sequelizeModels/raidEvent.js";

export interface RaidDetails {
	channel: TextChannel | null;
	message: Message | null;
	readyMembers: Set<string>;
	lateMembers: Set<string>;
	notReadyMembers: Set<string>;
	unmarkedMembers: Set<string>;
	lateReasons: Map<string, string>;
}

export interface RaidEventEvents {
	join: (raidData: RaidEvent, userId: Snowflake) => void;
	leave: (raidData: RaidEvent, userId: Snowflake) => void;
	deleted: (raidData: RaidEvent) => void;
}

export interface UserReadinessStatus {
	discordId: Snowflake;
	raidId: number;
	button: RaidReadinessButtons;
}

export interface UserReadinessLateReason {
	discordId: Snowflake;
	raidId: number;
	reason: string;
}
