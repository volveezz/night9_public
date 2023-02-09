import { ButtonStyle, EmbedBuilder } from "discord.js";
import { ButtonBuilder, ComponentType } from "discord.js";
import { surveyQuestions } from "../configs/survey.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
export function surveyQuestionGenerator(index, member) {
    const embedBuilder = new EmbedBuilder().setColor(colors.default);
    const buttons = [];
    const indexedQuestion = surveyQuestions[index];
    if (!indexedQuestion) {
        const embeds = [new EmbedBuilder().setColor(colors.success).setTitle(`Вы завершили опрос`)];
        return { embeds };
    }
    if (indexedQuestion.avaliableTo && indexedQuestion.avaliableTo && member) {
        const resolvedMember = client.getCachedMembers().get(typeof member === "string" ? member : member.id);
        if (resolvedMember && !resolvedMember.roles.cache.hasAny(...indexedQuestion.avaliableTo)) {
            return surveyQuestionGenerator(index + 1, resolvedMember);
        }
    }
    if (indexedQuestion.name)
        embedBuilder.setTitle(indexedQuestion.name);
    if (indexedQuestion.description)
        embedBuilder.setDescription(indexedQuestion.description);
    if (indexedQuestion.answers)
        indexedQuestion.answers.forEach((answer, answerIndex) => {
            buttons.push(new ButtonBuilder()
                .setCustomId(`surveyEvent_${index}_${answerIndex}_${answer?.value || "plain"}`)
                .setLabel(answer?.name || answer)
                .setStyle(answer?.value === "modal" ? ButtonStyle.Primary : ButtonStyle.Secondary));
        });
    const components = [{ type: ComponentType.ActionRow, components: buttons }];
    const embeds = [embedBuilder];
    return { embeds, components };
}
