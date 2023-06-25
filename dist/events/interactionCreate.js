import { client } from "../index.js";
import { Event } from "../structures/event.js";
import createErrorEmbed from "../utils/errorHandling/createErrorEmbed.js";
import { timer } from "../utils/general/utilities.js";
import logCommandInteraction from "../utils/logging/commandLogger.js";
const errorResolver = async ({ error, interaction, retryOperation }) => {
    if (retryOperation)
        await timer(200);
    const { embeds, components } = createErrorEmbed(error);
    const messageOptions = { embeds, components, ephemeral: true };
    try {
        const interactionReply = interaction.replied || interaction.deferred ? interaction.followUp(messageOptions) : interaction.reply(messageOptions);
        const username = client.getCachedMembers().get(interaction.user.id)?.displayName || interaction.user.username;
        await interactionReply.catch(async (error) => {
            if (error.code === 40060 || error.code === 10062) {
                await interaction.followUp(messageOptions);
                console.info(`\x1b[32mResolved error ${error.code} for ${username}\x1b[0m`);
                return;
            }
            console.error("[Error code: 1685] Unknown error on command reply", error);
        });
        console.error(`[Error code: 1694] Error during execution of ${interaction.customId || interaction.commandName || interaction.name} for ${username}\n`, error);
    }
    catch (e) {
        if (!retryOperation)
            errorResolver({ error, interaction, retryOperation: true }).catch((e) => console.error("[Error code: 1695] Received error upon second run of error response"));
    }
};
export default new Event("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error("[Error code: 1136] Command not found", interaction);
            return interaction.followUp({ content: "Ошибка. Команда не найдена", ephemeral: true });
        }
        command.run({ args: interaction.options, client, interaction }).catch(async (error) => {
            await errorResolver({ error, interaction, retryOperation: false });
        });
    }
    else if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
        const button = client.buttons.get(interaction.customId.split("_").shift());
        if (!button)
            return logCommandInteraction(interaction);
        const buttonInteraction = (interaction.isButton() ? interaction : null);
        const selectMenu = (interaction.isAnySelectMenu() ? interaction : null);
        const modalSubmit = (interaction.isModalSubmit() ? interaction : null);
        button.run({ client, interaction: buttonInteraction, selectMenu, modalSubmit }).catch(async (error) => {
            await errorResolver({ error, interaction, retryOperation: false });
        });
    }
    else if (interaction.isAutocomplete()) {
        const option = interaction.options.getFocused(true);
        if (!option)
            return;
        const autocompleteId = option.name.split("_")[0];
        const autocomplete = client.autocomplete.get(autocompleteId);
        if (!autocomplete)
            return console.error("[Error code: 1138] Found unknown autocomplete interaction", interaction);
        autocomplete.run({ client, interaction, option }).catch((e) => console.error("[Error code: 1139]", e));
    }
    logCommandInteraction(interaction);
});
