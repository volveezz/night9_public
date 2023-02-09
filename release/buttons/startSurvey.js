import { surveyQuestionGenerator } from "../functions/surveyQuestionGenerator.js";
import { SurveyAnswer } from "../handlers/mongodb.js";
import { disableLastSurvey } from "../functions/disableLastSurvey.js";
import { surveyResults } from "./surveyEvent.js";
export default {
    name: "startSurvey",
    run: async ({ interaction }) => {
        interaction.deferUpdate();
        let questionIndex = 0;
        const userVotes = await SurveyAnswer.findOne({ discordId: interaction.user.id }, {
            "answers._id": 0,
            _id: 0,
            __v: 0,
        });
        const cachedUserVotes = surveyResults.get(interaction.user.id);
        if ((userVotes && userVotes.answers) || cachedUserVotes) {
            const lastestCachedVote = (cachedUserVotes ? cachedUserVotes?.[cachedUserVotes.length - 1].questionIndex : 0) || 0;
            const lastestVote = (userVotes ? userVotes.answers?.[userVotes.answers.length - 1].questionIndex : 0) || 0;
            questionIndex = lastestCachedVote >= lastestVote ? lastestCachedVote + 1 : lastestVote + 1;
        }
        disableLastSurvey(interaction.user.id);
        const { embeds, components } = surveyQuestionGenerator(questionIndex, interaction.user.id);
        (await interaction.user.createDM()).send({ embeds, components });
    },
};
