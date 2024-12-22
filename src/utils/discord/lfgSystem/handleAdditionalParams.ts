import { resolveColor } from "discord.js";
import { dlcRoles, seasonalRoles } from "../../../configs/roles.js";
import LfgUserSettings from "../../../interfaces/Lfg.js";
import LfgActivitySettings from "../../../structures/lfg.js";

const dlcRoleMappings: { [key: string]: string } = {
	"--here": "@here",
	"--everyone": "everyone",
	"--f": dlcRoles.forsaken,
	"--frs": dlcRoles.forsaken,
	"--forsaken": dlcRoles.forsaken,
	"--sk": dlcRoles.shadowkeep,
	"--shadowkeep": dlcRoles.shadowkeep,
	"--bl": dlcRoles.beyondLight,
	"--beyondlight": dlcRoles.beyondLight,
	"--anni": dlcRoles.anniversary,
	"--anniversary": dlcRoles.anniversary,
	"--30": dlcRoles.anniversary,
	"--30th": dlcRoles.anniversary,
	"--twq": dlcRoles.theWitchQueen,
	"--thewitchqueen": dlcRoles.theWitchQueen,
	"--witchqueen": dlcRoles.theWitchQueen,
	"--lf": dlcRoles.lightfall,
	"--lightfall": dlcRoles.lightfall,
	"--tfs": dlcRoles.theFinalShape,
	"--thefinalshape": dlcRoles.theFinalShape,
	"--finalshape": dlcRoles.theFinalShape,
	"--season": seasonalRoles.currentSeasonRole,
	"--curseason": seasonalRoles.currentSeasonRole,
	"--currentseason": seasonalRoles.currentSeasonRole,
	"--seasonal": seasonalRoles.currentSeasonRole,
};
const inviteMap: { [key: string]: boolean } = {
	"--noinvite": false,
	"--deleteinvite": false,
	"--no_invite": false,
};

async function handleAdditionalLfgParams(params: string, userSettings: LfgUserSettings, activityName?: string) {
	if (params.length === 0) return;
	const stringArgs = params.trim().match(/--\w+(?:=(?:"[^"]*"|'[^']*'))?/g);

	let difficulty = "нормальный";
	stringArgs?.forEach((arg) => {
		const [key, value = ""] = arg.split("=").map((s) => s.toLowerCase().replace(/\"|\'/g, ""));
		if (key === "--difficulty") difficulty = value;
	});

	stringArgs?.forEach((arg) => {
		const [key, value = ""] = arg.split("=").map((s) => s.toLowerCase().replace(/\"|\'/g, ""));
		if (key in dlcRoleMappings) userSettings.ping = dlcRoleMappings[key];
		if (key in inviteMap) userSettings.invite = inviteMap[key];
		if (key.startsWith("--activity")) userSettings.activitySettings = new LfgActivitySettings(value, difficulty);
		try {
			if (key.startsWith("--color")) userSettings.color = resolveColor(value as any);
		} catch (error) {}
	});

	if (!userSettings.activitySettings && activityName) userSettings.activitySettings = new LfgActivitySettings(activityName, difficulty);

	return userSettings;
}

export default handleAdditionalLfgParams;
