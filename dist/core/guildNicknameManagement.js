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
        const usernameWithTimezone = `${timezone != null ? `[+${timezone}] ` : ""}${userDbName}`;
        if (member.displayName === usernameWithTimezone)
            return;
        await member.setNickname(usernameWithTimezone).catch((e) => console.error("[Error code: 1030]", e));
    });
    setTimeout(guildNicknameManagement, 1000 * 60 * 60);
}
export default guildNicknameManagement;
