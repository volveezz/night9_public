import { RaidNames } from "../configs/Raids.js";
import raidGuide from "../configs/raidGuideData.js";
import { Autocomplete } from "../structures/autocomplete.js";
const AutocompleteFile = new Autocomplete({
    name: "specify-raid",
    run: async ({ interaction }) => {
        const isPrivilegedCommand = interaction.channelId === process.env.RAID_GUIDES_CHANNEL_ID || interaction.memberPermissions?.has("Administrator")
            ? true
            : false;
        let avaliableRaidGuides;
        if (isPrivilegedCommand) {
            avaliableRaidGuides = Object.keys(raidGuide).map((raid) => {
                return { name: raid, value: raid };
            });
        }
        else {
            const raidNames = Object.keys(RaidNames);
            avaliableRaidGuides = Object.keys(raidGuide)
                .filter((raidName) => {
                raidNames.includes(raidName);
            })
                .map((raid) => {
                return { name: raid, value: raid };
            });
        }
        await interaction.respond(avaliableRaidGuides);
    },
});
export default AutocompleteFile;
//# sourceMappingURL=raid-guide.js.map