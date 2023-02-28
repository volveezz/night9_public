import { CachedDestinyMilestoneDefinition } from "./manifestHandler.js";
const raidMilestoneHashes = new Map();
export async function raidMilestones() {
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
export default raidMilestoneHashes;
