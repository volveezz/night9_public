import { Op } from "sequelize";
import { destinyActivityChecker } from "../functions/activitiesChecker.js";
import { timer } from "../functions/utilities.js";
import { AuthData } from "../handlers/sequelize.js";
import { apiStatus } from "../structures/apiStatus.js";
import { Feature } from "../structures/feature.js";
import { longOffline } from "./memberStatisticsHandler.js";
export default new Feature({
    execute: async ({ client }) => {
        if (process.env.DEV_BUILD === "dev")
            return;
        setInterval(async () => {
            if (apiStatus.status !== 1)
                return;
            const unfilteredDatabase = await AuthData.findAll({
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
            const dbNotFoundUsers = unfilteredDatabase
                .filter((data) => !client.getCachedMembers().has(data.discordId))
                .map((d) => {
                return `[Error code: 1008] ${d.displayName}/${d.discordId} not found on server`;
            });
            if (dbNotFoundUsers.length > 0 && process.env.DEV_BUILD !== "dev")
                await client.getCachedGuild().fetch(), console.error("[Error code: 1005]", dbNotFoundUsers);
            const databaseData = unfilteredDatabase.filter((data) => client.getCachedMembers().has(data.discordId));
            if (!databaseData)
                return console.error(`[Error code: 1006] DB is not avaliable`, databaseData);
            for (let i = 0; i < databaseData.length; i++) {
                const randomValue = Math.floor(Math.random() * 100);
                const databaseUser = databaseData[i];
                const member = client.getCachedMembers().get(databaseUser.discordId);
                if (!member) {
                    await client.getCachedGuild().fetch();
                    return console.error("[activityChecker]", "[Error code: 1007]", databaseUser.displayName);
                }
                if (randomValue > 50)
                    destinyActivityChecker(databaseUser, member, 4, 3);
                if (randomValue < 50)
                    destinyActivityChecker(databaseUser, member, 82, 3);
                if (randomValue < 70)
                    destinyActivityChecker(databaseUser, member, 2, 3);
                await timer(250);
            }
        }, 1000 * 70);
    },
});
