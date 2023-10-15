import { GetManifest } from "../api/ManifestManager.js";
import { raidMilestoneHashes } from "../persistence/dataStore.js";
async function cacheRaidMilestones() {
    const milestoneDefinition = await GetManifest("DestinyMilestoneDefinition");
    if (!milestoneDefinition)
        return;
    for (const milestone of Object.values(milestoneDefinition)) {
        if (!milestone.activities)
            continue;
        for (const { phases, activityHash } of milestone.activities) {
            if (!phases)
                continue;
            raidMilestoneHashes.set(activityHash, milestone.hash);
        }
    }
}
export default cacheRaidMilestones;
//# sourceMappingURL=cacheRaidMilestones.js.map