import { AuthData } from "../handlers/sequelize.js";
import { Op } from "sequelize";
import { longOffline } from "./memberStatisticsHandler.js";
import { Feature } from "../structures/feature.js";
import { apiStatus } from "../structures/apiStatus.js";
import { destinyActivityChecker } from "../functions/activitiesChecker.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export default new Feature({
    execute: async ({ client }) => {
        setInterval(async () => {
            if (apiStatus.status !== 1)
                return;
            const dbNotFiltred = await AuthData.findAll({
                where: {
                    [Op.and]: {
                        discordId: {
                            [Op.notIn]: Array.from(longOffline.keys()),
                        },
                        clan: true,
                    },
                },
                attributes: ["discordId", "bungieId", "displayName", "platform", "accessToken"],
            });
            const dbNotFoundUsers = dbNotFiltred
                .filter((data) => !client.getCachedMembers().has(data.discordId))
                .map((d) => {
                return `[Error code: 1008] ${d.displayName}/${d.discordId} not found on server`;
            });
            dbNotFoundUsers.length > 0 ? (await client.getCachedGuild().fetch(), console.error("[Error code: 1005]", dbNotFoundUsers)) : [];
            const db_plain = dbNotFiltred.filter((data) => client.getCachedMembers().has(data.discordId));
            if (!db_plain)
                return console.error(`[Error code: 1006] DB is not avaliable`, db_plain);
            for (let i = 0; i < db_plain.length; i++) {
                const randomValue = Math.floor(Math.random() * 100);
                const db_row = db_plain[i];
                const member = client.getCachedMembers().get(db_row.discordId);
                if (!member) {
                    await client.getCachedGuild().fetch();
                    return console.error("[activityChecker]", "[Error code: 1007]", db_row.displayName);
                }
                if (randomValue > 50)
                    destinyActivityChecker(db_row, member, 4, 3);
                if (randomValue < 50)
                    destinyActivityChecker(db_row, member, 82, 3);
                await timer(250);
            }
        }, 1000 * 70);
    },
});
