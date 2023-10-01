import { Autocomplete } from "../structures/autocomplete.js";
import { activityCache } from "../utils/general/cacheAvailableActivities.js";
async function findActivities(activityNameOrHash) {
    const searchString = activityNameOrHash.toLowerCase();
    const matchedActivities = [];
    for (const [hash, { displayName, recommendedPowerLevel }] of Object.entries(activityCache)) {
        if (matchedActivities.length >= 25)
            break;
        if (!displayName)
            continue;
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
    function addOrUpdateActivity(displayName, recommendedPowerLevel, hash) {
        const choiceData = {
            name: `${displayName} (Уровень силы: ${recommendedPowerLevel})`.slice(0, 100),
            value: hash.slice(0, 100),
        };
        matchedActivities.push(choiceData);
    }
    return matchedActivities;
}
const AutocompleteFile = new Autocomplete({
    name: "activity",
    aliases: ["new-activity"],
    run: async ({ interaction, option }) => {
        const activityNameOrHash = option?.value;
        if (!activityNameOrHash || activityNameOrHash.length < 1) {
            interaction.respond([{ name: activityNameOrHash.slice(0, 100) || "Проверьте введенное название активности", value: "null" }]);
            return;
        }
        const resolvedActivity = await findActivities(activityNameOrHash);
        if (!resolvedActivity || resolvedActivity.length === 0) {
            interaction.respond([
                {
                    name: activityNameOrHash.slice(0, 100) || "Проверьте введенное название активности",
                    value: activityNameOrHash.slice(0, 100) || "null",
                },
            ]);
            return;
        }
        await interaction.respond(resolvedActivity);
    },
});
export default AutocompleteFile;
//# sourceMappingURL=activity-resolver.js.map