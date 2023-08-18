import { GetManifest } from "../api/ManifestManager.js";
const raidMilestoneHashes = new Map();
async function cacheRaidMilestones() {
    const milestoneDefinition = await GetManifest("DestinyMilestoneDefinition");
    if (!milestoneDefinition)
        return;
    for (const milestone of Object.values(milestoneDefinition)) {
        if (!milestone.activities)
            return;
        for (const activity of milestone.activities) {
            if (!activity.phases)
                return;
            raidMilestoneHashes.set(activity.activityHash, milestone.hash);
        }
    }
}
export { cacheRaidMilestones, raidMilestoneHashes };
//# sourceMappingURL=raidMilestones.js.map