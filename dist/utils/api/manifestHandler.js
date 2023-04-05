import { fetchRequest } from "./fetchRequest.js";
async function getManifest() {
    try {
        const manifest = await fetchRequest("Platform/Destiny2/Manifest/");
        console.log(`Manifest cached. Version: ${manifest.version}`);
        return manifest;
    }
    catch (e) {
        console.error(`[Error code: 1662] Manifest error`, e);
        throw e;
    }
}
async function getSpecificManifest(page) {
    return fetchRequest(`${manifestData.jsonWorldComponentContentPaths?.ru?.[page]}`)
        .then((manifest) => {
        return manifest;
    })
        .catch((e) => console.error(`[Error code: 1663] Manifest cacher error for ${page}\n`, e));
}
const manifestData = await getManifest();
export const CachedDestinyRecordDefinition = await getSpecificManifest("DestinyRecordDefinition");
export const CachedDestinyActivityModifierDefinition = await getSpecificManifest("DestinyActivityModifierDefinition");
export const CachedDestinyActivityDefinition = await getSpecificManifest("DestinyActivityDefinition");
export const CachedDestinyProgressionDefinition = await getSpecificManifest("DestinyProgressionDefinition");
export const CachedDestinyMilestoneDefinition = await getSpecificManifest("DestinyMilestoneDefinition");
export const CachedDestinyRaceDefinition = await getSpecificManifest("DestinyRaceDefinition");
