import { GetManifest } from "../api/ManifestManager.js";
import { grandmasterHashes } from "../persistence/dataStore.js";
async function getGrandmasterHashes() {
    if (grandmasterHashes.size > 0)
        return grandmasterHashes;
    const manifest = await GetManifest("DestinyActivityDefinition");
    Object.keys(manifest).forEach((activityHash) => {
        const key = Number(activityHash);
        const activity = manifest[key];
        if (activity.modifiers && activity.modifiers.some((modifier) => modifier.activityModifierHash === 791047754)) {
            grandmasterHashes.add(activity.hash);
        }
    });
    return grandmasterHashes;
}
export default getGrandmasterHashes;
//# sourceMappingURL=getGrandmasterHashes.js.map