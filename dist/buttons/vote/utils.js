import { ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { addModalComponents } from "../../utils/general/addModalComponents.js";
function generateVoteEditModal(answersInput, embed) {
    const modal = new ModalBuilder().setTitle("Изменить голосование").setCustomId("modifyVote");
    const title = new TextInputBuilder()
        .setCustomId("modifyVote_question")
        .setLabel("Изменить заголовок")
        .setPlaceholder(embed?.data.title || "Введите новый заголовок")
        .setStyle(TextInputStyle.Short);
    const description = new TextInputBuilder()
        .setCustomId("modifyVote_description")
        .setLabel("Изменить описание")
        .setPlaceholder(embed?.data.description || "Введите новое описание")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000);
    const answers = new TextInputBuilder()
        .setCustomId("modifyVote_answers")
        .setLabel("Изменить описание")
        .setPlaceholder(answersInput.join(" | ") || "Введите новые вопросы")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(1000);
    const image = new TextInputBuilder()
        .setCustomId("modifyVote_image")
        .setLabel("Изменить изображение")
        .setPlaceholder(embed?.data.image?.url || "Вставьте ссылку на изображение")
        .setStyle(TextInputStyle.Short);
    return modal.setComponents(addModalComponents(title, description, answers, image));
}
function convertAnswersInButtonLabels(answers) {
    const answersArray = Array.isArray(answers) ? answers : answers.split(" | ");
    return answersArray.every((answer) => answer.length < 30)
        ? `\`${answersArray.join("`, `")}\``
        : answersArray.map((_, i) => `\`${i + 1} ответ\``).join(", ");
}
export { convertAnswersInButtonLabels };
export default generateVoteEditModal;
//# sourceMappingURL=utils.js.map