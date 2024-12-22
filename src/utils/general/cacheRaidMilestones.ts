import { GetManifest } from "../api/ManifestManager.js";
import { raidMilestoneHashes } from "../persistence/dataStore.js";

async function cacheRaidMilestones() {
	const milestoneDefinition = await GetManifest("DestinyMilestoneDefinition");

	if (!milestoneDefinition) {
		console.error("[Error code: 2119] Failed to get DestinyMilestoneDefinition, retrying in 30 mins...");
		setTimeout(cacheRaidMilestones, 1000 * 60 * 3000);
		return;
	}

	for (const milestone of Object.values(milestoneDefinition)) {
		if (!milestone.activities) continue;

		for (const { phases, activityHash } of milestone.activities) {
			if (!phases) continue;

			raidMilestoneHashes.set(activityHash, milestone.hash);
		}
	}
}

export default cacheRaidMilestones;
