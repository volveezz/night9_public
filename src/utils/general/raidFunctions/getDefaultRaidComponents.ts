import { ActionRow, ButtonBuilder, ButtonComponent, ButtonStyle, MessageActionRowComponent } from "discord.js";
import { RaidButtons } from "../../../configs/Buttons.js";

export default function getDefaultRaidComponents(components?: ActionRow<MessageActionRowComponent>) {
	const unlockButtonState =
		(components?.components.find((c) => c.customId === RaidButtons.unlock)?.data as any as ButtonComponent)?.style ===
		ButtonStyle.Success;

	const unlockButtonLabel = unlockButtonState ? "Открыть набор" : "Закрыть набор";

	return [
		new ButtonBuilder().setCustomId(RaidButtons.notify).setLabel("Оповестить участников").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(RaidButtons.transfer).setLabel("Переместить участников в рейд-войс").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId(RaidButtons.unlock)
			.setLabel(unlockButtonLabel)
			.setStyle(unlockButtonState ? ButtonStyle.Success : ButtonStyle.Danger),
		new ButtonBuilder().setCustomId(RaidButtons.delete).setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
		new ButtonBuilder().setCustomId(RaidButtons.resend).setLabel("Обновить сообщение").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(RaidButtons.notificationsStart).setLabel("Настроить свои оповещения").setStyle(ButtonStyle.Primary),
	];
}
