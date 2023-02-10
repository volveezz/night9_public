import fetch from "node-fetch";
import { database, AuthData, LeavedUsersData } from "../handlers/sequelize.js";
import { Feature } from "../structures/feature.js";
const BUNGIE_TOKEN_URL = "https://www.bungie.net/Platform/App/OAuth/Token/";
async function bungieGrantRequest(row, table, t, retry = false) {
    const form = new URLSearchParams(Object.entries({
        grant_type: "refresh_token",
        refresh_token: row.refreshToken,
    }));
    const fetchRequest = (await fetch(BUNGIE_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${process.env.AUTH}`,
        },
        body: form,
    }));
    const request = await fetchRequest.json();
    if (request && request.access_token) {
        await (table === 1 ? AuthData : LeavedUsersData).update({ accessToken: request.access_token, refreshToken: request.refresh_token }, { where: { bungieId: row.bungieId }, transaction: t });
    }
    else {
        if (retry === false) {
            bungieGrantRequest(row, table, t, true);
            console.error(`[Error code: 1420] For ${row.bungieId}`, request);
        }
        else
            console.error(`[Error code: 1231] For ${row.bungieId}`, request);
    }
}
async function refreshTokens(table) {
    const data = table === 1
        ? await AuthData.findAll({ attributes: ["bungieId", "refreshToken"] })
        : await LeavedUsersData.findAll({ attributes: ["bungieId", "refreshToken"] });
    const t = await database.transaction();
    for (const row of data) {
        try {
            if (!row.refreshToken)
                return;
            await bungieGrantRequest(row, table, t, false);
        }
        catch (error) {
            console.error(`[Error code: 1242] Error during refreshing token of ${row.bungieId}: ${error}`);
        }
    }
    try {
        await t.commit();
    }
    catch (error) {
        await t.rollback();
        console.error(`[Error code: 1421] Error during commiting DB changes`);
    }
}
export default new Feature({
    execute: async ({}) => {
        if (process.env.DEV_BUILD === "dev")
            return;
        await refreshTokens(1);
        await refreshTokens(2);
        setInterval(async () => await refreshTokens(1), 1000 * 60 * 50);
    },
});
