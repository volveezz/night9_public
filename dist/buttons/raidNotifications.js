import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Button } from "../structures/button.js";
import { sendNotificationInfo } from "../utils/general/raidFunctions/raidNotifications.js";
import { RaidUserNotification } from "../utils/persistence/sequelize.js";
const ButtonCommand = new Button({
    name: "raidNotifications",
    run: async ({ interaction: commandInteraction, modalSubmit: modalInteraction }) => {
        const interaction = commandInteraction ?? modalInteraction;
        switch (interaction.customId) {
            case "raidNotifications_start":
                await sendNotificationInfo(interaction);
                return;
            case "raidNotifications_showModal":
                showModal();
                return;
        }
        async function showModal() {
            const modal = new ModalBuilder()
                .setTitle("Настройка своего времени оповещения об рейдах")
                .setCustomId("changeCustomRaidNotifications");
            const alreadyDefinedTimeByUser = await RaidUserNotification.findByPk(interaction.user.id);
            const specifiedTime = new TextInputBuilder()
                .setCustomId("raidNotifications_modal_time")
                .setLabel("Укажите время перед оповещением")
                .setPlaceholder("5 | 10 | 15 | 60")
                .setStyle(TextInputStyle.Paragraph);
            if (alreadyDefinedTimeByUser) {
                specifiedTime.setValue(alreadyDefinedTimeByUser.notificationTimes.join(" | "));
            }
            modal.setComponents(new ActionRowBuilder().addComponents(specifiedTime));
            return await interaction.showModal(modal);
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=raidNotifications.js.map