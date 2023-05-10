import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import UserErrors from "../../../configs/UserErrors.js";
import colors from "../../../configs/colors.js";
import raidsGuide from "../../../configs/raidguide.js";
import { addButtonComponentsToMessage } from "../addButtonsToMessage.js";
async function sendRaidGuide(interaction, raidName, deferredReply) {
    const raidGuide = raidsGuide[raidName];
    if (!raidGuide) {
        throw { errorType: UserErrors.RAID_GUIDE_NOT_FOUND };
    }
    for (const [encounterIndex, encounter] of raidGuide.entries()) {
        const embed = new EmbedBuilder()
            .setTitle(encounter.name)
            .setColor(colors.invisible)
            .setDescription(encounter.description || null)
            .setImage(encounter.image || null);
        const components = [];
        if (encounter.buttons) {
            encounter.buttons.forEach((button, buttonIndex) => {
                components.push(new ButtonBuilder()
                    .setCustomId(`raidGuide_${raidName}_${encounterIndex}_${buttonIndex}`)
                    .setStyle(ButtonStyle[button.style || "Secondary"] || ButtonStyle.Secondary)
                    .setLabel(button.label || "Кнопка"));
            });
        }
        const messageOptions = {
            embeds: [embed],
            components: await addButtonComponentsToMessage(components),
            ephemeral: true,
        };
        if (!interaction.deferred)
            await deferredReply;
        await interaction.followUp(messageOptions);
    }
}
export default sendRaidGuide;
