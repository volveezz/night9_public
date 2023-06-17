import { Op } from "sequelize";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import { destinyActivityChecker } from "../utils/general/destinyActivityChecker.js";
import { timer } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelize.js";
import { longOffline } from "./userStatisticsManagement.js";
async function periodicDestinyActivityChecker() {
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
            return console.error("[Error code: 1006] DB is not avaliable", unfilteredDatabase?.length);
        for (let i = 0; i < databaseData.length; i++) {
            const databaseUser = databaseData[i];
            const member = client.getCachedMembers().get(databaseUser.discordId);
            if (!member) {
                await client.getCachedGuild().fetch();
                return console.error("[Error code: 1007]", databaseUser.displayName);
            }
            const randomValue = Math.floor(Math.random() * 100);
            switch (true) {
                case randomValue < 33:
                    destinyActivityChecker(databaseUser, member, 4, 3);
                    break;
                case randomValue < 66:
                    destinyActivityChecker(databaseUser, member, 82, 3);
                    break;
                default:
                    destinyActivityChecker(databaseUser, member, 2, 3);
                    break;
            }
            await timer(250);
        }
    }, 1000 * 70);
}
export default periodicDestinyActivityChecker;
