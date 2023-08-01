import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import createModalCollector from "../../utils/discord/modalCollector.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { VotingDatabase } from "../../utils/persistence/sequelize.js";
import VoteButtons from "./VoteButtons.js";
import generateVoteEditModal, { convertAnswersInButtonLabels } from "./utils.js";
import { createProgressBar } from "./voteUtils.js";
const components = [
    new ButtonBuilder().setCustomId(VoteButtons.Edit).setLabel("Изменить опрос").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(VoteButtons.Send).setLabel("Отправить").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(VoteButtons.Delete).setLabel("Удалить").setStyle(ButtonStyle.Danger),
];
async function createVoteFromParams(interaction, question, description, answers, multipleAnswers) {
    const embed = new EmbedBuilder().setColor(colors.invisible);
    let validatedQuestion = question.trim();
    let validatedDescription = description?.trim() || null;
    let validatedAnswers = answers
        .split("|")
        .map((answer) => answer.trim())
        .filter((answer) => answer.length > 0 && answer.length < 300);
    const progressBar = createProgressBar(0, 0);
    embed
        .setTitle(question)
        .setDescription(description)
        .addFields(validatedAnswers.map((answer) => ({ name: answer, value: progressBar })))
        .addFields({
        name: "Ответы [будет скрыто при публикации]",
        value: convertAnswersInButtonLabels(validatedAnswers),
    });
    const reply = await interaction.reply({ embeds: [embed], components: addButtonsToMessage(components) });
    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,
        time: 60000,
        interactionResponse: reply,
    });
    collector.on("collect", (buttonInteraction) => {
        switch (buttonInteraction.customId) {
            case VoteButtons.Send:
                return sendVote();
            case VoteButtons.Edit:
                return handleAddingOptions();
            case VoteButtons.Delete:
                return deleteVote();
        }
        async function handleAddingOptions() {
            const updatedModal = generateVoteEditModal(validatedAnswers, embed);
            await buttonInteraction.showModal(updatedModal);
            const modalReply = await createModalCollector(buttonInteraction, {
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000,
            });
            if (!modalReply)
                return;
            validatedQuestion = modalReply.fields.getField("modifyVote_question", ComponentType.TextInput).value;
            const description = modalReply.fields.getField("modifyVote_description", ComponentType.TextInput).value;
            const answers = modalReply.fields.getField("modifyVote_answers", ComponentType.TextInput).value.split(" | ");
            const image = modalReply.fields.getField("modifyVote_image", ComponentType.TextInput).value;
            if (answers && answers.length >= 2) {
                if (answers.every((a) => a.length < 30 && a.length > 0)) {
                    validatedAnswers = answers;
                }
                else {
                    validatedAnswers = answers.map((_, i) => `Ответ ${i + 1}`);
                }
            }
            if (validatedQuestion) {
                embed.setTitle(validatedQuestion);
            }
            if (description) {
                validatedDescription = description.trim();
            }
            if (image) {
                embed.setImage(image);
            }
            embed.setDescription(validatedDescription).setFields(...validatedAnswers.map((answer) => ({ name: answer, value: progressBar })), {
                name: "Ответы [будет скрыто при публикации]",
                value: convertAnswersInButtonLabels(validatedAnswers),
            });
            await interaction.editReply({ embeds: [embed] });
        }
        async function sendVote() {
            collector.stop(VoteButtons.Send);
            const { uniqueId, components } = generateComponents(validatedAnswers);
            const message = buttonInteraction.channel.send({ embeds: [embed], components: addButtonsToMessage(components) });
            const query = VotingDatabase.create({
                uniqueId,
                multiVote: false,
                votes: [],
            });
            await Promise.all([message, query]);
            function generateComponents(fieldTitles) {
                const uniqueId = crypto.randomUUID().split("-")[0];
                const returnValues = {
                    uniqueId,
                    components: [],
                };
                if (fieldTitles.every((title) => title.length < 30)) {
                    returnValues["components"] = fieldTitles.map((title, i) => {
                        return new ButtonBuilder()
                            .setCustomId(`${VoteButtons.BaseCustomId}_${uniqueId}_${i}`)
                            .setLabel(title)
                            .setStyle(ButtonStyle.Secondary);
                    });
                }
                else {
                    returnValues["components"] = fieldTitles.map((title, i) => {
                        return new ButtonBuilder()
                            .setCustomId(`${VoteButtons.BaseCustomId}_${uniqueId}_${i}`)
                            .setLabel(`${i + 1} ответ`)
                            .setStyle(ButtonStyle.Secondary);
                    });
                }
                return returnValues;
            }
        }
        async function deleteVote() {
            collector.stop(VoteButtons.Delete);
            buttonInteraction.deleteReply(await reply.fetch());
            buttonInteraction.reply({ content: "Голосование удалено", ephemeral: true });
        }
    });
    collector.on("end", (c, r) => {
        console.debug("Collector ended", r);
        reply.edit({ components: [], content: "Время ожидания истекло" });
    });
}
export default createVoteFromParams;
//# sourceMappingURL=createVote.js.map