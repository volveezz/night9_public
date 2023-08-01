import VoteSystem from "../structures/VoteSystem.js";
import { Button } from "../structures/button.js";
import updateVoteProgressBar from "./vote/updateProgressBar.js";
const voteSystem = VoteSystem.getInstance();
const ButtonCommand = new Button({
    name: "voteFor",
    run: async ({ interaction }) => {
        const voteParams = interaction.customId.split("_");
        const uniqueId = voteParams[1];
        const voteOption = parseInt(voteParams[2]);
        const voteResult = voteSystem.vote({ discordId: interaction.user.id, uniqueId, voteOption });
        await updateVoteProgressBar({ interaction, voteData: voteResult });
        interaction.deferUpdate();
    },
});
export default ButtonCommand;
//# sourceMappingURL=voteFor.js.map