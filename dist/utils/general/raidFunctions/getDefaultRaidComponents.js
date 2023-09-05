import { ButtonBuilder, ButtonStyle } from "discord.js";
export default function getDefaultRaidComponents(components) {
    const unlockButtonState = components?.components.find((c) => c.customId === "raidInChnButton_unlock")?.data?.style ===
        ButtonStyle.Success;
    const unlockButtonLabel = unlockButtonState ? "Открыть набор" : "Закрыть набор";
    return [
        new ButtonBuilder().setCustomId("raidInChnButton_notify").setLabel("Оповестить участников").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("raidInChnButton_transfer").setLabel("Переместить участников в рейд-войс").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("raidInChnButton_unlock")
            .setLabel(unlockButtonLabel)
            .setStyle(unlockButtonState ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("raidInChnButton_delete").setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("raidInChnButton_resend").setLabel("Обновить сообщение").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("raidNotifications_start").setLabel("Настроить свои оповещения").setStyle(ButtonStyle.Primary),
    ];
}
//# sourceMappingURL=getDefaultRaidComponents.js.map