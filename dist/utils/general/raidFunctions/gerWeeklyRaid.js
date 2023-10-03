import { schedule } from "node-cron";
import { refreshManifest } from "../../api/ManifestManager.js";
import { sendApiRequest } from "../../api/sendApiRequest.js";
import { grandmasterHashes } from "../../persistence/dataStore.js";
const raidChallengeObjHashes = [406803827, 897950155, 3211393925, 1283234589, 3838169295];
let raidActivityHashes = { normal: null, master: null };
const fetchWeeklyRaid = async (retryCount = 0) => {
    try {
        const milestonesObj = await sendApiRequest("/Platform/Destiny2/Milestones/");
        const milestones = Object.values(milestonesObj);
        const raidMilestone = milestones.find((milestone) => milestone.activities &&
            (milestone.activities.some((activity) => raidChallengeObjHashes.some((value) => activity.challengeObjectiveHashes.includes(value))) ||
                milestone.activities.some((activity) => raidChallengeObjHashes.some((_) => activity.challengeObjectiveHashes.length === 1))));
        if (raidMilestone && raidMilestone.activities) {
            raidActivityHashes.normal = raidMilestone.activities[0]?.activityHash || null;
            raidActivityHashes.master = raidMilestone.activities[1]?.activityHash || null;
        }
        else {
            console.error("[Error code: 1934] Not managed to get raid challenge hash, creating a new timeout");
            setTimeout(() => fetchWeeklyRaid(1), 30 * 60 * 1000);
        }
    }
    catch (error) {
        raidActivityHashes = { normal: null, master: null };
        console.error("[Error code: 1933] Error fetching weekly raid:", error.stack || error);
        const retryInterval = retryCount === 0 ? 5 * 1000 : 30 * 60 * 1000;
        setTimeout(() => fetchWeeklyRaid(retryCount + 1), retryInterval);
    }
};
schedule("1 17 * * 2", () => {
    console.debug("Updating a new weekly raid");
    fetchWeeklyRaid();
    refreshManifest();
    grandmasterHashes.clear();
}, {
    timezone: "GMT",
});
export const getWeeklyRaidActivityHashes = () => raidActivityHashes;
fetchWeeklyRaid();
//# sourceMappingURL=gerWeeklyRaid.js.map