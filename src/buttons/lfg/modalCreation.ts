import { ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { LfgModal } from "../../configs/Modals.js";
import { addModalComponents } from "../../utils/general/addModalComponents.js";

function generateLfgModal(): ModalBuilder {
	const modal = new ModalBuilder().setCustomId(LfgModal.Create).setTitle("Создание сбора");

	const userLimit = new TextInputBuilder()
		.setCustomId(LfgModal.UserLimit)
		.setLabel("Лимит комнаты")
		.setPlaceholder("Укажите лимит комнаты (на сколько участников комната)")
		.setStyle(TextInputStyle.Short)
		.setRequired(true);

	const title = new TextInputBuilder()
		.setCustomId(LfgModal.RoomName)
		.setLabel("Название комнаты")
		.setPlaceholder("Укажите название комнаты, которая будет создана")
		.setStyle(TextInputStyle.Short)
		.setRequired(true);

	const description = new TextInputBuilder()
		.setCustomId(LfgModal.Description)
		.setLabel("Описание")
		.setPlaceholder("Укажите описание сбора")
		.setStyle(TextInputStyle.Short)
		.setMaxLength(1000)
		.setRequired(false);

	const activityName = new TextInputBuilder()
		.setCustomId(LfgModal.ActivityName)
		.setLabel("Название активности")
		.setPlaceholder("Укажите название активности, в которую вы идете")
		.setStyle(TextInputStyle.Short)
		.setRequired(false);

	const additionalParams = new TextInputBuilder()
		.setCustomId(LfgModal.AdditionalParams)
		.setLabel("Дополнительные параметры")
		.setPlaceholder("Их можно найти в #сборы-прямо-сейчас")
		.setStyle(TextInputStyle.Short)
		.setRequired(false);

	const components = addModalComponents(userLimit, title, description, activityName, additionalParams);

	return modal.setComponents(components);
}

export default generateLfgModal;
