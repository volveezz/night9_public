import { allPremiumRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
async function setMemberRoles({ member, roles, reason, savePremiumRoles = true }) {
    const savableRoles = getSaveableRoles();
    const setRoles = [...new Set(roles), ...(savableRoles.length > 0 ? [...savableRoles.values()] : [])];
    const memberDisplayName = member.displayName || member.user.username;
    const roleSetPromise = member.roles.set(setRoles, reason).catch(async (e) => {
        if (e.code !== 50013) {
            console.error("[Error code: 1949]", e);
        }
        const botHighestRole = client.getCachedGuild().roles.botRoleFor(client.user.id)?.position ?? 0;
        const removableRoles = member.roles.cache.filter((role) => {
            return role.editable && !role.managed && role.position < botHighestRole;
        });
        await member.roles.remove(removableRoles).catch((e) => {
            console.error(`[Error code: 1723] An error occurred while removing roles of ${memberDisplayName}\n`, e);
        });
        await member.roles.add(setRoles).catch((e) => {
            console.error(`[Error code: 1722] An error occurred while adding roles to ${memberDisplayName}\n`, e);
        });
        console.error(`[Error code: 1725] An error occurred while setting roles for ${memberDisplayName}, but error was handled`);
    });
    return roleSetPromise;
    function getSaveableRoles() {
        const roles = [];
        if (savePremiumRoles) {
            roles.push(...member.roles.cache
                .filter((r) => allPremiumRoles.includes(r.id))
                .map((r) => r.id)
                .values());
        }
        return roles;
    }
}
export default setMemberRoles;
//# sourceMappingURL=setRoles.js.map