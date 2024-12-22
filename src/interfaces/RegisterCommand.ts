import { ApplicationCommandDataResolvable } from "discord.js";

export interface RegisterCommandOptions {
	global?: boolean;
	commands: ApplicationCommandDataResolvable[];
}
