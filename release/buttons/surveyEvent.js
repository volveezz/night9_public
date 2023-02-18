import { ActionRowBuilder, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { SurveyButtons } from "../enums/Buttons.js";
import UserErrors from "../enums/UserErrors.js";
import { surveyModalData } from "../configs/surveyModals.js";
import { surveyQuestionGenerator } from "../functions/surveyQuestionGenerator.js";
import { SurveyAnswer } from "../handlers/mongodb.js";
import { client } from "../index.js";
import nameCleaner from "../functions/nameClearer.js";
export const surveyResults = new Map();
export const lastestSurveyModalsIds = new Map();
let isSyncStarted = true;
export async function syncVotesWithDatabase() {
    if (isSyncStarted) {
        isSyncStarted = false;
        setTimeout(async () => {
            for (const [discordId, answers] of surveyResults) {
                surveyResults.delete(discordId);
                const userAnswersData = await SurveyAnswer.findOne({ discordId }, {
                    _id: 0,
                    __v: 0,
                });
                if (!userAnswersData) {
                    const username = nameCleaner(client.getCachedMembers().get(discordId)?.displayName);
                    const newEntry = new SurveyAnswer({
                        discordId,
                        username,
                        answers,
                    });
                    await newEntry.save();
                }
                else {
                    await SurveyAnswer.updateOne({ discordId }, { $set: { answers } });
                }
            }
            isSyncStarted = true;
        }, 1000 * 60 * 30);
    }
}
export default {
    name: "surveyEvent",
    run: async ({ interaction }) => {
        if (interaction.customId === SurveyButtons.alreadyVoted) {
            throw { errorType: UserErrors.SURVEY_ALREADY_VOTED };
        }
        const interactionCustomIdParts = interaction.customId.split("_");
        const surveyQuestion = parseInt(interactionCustomIdParts[1]);
        const answerIndex = parseInt(interactionCustomIdParts[2]);
        const answerValue = interactionCustomIdParts[3];
        if (answerValue === "modal") {
            const modalData = surveyModalData.find((data) => data.customId === `surveyModal_${surveyQuestion}_${answerIndex}`) ||
                surveyModalData.find((data) => data.customId.startsWith(`surveyModal_${surveyQuestion}`)) || {
                title: "Объясните ваш вариант ответа",
                customId: `surveyModal_${surveyQuestion}_${answerIndex}_notfound`,
                fields: [
                    new TextInputBuilder()
                        .setLabel("Ответ")
                        .setStyle(TextInputStyle.Paragraph)
                        .setCustomId(`surveyModal_${surveyQuestion}_${answerIndex}_blankModal`)
                        .setRequired(false),
                ],
            };
            const modal = new ModalBuilder().setTitle(modalData.title).setCustomId(modalData.customId);
            modalData.fields.forEach((field) => {
                modal.addComponents(...[new ActionRowBuilder().addComponents(field)]);
            });
            lastestSurveyModalsIds.set(interaction.user.id, interaction.customId);
            return interaction.showModal(modal);
        }
        const userVotes = surveyResults.get(interaction.user.id) ||
            (await SurveyAnswer.findOne({ discordId: interaction.user.id }, {
                _id: 0,
                __v: 0,
            }))?.answers ||
            [];
        userVotes.push({ questionIndex: surveyQuestion, answerIndex, answerValue });
        if (surveyQuestion >= 3 && surveyQuestion <= 5)
            userVotes.sort((a, b) => a.questionIndex - b.questionIndex);
        surveyResults.set(interaction.user.id, userVotes);
        syncVotesWithDatabase();
        const surverMessageButtonRows = interaction.message.components.map((actionRow) => {
            const surveyMessageButtons = actionRow.components.map((component) => {
                if (component.type === ComponentType.Button) {
                    if (component.customId === interaction.customId) {
                        return ButtonBuilder.from(component).setCustomId(SurveyButtons.alreadyVoted);
                    }
                    else {
                        return ButtonBuilder.from(component).setDisabled(true);
                    }
                }
                else {
                    throw { name: "Критическая ошибка", component, log: `[Error code: 1428] Found unknown join button type` };
                }
            });
            return surveyMessageButtons;
        });
        interaction.update({
            components: surverMessageButtonRows.map((components) => {
                return { components, type: ComponentType.ActionRow };
            }),
        });
        const { embeds, components } = surveyQuestionGenerator((surveyQuestion === 5 ? userVotes[userVotes.length - 1].questionIndex : surveyQuestion) + 1, interaction.user.id);
        (interaction.channel || interaction.user.dmChannel || (await interaction.user.createDM())).send({
            embeds,
            components,
        });
    },
};
