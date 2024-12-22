import { DestinyPublicMilestone } from "bungie-api-ts/destiny2/interfaces.js";
import { schedule } from "node-cron";
import { refreshManifest } from "../../api/ManifestManager.js";
import { sendApiRequest } from "../../api/sendApiRequest.js";
import { grandmasterHashes } from "../../persistence/dataStore.js";

const raidWeeklyChallengeHashes = [897950155, 2398860795, 3826130187, 3180884403, 1863972407, 406803827, 1633394671];

// Definition and cache for the activity hashes
let raidActivityHashes: { normal: number | null; master: number | null } = { normal: null, master: null };

// Function to fetch the weekly raid
const fetchWeeklyRaid = async (retryCount = 0) => {
	try {
		const milestonesObj = await sendApiRequest<DestinyPublicMilestone[]>("/Platform/Destiny2/Milestones/");

		const milestones = Object.values(milestonesObj);

		const raidMilestone = milestones.find(
			(milestone) =>
				milestone.activities?.length > 0 &&
				milestone.activities.some((activity) =>
					activity.challengeObjectiveHashes.some((hash) => raidWeeklyChallengeHashes.includes(hash))
				)
		);

		if (raidMilestone?.activities) {
			raidActivityHashes.normal = raidMilestone.activities[0]?.activityHash || null;
			raidActivityHashes.master = raidMilestone.activities[1]?.activityHash || null;
		} else {
			// Retry indefinitely every 30 minutes if the data is not available
			console.error("[Error code: 1934] Not managed to get raid challenge hash, creating a new timeout");
			setTimeout(() => fetchWeeklyRaid(1), 30 * 60 * 1000);
		}
	} catch (error: any) {
		raidActivityHashes = { normal: null, master: null };
		console.error("[Error code: 1933] Error fetching weekly raid:", error.stack || error);
		// Retry mechanism with different intervals based on retry count
		const retryInterval = retryCount === 0 ? 5 * 1000 : 30 * 60 * 1000; // 5 seconds for the first retry, 30 minutes afterward
		setTimeout(() => fetchWeeklyRaid(retryCount + 1), retryInterval);
	}
};

// Schedule the function to run every Tuesday day at 17:01 GMT
// Gives a 1-minute buffer for data to be updated in the API
schedule(
	"1 17 * * 2",
	() => {
		fetchWeeklyRaid();
		refreshManifest();
		grandmasterHashes.clear();
	},
	{
		timezone: "GMT",
	}
);

// Export the raidActivityHashes so it can be used in other files
export const getWeeklyRaidActivityHashes = () => raidActivityHashes;

// Fetch the raid immediately on startup as well
fetchWeeklyRaid();
