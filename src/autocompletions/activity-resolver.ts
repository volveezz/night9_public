import { ApplicationCommandOptionChoiceData } from "discord.js";
import { Autocomplete } from "../structures/autocomplete.js";
import { activityCache } from "../utils/general/cacheAvailableActivities.js";

export function findLFGActivityHashFromName(name: string): string | null {
	for (const [hash, { displayName, recommendedPowerLevel }] of Object.entries(activityCache)) {
		if (!displayName) continue;

		if (`${displayName} (Уровень силы: ${recommendedPowerLevel})`.toLowerCase() === name.toLowerCase()) {
			return hash;
		}
	}

	return null;
}

async function findActivities(activityNameOrHash: string): Promise<ApplicationCommandOptionChoiceData[]> {
	const searchString = activityNameOrHash.toLowerCase();
	const matchedActivities: ApplicationCommandOptionChoiceData[] = [];

	for (const [hash, { displayName, recommendedPowerLevel }] of Object.entries(activityCache)) {
		if (matchedActivities.length >= 25) break;

		if (!displayName) continue;

		if (!isNaN(Number(searchString))) {
			if (hash === searchString) {
				addOrUpdateActivity(displayName, recommendedPowerLevel, hash);
			}
			continue;
		}

		const lowerCaseDisplayName = displayName.toLowerCase();
		if (lowerCaseDisplayName.includes(searchString)) {
			addOrUpdateActivity(displayName, recommendedPowerLevel, hash);
		}
	}

	function addOrUpdateActivity(displayName: string, recommendedPowerLevel: number, hash: string) {
		const choiceData: ApplicationCommandOptionChoiceData = {
			name: `${displayName} (Уровень силы: ${recommendedPowerLevel})`.slice(0, 100),
			value: hash.slice(0, 100),
		};

		matchedActivities.push(choiceData);
	}

	function validateArray(array: ApplicationCommandOptionChoiceData[]): ApplicationCommandOptionChoiceData[] {
		const nameSet = new Set<string>();

		return array.filter((item) => {
			if (item.name.length > 0 && item.name.length < 100 && !nameSet.has(item.name)) {
				nameSet.add(item.name);
				return true;
			}
			return false;
		});
	}

	return validateArray(matchedActivities);
}

const AutocompleteFile = new Autocomplete({
	name: "activity",
	aliases: ["new-activity"],
	run: async ({ interaction, option }) => {
		const activityNameOrHash = option?.value;

		if (!activityNameOrHash || activityNameOrHash.length < 1) {
			await interaction.respond([
				{ name: activityNameOrHash.slice(0, 100) || "Проверьте введенное название активности", value: "null" },
			]);
			return;
		}

		const resolvedActivity = await findActivities(activityNameOrHash);

		if (!resolvedActivity || resolvedActivity.length === 0) {
			await interaction.respond([
				{
					name: activityNameOrHash.slice(0, 100) || "Проверьте введенное название активности",
					value: activityNameOrHash.slice(0, 100) || "null",
				},
			]);
			return;
		}

		try {
			await interaction.respond(resolvedActivity);
		} catch (error) {
			console.error("[Error code: 2109] Received an error when tried to respond to the autocomplete activity interaction");
			console.error("Error data:", resolvedActivity);
		}
	},
});

export default AutocompleteFile;
