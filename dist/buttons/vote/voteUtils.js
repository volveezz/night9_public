import { ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { addModalComponents } from "../../utils/general/addModalComponents.js";
function generateVoteEditModal({ answersInput, embed, isEditModal = true }) {
    const modal = new ModalBuilder()
        .setCustomId(isEditModal ? "modifyVote" : "createVote")
        .setTitle(isEditModal ? "Изменить голосование" : "Создать голосование");
    const titlePlaceholder = embed?.data?.title && embed.data.title.length > 0 && embed.data.title.length < 100 ? embed.data.title : "Укажите новый заголовок";
    const descriptionPlaceholder = embed?.data?.description && embed.data.description.length > 0 && embed.data.description.length < 100
        ? embed.data.description
        : "Укажите новое описание";
    const joinedAnswers = answersInput && answersInput.join(" | ");
    const answersPlaceholder = joinedAnswers && joinedAnswers.length > 0 && joinedAnswers.length < 100 ? joinedAnswers : "Укажите новые варианты ответов";
    const imagePlaceholder = embed?.data?.image?.url &&
        embed.data.image.url.startsWith("http") &&
        embed.data.image.url.length > 0 &&
        embed.data.image.url.length < 100
        ? embed.data.image.url
        : "Вставьте ссылку на изображение";
    const title = new TextInputBuilder()
        .setCustomId("modifyVote_question")
        .setLabel(isEditModal ? "Изменить заголовок" : "Введите заголовок")
        .setPlaceholder(titlePlaceholder)
        .setStyle(TextInputStyle.Short);
    const description = new TextInputBuilder()
        .setCustomId("modifyVote_description")
        .setLabel(isEditModal ? "Изменить описание" : "Введите описание")
        .setPlaceholder(descriptionPlaceholder)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(false);
    const answers = new TextInputBuilder()
        .setCustomId("modifyVote_answers")
        .setLabel(isEditModal ? "Измените варианты ответов" : "Введите варианты ответов")
        .setPlaceholder(answersPlaceholder)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(1000)
        .setRequired(false);
    const image = new TextInputBuilder()
        .setCustomId("modifyVote_image")
        .setLabel("Вставьте ссылку на изображение")
        .setPlaceholder(imagePlaceholder)
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    if (isEditModal) {
        if (titlePlaceholder.length > 1 && titlePlaceholder.length < 100) {
            title.setValue(titlePlaceholder);
        }
        if (descriptionPlaceholder.length > 1 && descriptionPlaceholder.length < 100) {
            description.setValue(descriptionPlaceholder);
        }
        if (answersPlaceholder.length > 1 && answersPlaceholder.length < 100) {
            answers.setValue(answersPlaceholder);
        }
        if (imagePlaceholder.startsWith("http") && imagePlaceholder.length > 1 && imagePlaceholder.length < 100) {
            image.setValue(imagePlaceholder);
        }
    }
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