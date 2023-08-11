import { resolveColor } from "discord.js";
import { dlcRoles, seasonalRoles } from "../../../configs/roles.js";
import LfgActivitySettings from "../../../structures/lfg.js";
const dlcRoleMappings = {
    "--here": "@here",
    "--everyone": "everyone",
    "--f": dlcRoles.frs,
    "--frs": dlcRoles.frs,
    "--forsaken": dlcRoles.frs,
    "--sk": dlcRoles.sk,
    "--shadowkeep": dlcRoles.sk,
    "--bl": dlcRoles.bl,
    "--beyondlight": dlcRoles.bl,
    "--anni": dlcRoles.anni,
    "--anniversary": dlcRoles.anni,
    "--30": dlcRoles.anni,
    "--30th": dlcRoles.anni,
    "--twq": dlcRoles.twq,
    "--thewitchqueen": dlcRoles.twq,
    "--witchqueen": dlcRoles.twq,
    "--lf": dlcRoles.lf,
    "--lightfall": dlcRoles.lf,
    "--season": seasonalRoles.curSeasonRole,
    "--curseason": seasonalRoles.curSeasonRole,
    "--currentseason": seasonalRoles.curSeasonRole,
    "--seasonal": seasonalRoles.curSeasonRole,
};
const inviteMap = {
    "--noinvite": false,
    "--deleteinvite": false,
    "--no_invite": false,
};
async function handleAdditionalLfgParams(params, userSettings, activityName) {
    if (params.length === 0)
        return;
    const stringArgs = params.trim().match(/--\w+(?:=(?:"[^"]*"|'[^']*'))?/g);
    let difficulty = "нормальный";
    stringArgs?.forEach((arg) => {
        const [key, value = ""] = arg.split("=").map((s) => s.toLowerCase().replace(/\"|\'/g, ""));
        if (key === "--difficulty")
            difficulty = value;
    });
    stringArgs?.forEach((arg) => {
        const [key, value = ""] = arg.split("=").map((s) => s.toLowerCase().replace(/\"|\'/g, ""));
        if (key in dlcRoleMappings)
            userSettings.ping = dlcRoleMappings[key];
        if (key in inviteMap)
            userSettings.invite = inviteMap[key];
        if (key.startsWith("--activity"))
            userSettings.activitySettings = new LfgActivitySettings(value, difficulty);
        try {
            if (key.startsWith("--color"))
                userSettings.color = resolveColor(value);
        }
        catch (error) { }
    });
    if (!userSettings.activitySettings && activityName)
        userSettings.activitySettings = new LfgActivitySettings(activityName, difficulty);
    return userSettings;
}
export default handleAdditionalLfgParams;
//# sourceMappingURL=handleAdditionalParams.js.map