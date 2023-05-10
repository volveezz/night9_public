import { AutocompleteInteraction } from "discord.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import createErrorEmbed from "../utils/errorHandling/createErrorEmbed.js";
import { timer } from "../utils/general/utilities.js";
const optionParser = (option) => {
    return option
        .map((v) => {
        if (v)
            return `${v.name}${v.value != null ? `:${v.value}` : ""}${v.options != null && v.options.length > 0 ? ` ${optionParser(v.options)}` : ""}`;
    })
        .join(" ");
};
const commandLogger = (interaction) => {
    if (interaction instanceof AutocompleteInteraction)
        return;
    const username = client.getCachedMembers().get(interaction.user.id)?.displayName || interaction.user.username;
    console.log(`${username} used ${interaction.isCommand() ? interaction.commandName : interaction.customId}${interaction.isMessageComponent() && interaction.message && interaction.message.embeds
        ? interaction.message.embeds?.[0]?.title
            ? ` on ${interaction.message.embeds[0].title}`
            : interaction.message.embeds?.[0]?.author?.name
                ? ` on ${interaction.message.embeds?.[0].author.name}`
                : ""
        : ""}${interaction.isCommand() && interaction.options.data.length > 0 ? ` ${optionParser(interaction.options.data)}` : ""}${interaction.channel && !interaction.channel.isDMBased() ? ` in ${interaction.channel.name}` : ""}`);
};
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
                console.log(`Resolved error ${error.code} for ${username}`);
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
            return commandLogger(interaction);
        const buttonInteraction = (interaction.isButton() ? interaction : null);
        const selectMenu = (interaction.isAnySelectMenu() ? interaction : null);
        const modalSubmit = (interaction.isModalSubmit() ? interaction : null);
        button.run({ client, interaction: buttonInteraction, selectMenu, modalSubmit }).catch(async (error) => {
            await errorResolver({ error, interaction, retryOperation: false });
        });
    }
    else if (interaction.isAutocomplete()) {
        const autocomplete = client.autocomplete.get(interaction.commandName);
        if (!autocomplete)
            return console.error("[Error code: 1138] Found unknown autocomplete interaction", interaction);
        autocomplete
            .run({ client, interaction, option: interaction.options.getFocused(true) })
            .catch((e) => console.error("[Error code: 1139]", e));
    }
    commandLogger(interaction);
});
