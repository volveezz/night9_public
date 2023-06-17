import { AutocompleteInteraction } from "discord.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import createErrorEmbed from "../utils/errorHandling/createErrorEmbed.js";
import { timer } from "../utils/general/utilities.js";
const optionParser = (option) => option
    .map((v) => (v ? `${v.name}${v.value ? `:${v.value}` : ""}${v.options?.length ? ` ${optionParser(v.options)}` : ""}` : ""))
    .join(" ");
const getEmbedTitleOrAuthor = (embeds) => embeds?.[0]?.title ? ` on ${embeds[0].title}` : embeds?.[0]?.author?.name ? ` on ${embeds[0].author.name}` : "";
const getOptionsData = (optionsData) => optionsData?.length ? ` ${optionParser(optionsData)}` : "";
const getChannelName = (channel) => (channel && !channel.isDMBased() ? ` in ${channel.name}` : "");
const commandLogger = async (interaction) => {
    if (interaction instanceof AutocompleteInteraction)
        return;
    const discordId = interaction.user.id;
    const member = await client.getAsyncMember(discordId);
    const username = member?.displayName || interaction.user.username;
    const embedInfo = interaction.isMessageComponent() && interaction.message && interaction.message.embeds
        ? getEmbedTitleOrAuthor(interaction.message.embeds)
        : "";
    const optionsData = interaction.isCommand() ? getOptionsData(interaction.options?.data || []) : "";
    const channelName = getChannelName(interaction.channel);
    const interactionName = interaction.isCommand() ? `\x1b[36m${interaction.commandName}` : `\x1b[33m${interaction.customId}`;
    console.info(`\x1b[37m${username}\x1b[0m used ${interactionName}\x1b[0m${embedInfo}${optionsData}${channelName}`);
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
            return commandLogger(interaction);
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
    commandLogger(interaction);
});
