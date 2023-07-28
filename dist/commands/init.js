import { Command } from "../structures/command.js";
import sendRegistrationLink from "../utils/discord/registration.js";
const SlashCommand = new Command({
    name: "init",
    description: "Свяжите свой аккаунт Destiny с аккаунтом Discord",
    descriptionLocalizations: { "en-US": "Connect your Destiny account to Discord", "en-GB": "Connect your Destiny account to Discord" },
    global: true,
    run: async ({ interaction }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const embeds = [await sendRegistrationLink(interaction)];
        await deferredReply;
        await interaction.editReply({ embeds });
        return;
    },
});
export default SlashCommand;
//# sourceMappingURL=init.js.map