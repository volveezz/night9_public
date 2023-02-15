import { CachedDestinyMilestoneDefinition } from "./manifestHandler.js";
const raidMilestoneHashes = new Map();
export async function raidMilestones() {
    Object.values(CachedDestinyMilestoneDefinition).forEach((milestone) => {
        if (milestone.activities) {
            milestone.activities.forEach((activity) => {
                if (activity.phases) {
                    raidMilestoneHashes.set(milestone.hash, activity.activityHash);
                }
            });
        }
    });
}
export default raidMilestoneHashes;
