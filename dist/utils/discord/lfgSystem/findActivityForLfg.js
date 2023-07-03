import { CachedDestinyActivityDefinition } from "../../api/manifestHandler.js";
const findActivityForLfgInternal = (activityNameUnconverted, difficulty, partialMatch = false) => {
    const activityName = activityNameUnconverted.toLowerCase();
    return Object.values(CachedDestinyActivityDefinition).find((searchActivity) => {
        const activityNameMatch = partialMatch
            ? searchActivity.originalDisplayProperties.name.toLowerCase().startsWith(activityName) ||
                searchActivity.originalDisplayProperties.name.toLowerCase().endsWith(activityName)
            : searchActivity.originalDisplayProperties.name.toLowerCase() === activityName;
        if (activityNameMatch) {
            const difficultyMatch = searchActivity.displayProperties.name.toLowerCase() === `${activityName}: ${(difficulty ?? "нормальный").toLowerCase()}` ||
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
const findActivityForLfg = (activityName, difficulty, partialMatch = false) => {
    let result = findActivityForLfgInternal(activityName, difficulty, partialMatch);
    if (!result) {
        result = findActivityForLfgInternal(activityName, "нормальный", partialMatch);
    }
    if (!result) {
        result = findActivityForLfgInternal(activityName, null, partialMatch);
    }
    return result;
};
export default findActivityForLfg;
//# sourceMappingURL=findActivityForLfg.js.map