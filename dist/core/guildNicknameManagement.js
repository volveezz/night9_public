import { statusRoles } from "../configs/roles.js";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import { AuthData } from "../utils/persistence/sequelize.js";
setTimeout(guildNicknameManagement, 1000 * 60);
async function guildNicknameManagement() {
    if (apiStatus.status !== 1)
        return;
    const dbData = await AuthData.findAll({
        attributes: ["discordId", "displayName", "timezone"],
    });
    const verifiedGuildMembers = client.getCachedMembers().filter((member) => member.roles.cache.has(statusRoles.verified));
    verifiedGuildMembers.forEach(async (member) => {
        const userDbData = dbData.find((d) => d.discordId === member.id);
        if (!userDbData)
            return;
        const { timezone, displayName: userDbName } = userDbData;
        if (userDbName.startsWith("⁣") || member.permissions.has("Administrator"))
            return;
        if (member.displayName !== `${timezone != null ? `[+${timezone}]` : ""} ${userDbName}`) {
            await member
                .setNickname(userDbData.timezone != null ? `[+${timezone}] ${userDbName}` : userDbName)
                .catch((e) => console.error("[Error code: 1030] Name autochange error", e));
        }
    });
    setTimeout(guildNicknameManagement, 1000 * 60 * 60);
}
export default guildNicknameManagement;
