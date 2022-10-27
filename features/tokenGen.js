import { guildId } from "../base/ids.js";
import fetch from "node-fetch";
import { db, auth_data, lost_data } from "../handlers/sequelize.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export default () => {
    if (guildId === "1007814171267707001")
        return;
    async function generator(table) {
        const data = table === 1
            ? await auth_data.findAll({ attributes: ["bungie_id", "refresh_token"] })
            : await lost_data.findAll({ attributes: ["bungie_id", "refresh_token"] });
        const t = await db.transaction();
        for (const row of data) {
            const form = new URLSearchParams();
            form.append("grant_type", "refresh_token");
            form.append("refresh_token", String(row.refresh_token));
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
                console.error(`[Error code: 1024] [tokenGen error] ${row.bungie_id} data was lost`, err.statusCode);
                return false;
            });
            if (request?.access_token) {
                (table === 1 ? auth_data : lost_data)
                    .update({
                    access_token: request.access_token,
                    refresh_token: request.refresh_token,
                }, {
                    where: {
                        bungie_id: row.bungie_id,
                    },
                    transaction: t,
                })
                    .then((query) => {
                    if (!query || query[0] !== 1)
                        console.error(`[Error code: 1031] [tokenGen] DB query error for`, row.bungie_id, request.toString(), query);
                });
            }
            await timer(150);
        }
        try {
            await t.commit();
        }
        catch (error) {
            await t.rollback();
            console.log(`[Error code: 1032]`, error || "[Error code: 1033] [tokenGen] Error occured in transaction");
        }
    }
    generator(1);
    generator(2);
    setInterval(() => generator(1), 1000 * 60 * 50);
};
