import { client } from "../../index.js";
async function setMemberRoles({ member, roles, reason }) {
    const roleSetPromise = member.roles.set(roles, reason).catch(async (e) => {
        console.error(`[Error code: 1725] An error occurred while setting roles for ${member.displayName || member.user.username}, but error was handled`);
        const botHighestRole = client.getCachedGuild().roles.botRoleFor(client.user.id)?.position || 0;
        const removableRoles = member.roles.cache.filter((role) => {
            return role.editable && !role.managed && role.position < botHighestRole;
        });
        await member.roles.remove(removableRoles).catch((e) => {
            console.error(`[Error code: 1723] An error occurred while removing roles of ${member.displayName || member.user.username}\n`, e);
        });
        await member.roles.add(roles).catch((e) => {
            console.error(`[Error code: 1722] An error occurred while adding roles to ${member.displayName || member.user.username}\n`, e);
        });
    });
    return await roleSetPromise;
}
export default setMemberRoles;
