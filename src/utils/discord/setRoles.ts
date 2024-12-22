import { GuildMember } from "discord.js";
import { allPremiumRoles } from "../../configs/roles.js";
import { client } from "../../index.js";

interface RoleSetPromise {
	member: GuildMember;
	roles: string[];
	reason?: string;
	savePremiumRoles?: boolean;
}

async function setMemberRoles({ member, roles, reason, savePremiumRoles = true }: RoleSetPromise) {
	const savableRoles = getSaveableRoles();

	const setRoles = [...new Set(roles), ...(savableRoles.length > 0 ? [...savableRoles.values()] : [])];
	const memberDisplayName = member.displayName || member.user.username;

	const roleSetPromise = member.roles.set(setRoles, reason).catch(async (e) => {
		if (e.code !== 50013) {
			console.error("[Error code: 1949]", e);
		}

		// Get the bot's highest role position
		const botHighestRole = client.getCachedGuild().roles.botRoleFor(client.user.id)?.position ?? 0;

		// Get all removable roles
		const removableRoles = member.roles.cache.filter((role) => {
			return role.editable && !role.managed && role.position < botHighestRole;
		});

		// Remove all removable roles
		await member.roles.remove(removableRoles).catch((e) => {
			console.error(`[Error code: 1723] An error occurred while removing roles of ${memberDisplayName}\n`, e);
		});

		await member.roles.add(setRoles).catch((e) => {
			console.error(`[Error code: 1722] An error occurred while adding roles to ${memberDisplayName}\n`, e);
		});

		console.error(`[Error code: 1725] An error occurred while setting roles for ${memberDisplayName}, but error was handled`);
	});

	return roleSetPromise;

	function getSaveableRoles(): string[] {
		const roles: string[] = [];

		if (savePremiumRoles) {
			roles.push(
				...member.roles.cache
					.filter((r) => allPremiumRoles.includes(r.id))
					.map((r) => r.id)
					.values()
			);
		}

		return roles;
	}
}

export default setMemberRoles;
