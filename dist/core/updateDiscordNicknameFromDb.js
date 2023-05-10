import { statusRoles } from "../configs/roles.js";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { AuthData } from "../utils/persistence/sequelize.js";
setInterval(async () => {
    await updateDiscordNicknameFromDb();
}, 1000 * 60 * 60);
async function updateDiscordNicknameFromDb() {
    if (apiStatus.status !== 1)
        return;
    const dbData = await AuthData.findAll({
        attributes: ["discordId", "displayName", "timezone"],
    });
    const verifiedGuildMembers = client.getCachedMembers().filter((member) => member.roles.cache.has(statusRoles.verified));
    verifiedGuildMembers.forEach((member) => {
        const userDbData = dbData.find((d) => d.discordId === member.id);
        if (!userDbData)
            return;
        const { timezone, displayName: userDbName } = userDbData;
        if (nameCleaner(member.displayName) !== userDbName && !userDbName.startsWith("⁣")) {
            if (!member.permissions.has("Administrator")) {
                member
                    .setNickname(userDbData.timezone != null ? `[+${timezone}] ${userDbName}` : userDbName)
                    .catch((e) => console.error("[Error code: 1030] Name autochange error", e));
            }
        }
    });
}
export default updateDiscordNicknameFromDb;
