import { EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { TimezoneButtons } from "../configs/Buttons.js";
import { timezoneSelectMenuData } from "../configs/SelectMenuOptions.js";
import colors from "../configs/colors.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";

const ButtonCommand = new Button({
	name: "timezoneButton",
	run: async ({ interaction }) => {
		const embed = new EmbedBuilder()
			.setColor(colors.default)
			.setTitle("Установите свой часовой пояс")
			.setDescription(
				"Если вы не знаете свой часовой пояс, вы можете узнать текущее время для каждого пояса в его описании.\nЧасовой пояс устанавливается относительно времени по Гринвичу, т.е. от +00:00, а не относительно Московского времени!"
			);

		const tzBlank = new StringSelectMenuBuilder()
			.setCustomId(TimezoneButtons.selectMenu)
			.setPlaceholder("Часовой пояс не выбран")
			.addOptions(timezoneSelectMenuData);

		const tzTime = new Date();

		tzTime.setHours(tzTime.getHours() + 1);
		tzBlank.options.forEach((option, i) => {
			option.setDescription(
				`${tzTime.getHours()}:${tzTime.getMinutes()}:${tzTime.getSeconds()} - время сейчас по +${i + 1} часовому поясу`
			);
			tzTime.setHours(tzTime.getHours() + 1);
		});

		interaction.reply({ ephemeral: true, embeds: [embed], components: addButtonsToMessage([tzBlank]) });
	},
});

export default ButtonCommand;
