import { randomUUID } from "crypto";
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import VoteSystem from "../../structures/VoteSystem.js";
import createModalCollector from "../../utils/discord/modalCollector.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { VotingDatabase } from "../../utils/persistence/sequelize.js";
import VoteButtons from "./VoteButtons.js";
import generateVoteEditModal, { convertAnswersInButtonLabels, createProgressBar } from "./voteUtils.js";
const components = [
    new ButtonBuilder().setCustomId(VoteButtons.Send).setLabel("Отправить").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(VoteButtons.Edit).setLabel("Изменить опрос").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(VoteButtons.Delete).setLabel("Удалить").setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
        .setCustomId(VoteButtons.AllowMultipleAnswers)
        .setLabel("Разрешить несколько ответов")
        .setStyle(ButtonStyle.Secondary),
];
async function createVoteFromParams({ interaction, question, description, answers, image }) {
    const embed = new EmbedBuilder().setColor(colors.invisible);
    let validatedQuestion = question;
    let validatedDescription = description || null;
    let validatedAnswers = answers
        .split("|")
        .map((answer) => answer.trim())
        .filter((answer) => answer.length > 0);
    let imageUrl = image;
    let allowMultipleAnswers = false;
    try {
        embed.setImage(imageUrl);
    }
    catch (error) {
        imageUrl = null;
    }
    const progressBar = createProgressBar(0, 0);
    embed
        .setTitle(validatedQuestion)
        .setDescription(validatedDescription)
        .addFields(validatedAnswers.map((answer) => ({ name: answer, value: progressBar })))
        .addFields({
        name: "Ответы [будет скрыто при публикации]",
        value: convertAnswersInButtonLabels(validatedAnswers),
    });
    const reply = await interaction.reply({ embeds: [embed], components: addButtonsToMessage(components), ephemeral: true });
    const collector = interaction.channel.createMessageComponentCollector({
        message: await reply.fetch(),
        componentType: ComponentType.Button,
        filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,
        time: 1000 * 60 * 5,
    });
    collector.on("collect", (buttonInteraction) => {
        switch (buttonInteraction.customId) {
            case VoteButtons.Send:
                return sendVote();
            case VoteButtons.Edit:
                return handleAddingOptions();
            case VoteButtons.Delete:
                return deleteVote();
            case VoteButtons.AllowMultipleAnswers:
                return handleMultipleAnswersButton();
        }
        async function handleAddingOptions() {
            const updatedModal = generateVoteEditModal({ answersInput: validatedAnswers, embed });
            await buttonInteraction.showModal(updatedModal);
            const modalReply = await createModalCollector(buttonInteraction, {
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000,
            });
            if (!modalReply)
                return;
            validatedQuestion = modalReply.fields.getField("modifyVote_question", ComponentType.TextInput).value;
            validatedDescription = modalReply.fields.getField("modifyVote_description", ComponentType.TextInput).value;
            validatedAnswers = modalReply.fields.getField("modifyVote_answers", ComponentType.TextInput).value.split(" | ");
            imageUrl = modalReply.fields.getField("modifyVote_image", ComponentType.TextInput).value;
            if (answers && answers.length >= 2) {
                if (!validatedAnswers.every((a) => a.length < 30 && a.length > 0)) {
                    validatedAnswers = validatedAnswers.map((_, i) => `Ответ ${i + 1}`);
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
            interaction.deleteReply(buttonInteraction.message);
            const { uniqueId, components } = generateComponents(validatedAnswers);
            embed.data.fields?.pop();
            const message = buttonInteraction.channel.send({ embeds: [embed], components: addButtonsToMessage(components) });
            const query = VotingDatabase.create({
                uniqueId,
                multiVote: allowMultipleAnswers,
                votes: [],
            }).then((_) => VoteSystem.getInstance().addVote(uniqueId, allowMultipleAnswers));
            await Promise.all([message, query]);
            function generateComponents(fieldTitles) {
                const uniqueId = randomUUID().split("-")[0];
                const returnValues = {
                    uniqueId,
                    components: [],
                };
                if (fieldTitles.every((title) => title.length < 36)) {
                    returnValues["components"] = fieldTitles.map((title, i) => {
                        return new ButtonBuilder()
                            .setCustomId(`${VoteButtons.BaseCustomId}_${uniqueId}_${i}`)
                            .setLabel(title)
                            .setStyle(ButtonStyle.Secondary);
                    });
                }
                else {
                    returnValues["components"] = fieldTitles.map((_, i) => {
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
        async function handleMultipleAnswersButton() {
            allowMultipleAnswers = !allowMultipleAnswers;
            const embed = new EmbedBuilder()
                .setColor(allowMultipleAnswers ? colors.success : colors.error)
                .setTitle(allowMultipleAnswers ? "Вы разрешили несколько ответов" : "Вы запретили несколько ответов");
            await buttonInteraction.reply({ embeds: [embed], ephemeral: true });
        }
    });
    collector.on("end", (c, r) => {
        console.debug("Collector ended", r);
        if (r === "time")
            reply.edit({ components: [], content: "Время ожидания истекло" });
    });
}
export default createVoteFromParams;
//# sourceMappingURL=createVoteFromParams.js.map