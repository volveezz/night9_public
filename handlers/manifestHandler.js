import { fetchRequest } from "./webHandler.js";
async function getManifest() {
    try {
        const manifest = await fetchRequest("Platform/Destiny2/Manifest/");
        console.log("Manifest cached. Version:", manifest.version);
        return manifest;
    }
    catch (e) {
        throw { name: "Manifest error", e };
    }
}
async function getSpecificManifest(page) {
    return fetchRequest(`${manifestData.jsonWorldComponentContentPaths.ru[page]}`)
        .then((manifest) => {
        return manifest;
    })
        .catch((e) => console.error(`getSpecificManifest error`, page, e.statusCode));
}
export const manifestData = await getManifest();
export const CachedDestinyRecordDefinition = await getSpecificManifest("DestinyRecordDefinition");
export const CachedDestinyMetricDefinition = await getSpecificManifest("DestinyMetricDefinition");
export const CachedDestinyActivityModifierDefinition = await getSpecificManifest("DestinyActivityModifierDefinition");
export const CachedDestinyActivityDefinition = await getSpecificManifest("DestinyActivityDefinition");
export const CachedDestinyProgressionDefinition = await getSpecificManifest("DestinyProgressionDefinition");
export const CachedDestinyMilestoneDefinition = await getSpecificManifest("DestinyMilestoneDefinition");
