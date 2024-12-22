import { LFGController } from "../structures/LFGController.js";
import { Autocomplete } from "../structures/autocomplete.js";

const AutocompleteFile = new Autocomplete({
	name: "lfg-id",
	run: async ({ interaction }) => {
		const ids = LFGController.getInstance().findAvailableLfgIdsForUser(
			interaction.memberPermissions?.has("Administrator") ? undefined : interaction.user.id
		);

		const idsMap = ids.map((id) => {
			return { name: String(id), value: id };
		});

		await interaction.respond(idsMap);
	},
});

export default AutocompleteFile;
