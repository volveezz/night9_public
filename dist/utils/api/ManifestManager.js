import { sendApiRequest } from "./sendApiRequest.js";
class ManifestManager {
    manifestVersion;
    manifestPaths;
    manifestCache = {};
    async fetchManifest() {
        try {
            const { version, jsonWorldComponentContentPaths } = await sendApiRequest("/Platform/Destiny2/Manifest/");
            this.manifestVersion = version;
            this.manifestPaths = jsonWorldComponentContentPaths["ru"];
        }
        catch (error) {
            console.error(`[Error code: 1662] Error fetching manifest`, error);
            throw error;
        }
    }
    async getDefinition(definitionType) {
        if (!this.manifestPaths) {
            await this.fetchManifest();
        }
        if (this.manifestCache[definitionType]) {
            return this.manifestCache[definitionType];
        }
        try {
            const definition = await sendApiRequest(this.manifestPaths[definitionType]);
            this.manifestCache[definitionType] = definition;
            return definition;
        }
        catch (error) {
            console.error(`[Error code: 1663] Error fetching ${definitionType} definition from Bungie API`, error);
            try {
                const url = `https://raw.githubusercontent.com/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/master/${definitionType}.json`;
                const response = await fetch(url, {
                    headers: {
                        Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`,
                    },
                });
                const backupDefinition = (await response.json());
                this.manifestCache[definitionType] = backupDefinition;
                return backupDefinition;
            }
            catch (error) {
                console.error(`Error fetching backup ${definitionType} definition from GitHub: ${error}`);
                throw error;
            }
        }
    }
    async updateManifest() {
        const oldVersion = this.manifestVersion;
        await this.fetchManifest();
        if (this.manifestVersion !== oldVersion) {
            this.manifestCache = {};
        }
    }
}
export const manifestManager = new ManifestManager();
export async function GetManifest(page) {
    return manifestManager.getDefinition(page);
}
export async function RefreshManifest() {
    return manifestManager.updateManifest();
}
//# sourceMappingURL=ManifestManager.js.map