import { CommandType } from "../types/command.js";

export class Command {
	constructor(commandOptions: CommandType) {
		Object.assign(this, commandOptions);
	}
}
