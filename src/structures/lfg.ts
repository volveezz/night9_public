import findActivityForLfg from "../utils/discord/lfgSystem/findActivityForLfg.js";

class LfgActivitySettings {
	name: string | null;
	description: string | null;
	image: string | null;
	footerIcon: string | null;
	lightLevel: string | null;

	constructor(activityName: string, difficulty: string | null) {
		const activity = findActivityForLfg(activityName, difficulty) ?? findActivityForLfg(activityName, difficulty, true);

		this.name = activity?.displayProperties?.name || activityName || null;
		this.description = activity?.displayProperties?.description || null;
		this.image = activity?.pgcrImage ? `https://bungie.net${activity.pgcrImage}` : null;
		this.footerIcon = activity?.displayProperties?.icon || null;
		this.lightLevel = activity?.activityLightLevel.toString() || null;
	}
}

export default LfgActivitySettings;
