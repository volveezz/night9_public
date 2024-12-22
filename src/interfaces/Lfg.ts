import { ColorResolvable } from "discord.js";
import colors from "../configs/colors.js";
import LfgActivitySettings from "../structures/lfg.js";

class LfgUserSettings {
	invite: boolean = true;
	ping: string | null = null;
	activity: string | null = null;
	color: ColorResolvable = colors.serious;
	activitySettings: LfgActivitySettings | null = null;
}

export default LfgUserSettings;
