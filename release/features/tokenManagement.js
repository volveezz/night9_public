import fetch from "node-fetch";
import { database, AuthData, LeavedUsersData } from "../handlers/sequelize.js";
import { Feature } from "../structures/feature.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
async function refreshTokens(table) {
    const data = table === 1
        ? await AuthData.findAll({ attributes: ["bungieId", "refreshToken"] })
        : await LeavedUsersData.findAll({ attributes: ["bungieId", "refreshToken"] });
    const t = await database.transaction();
    for await (const row of data) {
        try {
            if (!row.refreshToken)
                return;
            const form = new URLSearchParams();
            form.append("grant_type", "refresh_token");
            form.append("refresh_token", row.refreshToken);
            const fetchRequest = fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${process.env.AUTH}`,
                },
                body: form,
            });
            const request = await (await fetchRequest).json();
            fetchRequest.catch((err) => {
                console.error(`[Error code: 1024] [tokenGen error] ${row.bungieId} data was lost ${err.statusCode}`);
                return null;
            });
            if (request && request?.access_token) {
                (table === 1 ? AuthData : LeavedUsersData)
                    .update({
                    accessToken: request.access_token,
                    refreshToken: request.refresh_token,
                }, {
                    where: {
                        bungieId: row.bungieId,
                    },
                    transaction: t,
                })
                    .then((query) => {
                    if (!query || query[0] !== 1)
                        console.error(`[Error code: 1031] [tokenGen] DB query error for ${row.bungieId}`, request, query);
                });
            }
            else {
                console.error(`[Error code: 1231] For ${row.bungieId}`, { request });
            }
            await timer(150);
        }
        catch (error) {
            console.error(`[Error code: 1242] Error during refreshing token of ${row.bungieId}`);
        }
    }
    try {
        await t.commit();
    }
    catch (error) {
        await t.rollback();
        console.error(`[Error code: 1032] ${error}`);
    }
}
export default new Feature({
    execute: async ({}) => {
        refreshTokens(1);
        refreshTokens(2);
        setInterval(() => refreshTokens(1), 1000 * 60 * 50);
    },
});
