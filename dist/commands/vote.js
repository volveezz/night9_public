import { ApplicationCommandOptionType, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { VoteModal } from "../configs/Modals.js";
import { Command } from "../structures/command.js";
import { addOptionsToVote } from "../utils/discord/voteUtils.js";
export default new Command({
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
            const modal = new ModalBuilder().setTitle("Создать новое голосование").setCustomId(VoteModal.CreateVote);
            const voteQuestion = new TextInputBuilder()
                .setLabel("Вопрос")
                .setStyle(TextInputStyle.Short)
                .setCustomId(VoteModal.ModifyVoteQuestion)
                .setPlaceholder("Укажите вопрос для голосования")
                .setMaxLength(256)
                .setRequired(true);
            const updatedModal = addOptionsToVote(modal, voteQuestion);
            await interaction.showModal(updatedModal);
        }
    },
});
//# sourceMappingURL=vote.js.map