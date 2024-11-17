import findActivityForLfg from "../utils/discord/lfgSystem/findActivityForLfg.js";
class LfgActivitySettings {
    name;
    description;
    image;
    footerIcon;
    lightLevel;
    constructor(activityName, difficulty) {
        const activity = findActivityForLfg(activityName, difficulty) ?? findActivityForLfg(activityName, difficulty, true);
        this.name = activity?.displayProperties?.name || activityName || null;
        this.description = activity?.displayProperties?.description || null;
        this.image = activity?.pgcrImage ? `https://bungie.net${activity.pgcrImage}` : null;
        this.footerIcon = activity?.displayProperties?.icon || null;
        this.lightLevel = activity?.activityLightLevel.toString() || null;
    }
}
export default LfgActivitySettings;
//# sourceMappingURL=lfg.js.map