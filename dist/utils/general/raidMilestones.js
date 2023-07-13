import { GetManifest } from "../api/ManifestManager.js";
const raidMilestoneHashes = new Map();
async function cacheRaidMilestones() {
    const milestoneDefinition = await GetManifest("DestinyMilestoneDefinition");
    if (!milestoneDefinition)
        return;
    Object.values(milestoneDefinition).forEach((milestone) => {
        if (milestone.activities) {
            milestone.activities.forEach((activity) => {
                if (activity.phases) {
                    raidMilestoneHashes.set(activity.activityHash, milestone.hash);
                }
            });
        }
    });
}
export { cacheRaidMilestones, raidMilestoneHashes };
//# sourceMappingURL=raidMilestones.js.map