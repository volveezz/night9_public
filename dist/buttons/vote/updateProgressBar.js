import { createProgressBar } from "./voteUtils.js";
async function updateVoteProgressBar({ interaction, voteData }) {
    const message = interaction.message;
    const embed = (message.embeds || (await interaction.message.fetch()).embeds)[0];
    if (!embed.data.fields)
        throw new Error("No fields in embed");
    const totalVotes = Object.values(voteData).reduce((a, b) => a + b, 0);
    embed.data.fields.map((field, i) => {
        const votes = voteData[i];
        const progressBar = createProgressBar(totalVotes, votes);
        field.value = progressBar;
    });
    await message.edit({ embeds: [embed] });
}
export default updateVoteProgressBar;
//# sourceMappingURL=updateProgressBar.js.map