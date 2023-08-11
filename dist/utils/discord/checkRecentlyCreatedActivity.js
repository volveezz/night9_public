import { recentActivityCreators } from "../persistence/dataStore.js";
const FIVE_MINUTES_MS = 1000 * 60 * 5;
function checkIfUserRecentlyCreatedActivity(discordId) {
    const existingTimeout = recentActivityCreators.get(discordId);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
        setNewTimeout();
        return true;
    }
    else {
        setNewTimeout();
        return false;
    }
    function setNewTimeout() {
        const timeout = setTimeout(() => {
            recentActivityCreators.delete(discordId);
        }, FIVE_MINUTES_MS);
        recentActivityCreators.set(discordId, timeout);
    }
}
export default checkIfUserRecentlyCreatedActivity;
//# sourceMappingURL=checkRecentlyCreatedActivity.js.map