import { ApplicationCommandOptionType } from "discord.js";
import generateVoteEditModal from "../buttons/vote/voteUtils.js";
import { Command } from "../structures/command.js";
const SlashCommand = new Command({
    name: "голосование",
    nameLocalizations: { "en-US": "vote", "en-GB": "vote" },
    description: "Управление системой голосования",
    descriptionLocalizations: {
        "en-US": "Manage the voting system",
        "en-GB": "Manage the voting system",
    },
    options: [
        {
            name: "создать",
            nameLocalizations: { "en-US": "create", "en-GB": "create" },
            description: "Создать новое голосование",
            descriptionLocalizations: {
                "en-US": "Create a new vote",
                "en-GB": "Create a new vote",
            },
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
    run: async ({ interaction, args }) => {
        const subcommand = args.getSubcommand(true);
        switch (subcommand) {
            case "создать":
                return createVote();
        }
        async function createVote() {
            const modal = generateVoteEditModal({ isEditModal: false, answersInput: [] });
            await interaction.showModal(modal);
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=vote.js.map