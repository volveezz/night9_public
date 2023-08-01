import { ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { addModalComponents } from "../../utils/general/addModalComponents.js";
function generateVoteEditModal({ answersInput, embed, isEditModal = true }) {
    const modal = new ModalBuilder()
        .setCustomId(isEditModal ? "modifyVote" : "createVote")
        .setTitle(isEditModal ? "Изменить голосование" : "Создать голосование");
    const title = new TextInputBuilder()
        .setCustomId("modifyVote_question")
        .setLabel(isEditModal ? "Изменить заголовок" : "Введите заголовок")
        .setPlaceholder(embed?.data.title || "Введите новый заголовок")
        .setStyle(TextInputStyle.Short);
    const description = new TextInputBuilder()
        .setCustomId("modifyVote_description")
        .setLabel(isEditModal ? "Изменить описание" : "Введите описание")
        .setPlaceholder(embed?.data.description || "Введите новое описание")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(false);
    const answers = new TextInputBuilder()
        .setCustomId("modifyVote_answers")
        .setLabel(isEditModal ? "Измените варианты ответов" : "Введите варианты ответов")
        .setPlaceholder((answersInput && answersInput.join(" | ")) || "Введите новые варианты ответов")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(1000)
        .setRequired(false);
    const image = new TextInputBuilder()
        .setCustomId("modifyVote_image")
        .setLabel("Вставьте ссылку на изображение")
        .setPlaceholder(embed?.data.image?.url || "Вставьте ссылку на изображение")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    return modal.setComponents(addModalComponents(title, description, answers, image));
}
function createProgressBar(totalVotes, votesForOption) {
    const filledLength = Math.round((votesForOption / totalVotes || 0) * 40);
    const emptyLength = 40 - filledLength;
    return "`|" + "■".repeat(filledLength) + " ".repeat(emptyLength) + `|\` **${votesForOption ?? 0}**`;
}
function convertAnswersInButtonLabels(answers) {
    const answersArray = Array.isArray(answers) ? answers : answers.split(" | ");
    return answersArray.every((answer) => answer.length < 30)
        ? `\`${answersArray.join("`, `")}\``
        : answersArray.map((_, i) => `\`${i + 1} ответ\``).join(", ");
}
export { convertAnswersInButtonLabels, createProgressBar };
export default generateVoteEditModal;
//# sourceMappingURL=voteUtils.js.map