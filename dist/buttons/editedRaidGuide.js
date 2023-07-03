import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import raidsGuide from "../configs/raidGuideData.js";
export default {
    name: "editedRaidGuide",
    run: async ({ modalSubmit }) => {
        const customId = modalSubmit.fields.fields.at(0).customId.split("_");
        const raidName = customId[1];
        const raidEncounter = parseInt(customId[2]);
        const guideIndex = parseInt(customId[3]);
        const encounterEmbed = parseInt(customId[4]);
        const raidGuide = raidsGuide[raidName];
        const guideEncounter = raidGuide[raidEncounter].buttons[guideIndex].embeds[encounterEmbed];
        modalSubmit.fields.fields.forEach((v) => {
            const field = v.customId.split("_").pop();
            if (field === "name" || field === "description" || field === "image") {
                const currentValue = guideEncounter[field];
                if (currentValue !== v.value) {
                    guideEncounter[field] = v.value;
                }
            }
            console.debug(`Field: ${v.customId} of raidGuide ${raidEncounter} ${guideIndex} ${encounterEmbed}\nValue: [${v.value}]`);
        });
        if (guideEncounter.name == "" && guideEncounter.description == "" && guideEncounter.image == "") {
            raidGuide[raidEncounter].buttons[guideIndex].embeds.splice(encounterEmbed, 1);
        }
        const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Гайд был успешно обновлен", iconURL: icons.success });
        modalSubmit.reply({ embeds: [embed], ephemeral: true });
    },
};
//# sourceMappingURL=editedRaidGuide.js.map