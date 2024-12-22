import { ButtonStyle, ColorResolvable } from "discord.js";
import { RaidNames } from "../configs/Raids.js";

export interface RaidData {
	raid: RaidNames;
	raidName: string;
	maxDifficulty: number;
	raidBanner: string;
	raidColor: ColorResolvable;
	channelName: string;
	requiredRole: string | null;
	milestoneHash: number;
}

interface RaidGuideButtonInfo {
	label: string;
	style: ButtonStyle;
	name?: string;
	description?: string;
	image?: string;
	embeds?: {
		name: string;
		description: string;
		image?: string;
	}[];
	attachments?: string[] | { name: string; url: string }[];
}

export interface EncounterGuideInfo {
	name: string;
	description?: string;
	image?: string;
	buttons: RaidGuideButtonInfo[];
}

export interface RaidGuide {
	[key: string]: EncounterGuideInfo[];
}
