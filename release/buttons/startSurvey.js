import { surveyQuestionGenerator } from "../functions/surveyQuestionGenerator.js";
import { SurveyAnswer } from "../handlers/mongodb.js";
import { disableLastSurvey } from "../functions/disableLastSurvey.js";
import { surveyResults } from "./surveyEvent.js";
import { statusRoles } from "../configs/roles.js";
export default {
    name: "startSurvey",
    run: async ({ client, interaction }) => {
        interaction.deferUpdate();
        const member = interaction.member ||
            client.getCachedMembers().get(interaction.user.id) ||
            (await client.getCachedGuild().members.fetch(interaction.user.id));
        let questionIndex = 0;
        const userVotes = await SurveyAnswer.findOne({ discordId: interaction.user.id }, {
            "answers._id": 0,
            _id: 0,
            __v: 0,
        });
        const cachedUserVotes = surveyResults.get(interaction.user.id);
        if ((userVotes && userVotes.answers) || cachedUserVotes) {
            const combinedData = (userVotes && userVotes.answers && userVotes.answers.length >= (cachedUserVotes?.length || 0)
                ? userVotes.answers
                : cachedUserVotes) || [];
            if (member &&
                member.roles.cache.has(statusRoles.clanmember) &&
                combinedData &&
                (!combinedData.find((q) => q.questionIndex === 3) ||
                    !combinedData.find((q) => q.questionIndex === 4) ||
                    !combinedData.find((q) => q.questionIndex === 5)) &&
                combinedData.find((q) => q.questionIndex >= 6)) {
                questionIndex =
                    (combinedData.find((q) => q.questionIndex === 5)?.questionIndex ||
                        combinedData.find((q) => q.questionIndex === 4)?.questionIndex ||
                        combinedData.find((q) => q.questionIndex === 3)?.questionIndex ||
                        2) + 1;
            }
            else {
                const lastestCachedVote = (cachedUserVotes ? cachedUserVotes?.[cachedUserVotes.length - 1].questionIndex : 0) || 0;
                const lastestVote = (userVotes ? userVotes.answers?.[userVotes.answers.length - 1].questionIndex : 0) || 0;
                questionIndex = lastestCachedVote >= lastestVote ? lastestCachedVote + 1 : lastestVote + 1;
            }
        }
        disableLastSurvey(interaction.user.id);
        const { embeds, components } = surveyQuestionGenerator(questionIndex, interaction.user.id);
        (await interaction.user.createDM()).send({ embeds, components });
    },
};
