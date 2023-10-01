import { GetManifest } from "../api/ManifestManager.js";
import { raidMilestoneHashes } from "../persistence/dataStore.js";
async function cacheRaidMilestones() {
    const milestoneDefinition = await GetManifest("DestinyMilestoneDefinition");
    if (!milestoneDefinition)
        return;
    for (const milestone of Object.values(milestoneDefinition)) {
        if (!milestone.activities)
            continue;
        for (const activity of milestone.activities) {
            if (!activity.phases)
                continue;
            raidMilestoneHashes.set(activity.activityHash, milestone.hash);
        }
    }
}
export default cacheRaidMilestones;
//# sourceMappingURL=cacheRaidMilestones.js.map