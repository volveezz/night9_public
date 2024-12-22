import { AutocompleteType } from "autocomplete.js";

export class Autocomplete {
	constructor(commandOptions: AutocompleteType) {
		Object.assign(this, commandOptions);
	}
}
