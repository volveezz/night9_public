import { ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Button } from "../structures/button.js";
import { addModalComponents } from "../utils/general/addModalComponents.js";
const ButtonCommand = new Button({
    name: "modalRaidReadiness",
    run: async ({ interaction }) => {
        const raidId = interaction.customId.split("_")[2];
        const modal = new ModalBuilder()
            .setTitle("Укажите причину опоздания")
            .setCustomId("submitedRaidReadiness" + `_${raidId}`);
        const lateReason = new TextInputBuilder()
            .setLabel("Причина")
            .setStyle(TextInputStyle.Short)
            .setCustomId("submitedRaidReadiness_lateReason")
            .setPlaceholder("Причина опоздания")
            .setMaxLength(100)
            .setRequired(true);
        interaction.showModal(modal.setComponents(addModalComponents(lateReason)));
    },
});
export default ButtonCommand;
//# sourceMappingURL=modalRaidReadiness.js.map