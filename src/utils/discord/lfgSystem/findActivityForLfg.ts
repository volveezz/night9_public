import { DestinyActivityDefinition } from "bungie-api-ts/destiny2/interfaces.js";
import { GetManifest } from "../../api/ManifestManager.js";

type LfgActivitySearch = (activityName: string, difficulty: string | null, partialMatch?: boolean) => DestinyActivityDefinition | undefined;

const activityDefinition = await GetManifest("DestinyActivityDefinition");

const findActivityForLfgInternal: LfgActivitySearch = (activityNameUnconverted, difficulty, partialMatch = false) => {
	const activityName = activityNameUnconverted.toLowerCase();

	return Object.values(activityDefinition).find((searchActivity) => {
		const activityNameMatch = partialMatch
			? searchActivity.originalDisplayProperties.name.toLowerCase().startsWith(activityName) ||
			  searchActivity.originalDisplayProperties.name.toLowerCase().endsWith(activityName)
			: searchActivity.originalDisplayProperties.name.toLowerCase() === activityName;

		if (activityNameMatch) {
			const difficultyMatch =
				searchActivity.displayProperties.name.toLowerCase() === `${activityName}: ${(difficulty ?? "нормальный").toLowerCase()}` ||
				searchActivity.selectionScreenDisplayProperties?.name?.toLowerCase() === (difficulty ?? "нормальный").toLowerCase() ||
				(!difficulty &&
					(!searchActivity.selectionScreenDisplayProperties ||
						searchActivity.selectionScreenDisplayProperties.name.toLowerCase() === "нормальный"));

			if (difficultyMatch) {
				return searchActivity;
			}
		}
	});
};

const findActivityForLfg: LfgActivitySearch = (activityName, difficulty, partialMatch = false) => {
	// Attempt with provided difficulty
	let result = findActivityForLfgInternal(activityName, difficulty, partialMatch);

	// If not found, retry with default difficulty
	if (!result) {
		result = findActivityForLfgInternal(activityName, "нормальный", partialMatch);
	}

	// If still not found, retry without difficulty
	if (!result) {
		result = findActivityForLfgInternal(activityName, null, partialMatch);
	}

	return result;
};

export default findActivityForLfg;
