import { ButtonType } from "../types/button.js";

export class Button {
	constructor(commandOptions: ButtonType) {
		Object.assign(this, commandOptions);
	}
}
