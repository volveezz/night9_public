import { GetManifest } from "../api/ManifestManager.js";
import { grandmasterHashes } from "../persistence/dataStore.js";
async function getGrandmasterHashes() {
    if (grandmasterHashes.size > 0)
        return grandmasterHashes;
    const manifest = await GetManifest("DestinyActivityDefinition");
    const grandmasterObject = Object.values(manifest).filter((activity) => {
        return activity.modifiers.includes({
            activityModifierHash: 791047754,
        });
    });
    grandmasterObject.forEach((activity) => grandmasterHashes.add(activity.hash));
    return grandmasterHashes;
}
export default getGrandmasterHashes;
//# sourceMappingURL=getGrandmasterHashes.js.map