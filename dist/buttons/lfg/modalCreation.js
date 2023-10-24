import { ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { addModalComponents } from "../../utils/general/addModalComponents.js";
function generateLfgModal() {
    const modal = new ModalBuilder().setCustomId("lfg_create").setTitle("Создание сбора");
    const userLimit = new TextInputBuilder()
        .setCustomId("userLimit")
        .setLabel("Лимит комнаты")
        .setPlaceholder("Укажите лимит комнаты (на сколько участников комната)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const title = new TextInputBuilder()
        .setCustomId("roomActivityName")
        .setLabel("Название комнаты")
        .setPlaceholder("Укажите название комнаты, которая будет создана")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const description = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Описание")
        .setPlaceholder("Укажите описание сбора")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(1000)
        .setRequired(false);
    const activityName = new TextInputBuilder()
        .setCustomId("activityName")
        .setLabel("Название активности")
        .setPlaceholder("Укажите название активности, в которую вы идете")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    const additionalParams = new TextInputBuilder()
        .setCustomId("additionalParams")
        .setLabel("Дополнительные параметры")
        .setPlaceholder("Их можно найти в #сборы-прямо-сейчас")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    const components = addModalComponents(userLimit, title, description, activityName, additionalParams);
    return modal.setComponents(components);
}
export default generateLfgModal;
//# sourceMappingURL=modalCreation.js.map