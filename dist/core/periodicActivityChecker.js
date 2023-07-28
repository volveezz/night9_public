import { Op } from "sequelize";
import { client } from "../index.js";
import { getEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { destinyActivityChecker } from "../utils/general/destinyActivityChecker.js";
import { pause } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelize.js";
import { clanOnline } from "./userStatisticsManagement.js";
async function checkClanActivitiesPeriodically() {
    if (process.env.NODE_ENV === "development")
        return;
    setInterval(async () => {
        if (getEndpointStatus("activity") !== 1)
            return;
        const onlineClanMembers = await AuthData.findAll({
            where: {
                discordId: {
                    [Op.in]: Array.from(clanOnline.keys()),
                },
            },
            attributes: ["discordId", "bungieId", "displayName", "platform", "accessToken"],
        });
        const missingUsers = onlineClanMembers
            .filter((memberData) => !client.getCachedMembers().has(memberData.discordId))
            .map((missingMember) => {
            return `[Error code: 1008] ${missingMember.displayName}/${missingMember.discordId} not found on server`;
        });
        if (missingUsers.length > 0) {
            await client.getCachedGuild().fetch();
            console.error("[Error code: 1005]", missingUsers);
        }
        for (const memberData of onlineClanMembers) {
            const member = client.getCachedMembers().get(memberData.discordId);
            if (!member) {
                await client.getCachedGuild().fetch();
                console.error("[Error code: 1007]", memberData.displayName);
                continue;
            }
            const activityCheckValue = Math.floor(Math.random() * 100);
            switch (true) {
                case activityCheckValue < 40:
                    destinyActivityChecker({ authData: memberData, mode: 4, count: 3 });
                    break;
                case activityCheckValue < 80:
                    destinyActivityChecker({ authData: memberData, mode: 82, count: 3 });
                    break;
                default:
                    destinyActivityChecker({ authData: memberData, mode: 2, count: 3 });
                    break;
            }
            await pause(250);
        }
    }, 1000 * 66);
}
export default checkClanActivitiesPeriodically;
//# sourceMappingURL=periodicActivityChecker.js.map