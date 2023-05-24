import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { RaidButtons } from "../configs/Buttons.js";
import { sendNotificationInfo } from "../utils/general/raidFunctions/raidNotifications.js";
import { RaidUserNotification } from "../utils/persistence/sequelize.js";
export default {
    name: "raidNotifications",
    run: async ({ interaction: commandInteraction, modalSubmit: modalInteraction }) => {
        const interaction = commandInteraction ?? modalInteraction;
        switch (interaction.customId) {
            case RaidButtons.notificationsStart:
                await sendNotificationInfo(interaction);
                return;
            case RaidButtons.notificationsShowModal:
                showModal();
                return;
        }
        async function showModal() {
            const modal = new ModalBuilder()
                .setTitle("Настройка своего времени оповещения об рейдах")
                .setCustomId(RaidButtons.notificationsConfirmModal);
            const alreadyDefinedTimeByUser = await RaidUserNotification.findByPk(interaction.user.id);
            const specifiedTime = new TextInputBuilder()
                .setCustomId(RaidButtons.notificationsTime)
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
};
