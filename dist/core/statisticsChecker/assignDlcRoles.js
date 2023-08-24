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
const allDlcRoles = Object.values(dlcRoles);
const rolesExceptVanilla = allDlcRoles.splice(allDlcRoles.indexOf(dlcRoles.vanilla), 1);
async function assignDlcRoles({ addRoles, member, removeRoles, version }) {
    if (!version)
        return;
    if (version > 7 && member.roles.cache.has(dlcRoles.vanilla)) {
        removeRoles.push(dlcRoles.vanilla);
    }
    else if (version <= 7 && !member.roles.cache.has(dlcRoles.vanilla)) {
        addRoles.push(dlcRoles.vanilla);
        removeRoles.push(...rolesExceptVanilla);
    }
    for (const { bit, role } of dlcBitFlags) {
        if (version & bit && !member.roles.cache.has(role)) {
            addRoles.push(role);
        }
    }
}
export default assignDlcRoles;
//# sourceMappingURL=assignDlcRoles.js.map