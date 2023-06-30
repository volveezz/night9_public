import { schedule } from "node-cron";
import { fetchRequest } from "../../api/fetchRequest.js";
let raidActivityHashes = { normal: null, master: null };
const fetchWeeklyRaid = async (retryCount = 0) => {
    try {
        const milestonesObj = await fetchRequest("Platform/Destiny2/Milestones/");
        const milestones = Object.values(milestonesObj);
        const raidMilestone = milestones.find((milestone) => milestone.activities && milestone.activities.some((activity) => activity.challengeObjectiveHashes.includes(406803827)));
        if (raidMilestone && raidMilestone.activities) {
            raidActivityHashes.normal = raidMilestone.activities[0]?.activityHash || null;
            raidActivityHashes.master = raidMilestone.activities[1]?.activityHash || null;
        }
        else {
            console.error("[Error code: 1934] Not managed to get the data, creating a new timeout");
            setTimeout(() => fetchWeeklyRaid(1), 30 * 60 * 1000);
        }
    }
    catch (error) {
        raidActivityHashes = { normal: null, master: null };
        console.error("[Error code: 1933] Error fetching weekly raid:", error);
        const retryInterval = retryCount === 0 ? 5 * 1000 : 30 * 60 * 1000;
        setTimeout(() => fetchWeeklyRaid(retryCount + 1), retryInterval);
    }
};
schedule("1 17 * * 4", () => {
    console.debug("Updating a new weekly raid");
    fetchWeeklyRaid();
}, {
    timezone: "GMT",
});
export const getWeeklyRaidActivityHashes = () => raidActivityHashes;
fetchWeeklyRaid();
