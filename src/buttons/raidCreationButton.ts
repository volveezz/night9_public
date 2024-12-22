import { TextInputBuilder } from "@discordjs/builders";
import { ModalBuilder, TextInputStyle } from "discord.js";
import { RaidCreation } from "../configs/Modals.js";
import { Button } from "../structures/button.js";
import { addModalComponents } from "../utils/general/addModalComponents.js";
import { userTimezones } from "../utils/persistence/dataStore.js";

const ButtonCommand = new Button({
	name: "raidCreationButton",
	run: async ({ interaction }) => {
		const raidModal = new ModalBuilder().setCustomId(RaidCreation.Submit).setTitle("Создание рейда");

		const raidNameFieldValues = [
			"Источник кошмаров: мастер",
			"Клятва послушника",
			"Последнее желание",
			"LAST WISH",
			"ик",
			"Чертог на мастере",
			"СС нормал",
			"vault of glass",
			"vog master",
		];
		const raidNameFieldPlaceholder = raidNameFieldValues[Math.floor(Math.random() * raidNameFieldValues.length)];

		const raidNameField = new TextInputBuilder()
			.setCustomId(RaidCreation.RaidNameField)
			.setLabel("Название и сложность рейда")
			.setMinLength(2)
			.setPlaceholder(raidNameFieldPlaceholder)
			.setRequired(true)
			.setStyle(TextInputStyle.Short);

		const currentTime = new Date(Date.now() + (userTimezones.get(interaction.user.id) ?? 3) * 60 * 60 * 1000);

		const currentDay = currentTime.getDate();
		const currentMonth = currentTime.getMonth() + 1;
		const currentHours = currentTime.getHours();
		const currentMinutes = currentTime.getMinutes() < 10 ? `0${currentTime.getMinutes()}` : currentTime.getMinutes();

		const HHmm = `${currentHours}:${currentMinutes}`;
		const DDdotMM = `${currentDay}.${currentMonth}`;
		const DDslashMM = `${currentDay}/${currentMonth}`;

		const raidTimeFieldValues = [
			`${HHmm}`,
			`${HHmm} ${DDdotMM}`,
			`${DDslashMM} ${HHmm}`,
			`${currentHours}`,
			`${currentHours} ${DDslashMM}`,
		];
		const raidTimeFieldPlaceholder = raidTimeFieldValues[Math.floor(Math.random() * raidTimeFieldValues.length)];

		const raidTimeField = new TextInputBuilder()
			.setCustomId(RaidCreation.RaidTimeField)
			.setLabel("Время старта рейда")
			.setMinLength(1)
			.setPlaceholder(raidTimeFieldPlaceholder)
			.setRequired(true)
			.setStyle(TextInputStyle.Short);

		const raidDescriptionField = new TextInputBuilder()
			.setCustomId(RaidCreation.RaidDescriptionField)
			.setLabel("Описание рейда")
			.setRequired(false)
			.setStyle(TextInputStyle.Paragraph)
			.setMaxLength(1024);

		const raidJoinmentClearsRequirementField = new TextInputBuilder()
			.setCustomId(RaidCreation.RaidClearRequirementField)
			.setLabel("Число закрытий этого рейда для записи")
			.setPlaceholder("0")
			.setValue("0")
			.setRequired(false)
			.setStyle(TextInputStyle.Short);

		raidModal.setComponents(addModalComponents(raidNameField, raidTimeField, raidDescriptionField, raidJoinmentClearsRequirementField));

		await interaction.showModal(raidModal);
	},
});

export default ButtonCommand;
