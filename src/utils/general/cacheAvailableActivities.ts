import { DestinyCharacterActivitiesComponent, DestinyProfileResponse } from "bungie-api-ts/destiny2/interfaces.js";
import { client } from "../../index.js";
import { GetManifest } from "../api/ManifestManager.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { stringVariablesMap } from "../persistence/dataStore.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";
import { pause } from "./utilities.js";

type ActivityCache = Record<
	string,
	{
		recommendedPowerLevel: number;
		validModifiers?: number[];
		displayName?: string;
	}
>;

const activityCache: ActivityCache = {};

async function verifyAndReturnExistingRoleIds(roleIdsToVerify: string[]): Promise<string[]> {
	const guildRoles = (await client.getGuild()).roles;
	const existingRoleIds: string[] = [];

	for (const roleId of roleIdsToVerify) {
		if (guildRoles.cache.has(roleId) || (await guildRoles.fetch(roleId).catch((_) => null))) {
			existingRoleIds.push(roleId);
		}
	}

	return existingRoleIds;
}

async function getMemberWithMostActivities() {
	const members = client.getCachedMembers();
	const env = process.env;
	const {
		FORSAKEN_ROLE_ID,
		SHADOWKEEP_ROLE_ID,
		BEYONDLIGHT_ROLE_ID,
		THE_WITCH_QUEEN_ROLE_ID,
		ANNIVERSARY_ROLE_ID,
		LIGHTFALL_ROLE_ID,
		THE_FINAL_SHAPE_ROLE_ID,
	} = env;

	const existingRoleIds = await verifyAndReturnExistingRoleIds([
		FORSAKEN_ROLE_ID!,
		SHADOWKEEP_ROLE_ID!,
		BEYONDLIGHT_ROLE_ID!,
		THE_WITCH_QUEEN_ROLE_ID!,
		ANNIVERSARY_ROLE_ID!,
		LIGHTFALL_ROLE_ID!,
		THE_FINAL_SHAPE_ROLE_ID!,
	]);
	const memberWithAllDLCs =
		members.find((m) => m.roles.cache.hasAll(...existingRoleIds)) || members.find((m) => m.roles.cache.hasAny(...existingRoleIds));

	return memberWithAllDLCs;
}

async function findUserActivities(memberId?: string) {
	const id = memberId || (await getMemberWithMostActivities().catch((_) => null))?.id || "298353895258980362";
	const authData = await AuthData.findByPk(id, { attributes: ["bungieId", "platform", "accessToken"] });
	if (!authData) return null;

	const { accessToken, bungieId, platform } = authData;

	const profileData = await sendApiRequest<DestinyProfileResponse>(
		`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=204,1200`,
		accessToken
	);

	const characterActivities = profileData.characterActivities.data;
	if (!characterActivities) {
		return console.warn(
			`[Error code: 2039] No character activities found for ${platform}${bungieId} [AccessToken: ${accessToken?.length}]`
		);
	}

	return { profileData, characterActivities };
}

async function fetchAndCacheActivities(): Promise<void> {
	let processData: {
		profileData: DestinyProfileResponse;
		characterActivities: {
			[key: string]: DestinyCharacterActivitiesComponent;
		};
	} | void | null = null;

	const [ownerData, randomUserData] = await Promise.all([findUserActivities(process.env.OWNER_ID!), findUserActivities()]);

	if (((ownerData && Object.keys(ownerData).length) || 0) >= ((randomUserData && Object.keys(randomUserData).length) || 0)) {
		processData = ownerData || randomUserData;
	} else {
		processData = randomUserData || ownerData;
	}

	if (!processData) throw { name: "Failed to cache activities" };

	const { characterActivities, profileData } = processData;

	const mostActiveCharacterId = Object.keys(characterActivities).reduce((prevId, currId) =>
		characterActivities[prevId].availableActivities.length > characterActivities[currId].availableActivities.length ? prevId : currId
	);

	const charactersStringVariablesData = profileData.characterStringVariables?.data;

	if (charactersStringVariablesData) {
		const characterWithMostVariables = Object.keys(charactersStringVariablesData).reduce((prevId, currId) => {
			const prevCount = Object.keys(charactersStringVariablesData[prevId].integerValuesByHash || {}).length;
			const currCount = Object.keys(charactersStringVariablesData[currId].integerValuesByHash || {}).length;
			return currCount > prevCount ? currId : prevId;
		});

		if (characterWithMostVariables) {
			const selectedCharacterVariables = charactersStringVariablesData[characterWithMostVariables].integerValuesByHash || {};
			Object.assign(stringVariablesMap, selectedCharacterVariables);
		}
	}

	const relevantActivities = characterActivities[mostActiveCharacterId].availableActivities;
	const [modifierDefinitions, activityDefinitions] = await Promise.all([
		GetManifest("DestinyActivityModifierDefinition"),
		GetManifest("DestinyActivityDefinition"),
	]);

	const newActivityCache: ActivityCache = {};

	// Iterating over relevant activities
	for (const { modifierHashes, activityHash, recommendedLight } of relevantActivities) {
		const verifiedModifiers =
			modifierHashes && modifierHashes.filter((modHash) => modifierDefinitions[modHash]?.displayProperties.name.length > 1);

		// Retrieve displayName from activityManifest
		const displayName = activityDefinitions[activityHash]?.displayProperties?.name;

		newActivityCache[activityHash] = {
			recommendedPowerLevel: recommendedLight ?? 0,
			validModifiers: verifiedModifiers?.length > 0 ? verifiedModifiers : undefined,
			displayName,
		};
	}

	// Remove activities that no longer exist
	for (const activityHash in activityCache) {
		if (!newActivityCache[activityHash]) {
			delete activityCache[activityHash];
			console.info(`Removed activity ${activityHash} from the activity cache`);
		}
	}

	// Update the cache
	Object.assign(activityCache, newActivityCache);

	console.info(`Updated activity cache. (${Object.keys(activityCache).length} activities)`);
}

let isUpdating = false;

async function fetchAndRetry(attempt: number = 1): Promise<void> {
	try {
		await fetchAndCacheActivities();
	} catch (error) {
		console.error(`[Error code: 2040] Attempt ${attempt} failed. Retrying in ${30 * attempt} seconds...`, error);

		await pause(30_000 * attempt);
		await fetchAndRetry(attempt + 1);
	}
}

async function updateActivityCache() {
	// console.debug("Updating activity cache");
	if (isUpdating) return;
	isUpdating = true;

	await fetchAndRetry()
		.catch((error) => {
			console.error(`[Error code: 2041] Unable to update activity cache: ${error}`);
		})
		.finally(() => {
			isUpdating = false;
		});
}

export { activityCache, updateActivityCache };
