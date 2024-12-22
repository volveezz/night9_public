import { GuildMember } from "discord.js";
import { dlcRoles } from "../../configs/roles.js";

const dlcBitFlags = [
	{ bit: 8, role: dlcRoles.forsaken },
	{ bit: 32, role: dlcRoles.shadowkeep },
	{ bit: 64, role: dlcRoles.beyondLight },
	{ bit: 128, role: dlcRoles.anniversary },
	{ bit: 256, role: dlcRoles.theWitchQueen },
	{ bit: 512, role: dlcRoles.lightfall },
	{ bit: 1024, role: dlcRoles.theFinalShape },
];

interface DlcRoleAssignmentParams {
	member: GuildMember;
	addRoles: string[];
	removeRoles: string[];
	versionsOwned: number;
}

const allDlcRoles = Object.values(dlcRoles);
const rolesExceptVanilla = [...allDlcRoles]; // Create a copy of the array
rolesExceptVanilla.splice(rolesExceptVanilla.indexOf(dlcRoles.vanilla), 1);

// Now roles contains all the role IDs except dlcRoles.vanilla

async function assignDlcRoles({ addRoles, member, removeRoles, versionsOwned }: DlcRoleAssignmentParams): Promise<void> {
	if (!versionsOwned) return;

	if (versionsOwned > 7 && member.roles.cache.has(dlcRoles.vanilla)) {
		removeRoles.push(dlcRoles.vanilla);
	} else if (versionsOwned <= 7 && !member.roles.cache.has(dlcRoles.vanilla)) {
		addRoles.push(dlcRoles.vanilla);
		removeRoles.push(...rolesExceptVanilla);
	}

	for (const { bit, role } of dlcBitFlags) {
		if (versionsOwned & bit && !member.roles.cache.has(role)) {
			addRoles.push(role);
		}
	}
}

export default assignDlcRoles;
