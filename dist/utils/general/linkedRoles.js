import crypto from "crypto";
import fetch from "node-fetch";
import { client } from "../../index.js";
import * as storage from "../persistence/webStorage.js";
export function getOAuthUrl() {
    const state = crypto.randomUUID();
    const url = new URL("https://discord.com/api/oauth2/authorize");
    url.searchParams.set("client_id", client.user.id);
    url.searchParams.set("redirect_uri", process.env.DISCORD_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "role_connections.write identify");
    url.searchParams.set("prompt", "consent");
    return { state, url: url.toString() };
}
export async function getOAuthTokens(code) {
    const url = "https://discord.com/api/v10/oauth2/token";
    const form = new URLSearchParams(Object.entries({
        client_id: client.user.id,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }));
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
    }
    else {
        throw new Error(`[Error code: 1650] Error fetching OAuth tokens: [${response.status}] ${response.statusText}`);
    }
}
export async function getAccessToken(userId, tokens) {
    if (Date.now() > tokens.expires_at) {
        const url = "https://discord.com/api/v10/oauth2/token";
        const body = new URLSearchParams({
            client_id: client.user.id,
            client_secret: process.env.CLIENT_SECRET,
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
            const tokens = (await response.json());
            tokens.access_token = tokens.access_token;
            tokens.expires_at = Date.now() + tokens.expires_in * 1000;
            await storage.storeDiscordTokens(userId, tokens);
            return tokens.access_token;
        }
        else {
            throw new Error(`Error refreshing access token: [${response.status}] ${response.statusText}`);
        }
    }
    return tokens.access_token;
}
export async function getUserData(tokens) {
    const url = "https://discord.com/api/v10/oauth2/@me";
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
        },
    });
    if (response.ok) {
        const data = await response.json();
        return data;
    }
    else {
        throw new Error(`Error fetching user data: [${response.status}] ${response.statusText}`);
    }
}
export async function pushMetadata(userId, tokens, metadata) {
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
export async function updateMetadata(userId) {
    const tokens = await storage.getDiscordTokens(userId);
    let metadata = {};
    try {
        metadata = {
            accountlinked: true,
        };
    }
    catch (e) {
        e.message = `Error fetching external data: ${e.message}`;
        console.error("[Error code: 1917]", e);
    }
    await pushMetadata(userId, tokens, metadata);
}
//# sourceMappingURL=linkedRoles.js.map