import { TextInputBuilder, TextInputStyle } from "discord.js";
import { addModalComponents } from "../general/addModalComponents.js";
export function createProgressBar(totalVotes, votesForOption) {
    const filledLength = Math.round((votesForOption / totalVotes || 0) * 40);
    const emptyLength = 40 - filledLength;
    return "`|" + "■".repeat(filledLength) + " ".repeat(emptyLength) + "|`";
}
export function createVoteOption(index) {
    return new TextInputBuilder()
        .setLabel("Вариант ответа")
        .setStyle(TextInputStyle.Short)
        .setCustomId(`${"modifyVote_option"}${index}`)
        .setPlaceholder("До 100 символов")
        .setRequired(index === 0 ? true : false);
}
export function addOptionsToVote(vote, voteQuestion) {
    const voteOptions = voteQuestion ? [voteQuestion] : [];
    for (let i = 0; i < 5 && voteOptions.length < 5; i++) {
        voteOptions.push(createVoteOption(i));
    }
    return vote.setComponents(addModalComponents(...voteOptions));
}
//# sourceMappingURL=voteUtils.js.map