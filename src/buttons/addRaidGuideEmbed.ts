import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import raidsGuide from "../configs/raidGuideData.js";
import { EncounterGuideInfo } from "../interfaces/RaidData.js";
import { Button } from "../structures/button.js";

const ButtonCommand = new Button({
	name: "addRaidGuideEmbed",
	run: async ({ interaction }) => {
		const customIdData = interaction.customId.split("_");

		const raidName = customIdData[1];
		const encounterIndex = parseInt(customIdData[2]);

		const raidGuide = raidsGuide[raidName as keyof typeof raidsGuide] as EncounterGuideInfo[];
		const raidGuideEncounter = raidGuide[encounterIndex].buttons?.[0];

		if (!raidGuideEncounter || (raidGuideEncounter.embeds && raidGuideEncounter.embeds.length >= 10)) {
			const embed = new EmbedBuilder()
				.setColor(colors.error)
				.setAuthor({ name: "Ошибка. Невозможно добавить новый гайд", iconURL: icons.error });
			interaction.reply({ embeds: [embed], ephemeral: true });
			return;
		}

		// Add a new blank embed
		if (!raidGuideEncounter.embeds) {
			raidGuideEncounter.embeds = [];
		}
		raidGuideEncounter.embeds.push({
			name: "Временный заголовок",
			description: "Временное описание",
		});

		// console.debug("A new blank guide message was added");

		const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Новое сообщение добавлено", iconURL: icons.success });
		interaction.reply({ embeds: [embed], ephemeral: true });
	},
});

export default ButtonCommand;
