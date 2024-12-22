import { EmbedBuilder, SelectMenuComponentOptionData, StringSelectMenuBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import raidsGuide from "../configs/raidGuideData.js";
import { EncounterGuideInfo } from "../interfaces/RaidData.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";

const ButtonCommand = new Button({
	name: "showEditMenu",
	run: async ({ interaction }) => {
		const raidName = interaction.customId.split("_")[1]!;
		const encounterIndex = parseInt(interaction.customId.split("_").pop()!)!;
		const raidGuide = raidsGuide[raidName as keyof typeof raidsGuide] as EncounterGuideInfo[];

		const selectMenus: SelectMenuComponentOptionData[] = [];

		raidGuide[encounterIndex].buttons?.forEach((button, iButton) => {
			button.embeds?.forEach((embedData, iEmbed) => {
				selectMenus.push({
					label: (embedData.name || "blank name").slice(0, 24),
					description: embedData.description ? embedData.description.slice(0, 99) : undefined,
					value: `${raidName}_${encounterIndex}_${iButton}_${iEmbed}`,
				});
			});
		});

		if (selectMenus.length === 0) {
			const embed = new EmbedBuilder()
				.setColor(colors.error)
				.setAuthor({ name: "Ошибка. В этой части гайда нет embed-сообщений", iconURL: icons.error });
			interaction.reply({ embeds: [embed], ephemeral: true });
			return;
		}

		const blankOptions = new StringSelectMenuBuilder()
			.setCustomId(`editRaidGuide`)
			.setPlaceholder("Выберите сообщение рейда для изменения")
			.addOptions(selectMenus);

		const embed = new EmbedBuilder().setColor(colors.default).setTitle("Выберите сообщение");

		interaction.reply({
			embeds: [embed],
			components: addButtonsToMessage([blankOptions]),
			ephemeral: true,
		});
	},
});

export default ButtonCommand;
