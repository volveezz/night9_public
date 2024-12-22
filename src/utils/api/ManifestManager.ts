import { DestinyManifest } from "bungie-api-ts/destiny2/interfaces.js";
import { AllDestinyManifestComponents } from "bungie-api-ts/destiny2/manifest.js";
import { pause } from "../general/utilities.js";
import { sendApiRequest } from "./sendApiRequest.js";

class ManifestManager<T extends keyof AllDestinyManifestComponents> {
	private manifestVersion?: string;
	private manifestPaths?: Record<string, string>;
	private manifestCache: Partial<Record<T, AllDestinyManifestComponents[T]>> = {};

	private async fetchManifest(): Promise<void> {
		try {
			const { version, jsonWorldComponentContentPaths } = await sendApiRequest<DestinyManifest>("/Platform/Destiny2/Manifest/");
			this.manifestVersion = version;
			this.manifestPaths = jsonWorldComponentContentPaths["ru"];
		} catch (error) {
			console.error(`[Error code: 1662] Error fetching manifest`, error);
			throw error;
		}
	}

	public async getDefinition(definitionType: T): Promise<AllDestinyManifestComponents[T]> {
		try {
			if (!this.manifestPaths) {
				await this.fetchManifest();
			}

			if (this.manifestCache[definitionType]) {
				return this.manifestCache[definitionType] as AllDestinyManifestComponents[T];
			}

			const definition = await sendApiRequest<AllDestinyManifestComponents[T]>(this.manifestPaths![definitionType]);
			this.manifestCache[definitionType] = definition;
			return definition;
		} catch (error) {
			console.error(`[Error code: 1663] Error fetching ${definitionType} definition from Bungie API`, error);

			try {
				console.info(`Trying to fetch backup ${definitionType} definition from GitHub`);

				// If fetching from the Bungie API fails, try to fetch the backup definition from GitHub repo.
				const url = `https://raw.githubusercontent.com/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/master/${definitionType}.json`;
				const response = await fetch(url, {
					headers: {
						Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`,
					},
				});
				const backupDefinition = (await response.json()) as AllDestinyManifestComponents[T];
				this.manifestCache[definitionType] = backupDefinition;

				return backupDefinition;
			} catch (error) {
				console.error(`[Error code: 2026] Error fetching backup ${definitionType} definition from GitHub: ${error}`);
				throw error;
			}
		}
	}

	public async updateManifest(): Promise<void> {
		const oldVersion = this.manifestVersion;
		await this.fetchManifest();
		if (this.manifestVersion !== oldVersion) {
			console.info(`Manifest updated from ${oldVersion} to ${this.manifestVersion}`);
			this.manifestCache = {};
		}
	}
}

const manifestManager = new ManifestManager();

export async function GetManifest<T extends keyof AllDestinyManifestComponents>(page: T): Promise<AllDestinyManifestComponents[T]> {
	return manifestManager.getDefinition(page) as Promise<AllDestinyManifestComponents[T]>;
}

let isManifestUpdating = false;

export async function refreshManifest(): Promise<void> {
	if (isManifestUpdating) return;
	isManifestUpdating = true;

	await manifestManager.updateManifest();

	await pause(1000 * 15);

	isManifestUpdating = false;

	return;
}
