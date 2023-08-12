import { activeRaidEventFunctions } from "../../persistence/dataStore.js";
import { RaidEvent } from "../../persistence/sequelize.js";
import { pause } from "../utilities.js";
export default async function getRaidEventData(id) {
    if (activeRaidEventFunctions.has(id)) {
        console.debug("Found caching raid data", id);
        await pause(500);
        let attempt = activeRaidEventFunctions.get(id);
        if (attempt) {
            console.debug("Returning cached raid data after 1 await", id);
            return attempt;
        }
        await pause(1000);
        attempt = activeRaidEventFunctions.get(id);
        if (attempt) {
            console.debug("Returning cached raid data after 2 awaits", id);
            return attempt;
        }
    }
    activeRaidEventFunctions.set(id, null);
    const raidData = await RaidEvent.findOne({ where: { id } });
    activeRaidEventFunctions.set(id, raidData);
    console.debug("Saved raid data to cache", id);
    setTimeout(() => {
        activeRaidEventFunctions.delete(id);
        console.debug("Deleted raid data from cache", id);
    }, 60 * 1000);
    return raidData;
}
//# sourceMappingURL=getRaidEventData.js.map