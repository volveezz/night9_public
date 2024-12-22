import { EmbedBuilder } from "discord.js";
import { RaidReadinessButtons } from "../configs/Buttons.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import readinessInstance from "../structures/RaidReadinessSystem.js";
import { Button } from "../structures/button.js";

const ButtonCommand = new Button({
	name: "submitedRaidReadiness",
	run: async ({ modalSubmit }) => {
		const raidId = parseInt(modalSubmit.customId.split("_")[1], 10);

		const reason = modalSubmit.fields.getTextInputValue(RaidReadinessButtons.LateReason);

		if (!reason || reason === "-" || reason === " ") {
			readinessInstance.raidDetailsMap.get(raidId)?.lateReasons.delete(modalSubmit.user.id);
			const DELETE_EMBED = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Причина удалена", iconURL: icons.success });
			modalSubmit.reply({ embeds: [DELETE_EMBED], ephemeral: true });
			return;
		}

		const raidReadinessData = await readinessInstance.setUserReadinessLateReason({
			discordId: modalSubmit.user.id,
			raidId,
			reason,
		});

		if (raidReadinessData) {
			const SUCCESS_EMBED = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Причина указана", iconURL: icons.success });
			modalSubmit.reply({ embeds: [SUCCESS_EMBED], ephemeral: true });
		} else {
			const FAILED_EMBED = new EmbedBuilder()
				.setColor(colors.error)
				.setAuthor({ name: "Ошибка. Причина не указана", iconURL: icons.error });
			modalSubmit.reply({ embeds: [FAILED_EMBED], ephemeral: true });
		}
	},
});

export default ButtonCommand;
