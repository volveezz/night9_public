import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import UserErrors from "../../../configs/UserErrors.js";
import colors from "../../../configs/colors.js";
import raidsGuide from "../../../configs/raidGuideData.js";
import { addButtonsToMessage } from "../addButtonsToMessage.js";
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
                    .setStyle(button.style || ButtonStyle.Secondary)
                    .setLabel(button.label || "Кнопка"));
            });
        }
        if (raidName === "test") {
            components.push(new ButtonBuilder()
                .setCustomId(`showEditMenu_${raidName}_${encounterIndex}`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel("[ADMIN] Изменить"), new ButtonBuilder()
                .setCustomId(`addRaidGuideEmbed_${raidName}_${encounterIndex}`)
                .setStyle(ButtonStyle.Success)
                .setLabel("[ADMIN] Добавить сообщение"));
        }
        const messageOptions = {
            embeds: [embed],
            components: addButtonsToMessage(components),
            ephemeral: true,
        };
        if (!interaction.deferred)
            await deferredReply;
        await interaction.followUp(messageOptions);
    }
}
export default sendRaidGuide;
//# sourceMappingURL=sendRaidGuide.js.map