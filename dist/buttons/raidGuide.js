import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import raidsGuide from "../configs/raidguide.json" assert { type: "json" };
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
export default {
    name: "raidGuide",
    run: async ({ interaction }) => {
        const deferredReply = interaction.deferUpdate();
        const interactionParts = interaction.customId.split("_");
        const raidName = interactionParts[1];
        if (!(raidName in raidsGuide)) {
            throw { errorType: UserErrors.RAID_GUIDE_NOT_FOUND };
        }
        const raidGuide = raidsGuide[raidName];
        if (!raidGuide) {
            console.error(`[Error code: 1641] ${interaction.user.username} used ${interaction.customId} and not found raidGuide data for it`);
            throw { errorType: UserErrors.RAID_GUIDE_NOT_FOUND };
        }
        if (interactionParts.length === 2) {
            return raidGuide.forEach(async (encounter, encounterIndex) => {
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
                return ((await deferredReply) &&
                    interaction.followUp({ embeds: [embed], components: await addButtonComponentsToMessage(components), ephemeral: true }));
            });
        }
        const encounterIndex = parseInt(interactionParts[2]);
        const buttonIndex = parseInt(interactionParts[3]);
        const buttonData = raidGuide[encounterIndex]?.buttons?.[buttonIndex];
        if (buttonData) {
            const embed = new EmbedBuilder()
                .setColor(colors.invisible)
                .setTitle(buttonData.name || null)
                .setImage(buttonData.image || null)
                .setDescription(buttonData.description || null);
            (await deferredReply) && buttonData.name ? interaction.followUp({ embeds: [embed], ephemeral: true }) : undefined;
            if (buttonData.embeds) {
                interaction.followUp({
                    ephemeral: true,
                    embeds: buttonData.embeds.map((data) => {
                        return new EmbedBuilder()
                            .setColor(colors.invisible)
                            .setTitle(data.name || null)
                            .setDescription(data.description || null)
                            .setImage(data.image || null);
                    }),
                });
            }
        }
    },
};
