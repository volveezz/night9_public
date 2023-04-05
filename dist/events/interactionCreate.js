import { AutocompleteInteraction } from "discord.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import errorResolver from "../utils/errorHandling/errorResolver.js";
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
    console.log(`${interaction.member ? interaction.member.displayName : interaction.user.username} used ${interaction.isCommand() ? interaction.commandName : interaction.customId}${interaction.isMessageComponent() && interaction.message && interaction.message.embeds && interaction.message.embeds?.[0]?.title
        ? ` on ${interaction.message.embeds[0].title}`
        : ""}${interaction.isCommand() && interaction.options.data.length > 0 ? ` ${optionParser(interaction.options.data)}` : ""}${interaction.channel && !interaction.channel.isDMBased() ? ` in ${interaction.channel.name}` : ""}`);
};
export default new Event("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            const content = "[Error code: 1136] Command not found";
            console.error(content, { interaction });
            return interaction.followUp({ content, ephemeral: true });
        }
        command.run({ args: interaction.options, client, interaction }).catch(async (e) => {
            const { embeds, components } = errorResolver(e);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds, components, ephemeral: true });
                }
                else {
                    await interaction.reply({ embeds, components, ephemeral: true });
                }
            }
            catch (error) {
                if (error.code === 40060)
                    return await interaction.followUp({ embeds, components, ephemeral: true });
                console.error(`[Error code: 1200] Unknown error on command reply`, error);
            }
            console.error(`[Error code: 1664] Error during execution of ${command.name} for ${client.getCachedMembers().get(interaction.user.id)?.displayName || interaction.user.username}\n`, e);
        });
    }
    else if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
        const button = client.buttons.get(interaction.customId.split("_").shift());
        if (!button)
            return commandLogger(interaction);
        const buttonInteraction = (interaction.isButton() ? interaction : null);
        const selectMenu = (interaction.isAnySelectMenu() ? interaction : null);
        const modalSubmit = (interaction.isModalSubmit() ? interaction : null);
        button.run({ client, interaction: buttonInteraction, selectMenu, modalSubmit }).catch(async (e) => {
            const { embeds, components } = errorResolver(e);
            (interaction.replied || interaction.deferred
                ? interaction.followUp({ embeds, components, ephemeral: true })
                : interaction.reply({ embeds, components, ephemeral: true })).catch((err) => {
                if (err.code === 40060)
                    return interaction.followUp({ embeds, components, ephemeral: true });
                console.error(`[Error code: 1205] Error on button reply`, err);
            });
            console.log(`[Error code: 1204] Error during executing button for ${interaction.user.username}`, e);
        });
    }
    else if (interaction.isAutocomplete()) {
        const autocomplete = client.autocomplete.get(interaction.commandName);
        if (!autocomplete)
            return console.error(`[Error code: 1138] Found unknown autocomplete interaction`, { interaction });
        autocomplete
            .run({ client, interaction, option: interaction.options.getFocused(true) })
            .catch((e) => console.error(`[Error code: 1139]`, { e }));
    }
    commandLogger(interaction);
});
