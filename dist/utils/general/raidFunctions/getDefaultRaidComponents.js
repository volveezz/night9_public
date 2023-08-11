import { ButtonBuilder, ButtonStyle } from "discord.js";
export default function getDefaultRaidComponents() {
    return [
        new ButtonBuilder().setCustomId("raidInChnButton_notify").setLabel("Оповестить участников").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("raidInChnButton_transfer").setLabel("Переместить участников в рейд-войс").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("raidInChnButton_unlock").setLabel("Закрыть набор").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("raidInChnButton_delete").setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("raidInChnButton_resend").setLabel("Обновить сообщение").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("raidNotifications_start").setLabel("Настроить свои оповещения").setStyle(ButtonStyle.Primary),
    ];
}
//# sourceMappingURL=getDefaultRaidComponents.js.map