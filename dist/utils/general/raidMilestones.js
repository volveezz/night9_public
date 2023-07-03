import { CachedDestinyMilestoneDefinition } from "../api/manifestHandler.js";
const raidMilestoneHashes = new Map();
async function cacheRaidMilestones() {
    if (!CachedDestinyMilestoneDefinition)
        return;
    Object.values(CachedDestinyMilestoneDefinition).forEach((milestone) => {
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