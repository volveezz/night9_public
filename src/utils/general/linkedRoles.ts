import crypto from "crypto";
import fetch from "node-fetch";
import { client } from "../../index.js";
import * as storage from "../persistence/webStorage.js";

/**
 * Code specific to communicating with the Discord API.
 */

/**
 * The following methods all facilitate OAuth2 communication with Discord.
 * See https://discord.com/developers/docs/topics/oauth2 for more details.
 */

/**
 * Generate the url which the user will be directed to in order to approve the
 * bot, and see the list of requested scopes.
 */
export function getOAuthUrl() {
	const state = crypto.randomUUID();

	const url = new URL("https://discord.com/api/oauth2/authorize");
	url.searchParams.set("client_id", client.user.id);
	url.searchParams.set("redirect_uri", process.env.DISCORD_REDIRECT_URI!);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("state", state);
	url.searchParams.set("scope", "role_connections.write identify");
	url.searchParams.set("prompt", "consent");
	return { state, url: url.toString() };
}

/**
 * Given an OAuth2 code from the scope approval page, make a request to Discord's
 * OAuth2 service to retreive an access token, refresh token, and expiration.
 */
export async function getOAuthTokens(code: any) {
	const url = "https://discord.com/api/v10/oauth2/token";

	const form = new URLSearchParams(
		Object.entries({
			client_id: client.user.id,
			client_secret: process.env.CLIENT_SECRET!,
			grant_type: "authorization_code",
			code: code,
			redirect_uri: process.env.DISCORD_REDIRECT_URI!,
		})
	);

	const response = await fetch(url, {
		body: form,
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});
	if (response.ok) {
		const data = await response.json();
		return data;
	} else {
		throw new Error(`[Error code: 1650] Error fetching OAuth tokens: [${response.status}] ${response.statusText}`);
	}
}

/**
 * The initial token request comes with both an access token and a refresh
 * token.  Check if the access token has expired, and if it has, use the
 * refresh token to acquire a new, fresh access token.
 */
export async function getAccessToken(userId: any, tokens: any) {
	if (Date.now() > tokens.expires_at) {
		const url = "https://discord.com/api/v10/oauth2/token";
		const body = new URLSearchParams({
			client_id: client.user.id,
			client_secret: process.env.CLIENT_SECRET!,
			grant_type: "refresh_token",
			refresh_token: tokens.refresh_token,
		});
		const response = await fetch(url, {
			body,
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});
		if (response.ok) {
			const tokens = (await response.json()) as any;
			tokens.access_token = tokens.access_token;
			tokens.expires_at = Date.now() + tokens.expires_in * 1000;
			await storage.storeDiscordTokens(userId, tokens);
			return tokens.access_token;
		} else {
			throw new Error(`Error refreshing access token: [${response.status}] ${response.statusText}`);
		}
	}
	return tokens.access_token;
}

/**
 * Given a user based access token, fetch profile information for the current user.
 */
export async function getUserData(tokens: any) {
	const url = "https://discord.com/api/v10/oauth2/@me";
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${tokens.access_token}`,
		},
	});
	if (response.ok) {
		const data = await response.json();
		return data;
	} else {
		throw new Error(`Error fetching user data: [${response.status}] ${response.statusText}`);
	}
}

/**
 * Given metadata that matches the schema, push that data to Discord on behalf
 * of the current user.
 */
export async function pushMetadata(userId: any, tokens: any, metadata: any) {
	// GET/PUT /users/@me/applications/:id/role-connection
	const url = `https://discord.com/api/v10/users/@me/applications/${client.user.id}/role-connection`;
	const accessToken = await getAccessToken(userId, tokens);
	const body = {
		platform_name: `${client.user.username} linked roles`,
		metadata,
	};
	const response = await fetch(url, {
		method: "PUT",
		body: JSON.stringify(body),
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
	});
	if (!response.ok) {
		throw new Error(`Error pushing discord metadata: [${response.status}] ${response.statusText}`);
	}
}

/**
 * Fetch the metadata currently pushed to Discord for the currently logged
 * in user, for this specific bot.
 */
// export async function getMetadata(userId: any, tokens: any) {
// GET/PUT /users/@me/applications/:id/role-connection
// 	const url = `https://discord.com/api/v10/users/@me/applications/${client.user.id}/role-connection`;
// 	const accessToken = await getAccessToken(userId, tokens);
// 	const response = await fetch(url, {
// 		headers: {
// 			Authorization: `Bearer ${accessToken}`,
// 		},
// 	});
// 	if (response.ok) {
// 		const data = await response.json();
// 		return data;
// 	} else {
// 		throw new Error(`Error getting discord metadata: [${response.status}] ${response.statusText}`);
// 	}
// }

/**
 * Given a Discord UserId, push static make-believe data to the Discord
 * metadata endpoint.
 */
export async function updateMetadata(userId: any) {
	// Fetch the Discord tokens from storage
	const tokens = await storage.getDiscordTokens(userId);

	let metadata = {};
	try {
		// Fetch the new metadata you want to use from an external source.
		// This data could be POST-ed to this endpoint, but every service
		// is going to be different.  To keep the example simple, we'll
		// just generate some random data.
		metadata = {
			accountlinked: true,
		};
	} catch (e: any) {
		e.message = `Error fetching external data: ${e.message}`;
		console.error("[Error code: 1917]", e);
		// If fetching the profile data for the external service fails for any reason,
		// ensure metadata on the Discord side is nulled out. This prevents cases
		// where the user revokes an external app permissions, and is left with
		// stale linked role data.
	}

	// Push the data to Discord.
	await pushMetadata(userId, tokens, metadata);
}
