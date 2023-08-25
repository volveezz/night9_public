import { ApplicationCommandOptionType } from "discord.js";
import { Command } from "../structures/command.js";
import sendRaidGuide from "../utils/general/raidFunctions/sendRaidGuide.js";
const SlashCommand = new Command({
    name: "raid-guide",
    nameLocalizations: {
        ru: "руководство-по-рейдам",
    },
    description: "Shows the raid guide for the specified raid",
    descriptionLocalizations: { ru: "Показывает руководства по доступным рейдам" },
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "specify-raid",
            nameLocalizations: { ru: "укажите-рейд" },
            description: "Specify the guide you want to see",
            descriptionLocalizations: { ru: "Укажите рейд, руководство по которому вам нужно" },
            required: true,
            autocomplete: true,
        },
    ],
    run: async ({ interaction, args }) => {
        const raidName = args.getString("specify-raid", true);
        const deferredReply = interaction.deferReply({ ephemeral: true });
        await sendRaidGuide(interaction, raidName, deferredReply);
        return;
    },
});
export default SlashCommand;
//# sourceMappingURL=showRaidGuide.js.map