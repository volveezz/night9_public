import { CommandInteractionOptionResolver } from "discord.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import { interactionErrorResolver } from "../utils/errorHandling/interactionErrorResolver.js";
import logCommandInteraction from "../utils/logging/commandLogger.js";

export default new Event("interactionCreate", async (interaction) => {
	if (interaction.isCommand()) {
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			console.error("[Error code: 1136] Command not found", interaction);
			return interaction.followUp({ content: "Ошибка. Команда не найдена", ephemeral: true });
		}

		command.run({ args: interaction.options as CommandInteractionOptionResolver, client, interaction }).catch(async (error: any) => {
			console.error("[Error code: 2071] Catched error during command execution", error);
			await interactionErrorResolver({ error, interaction, retryOperation: false });
		});
	} else if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
		const button = client.buttons.get(interaction.customId.split("_").shift()!);

		if (!button) {
			// console.error("[Error code: 2054] Called button wasn't found", interaction.customId);
			return logCommandInteraction(interaction);
		}
		const buttonInteraction = (interaction.isButton() ? interaction : null)!;
		const selectMenu = (interaction.isAnySelectMenu() ? interaction : null)!;
		const modalSubmit = (interaction.isModalSubmit() ? interaction : null)!;

		button.run({ client, interaction: buttonInteraction, selectMenu, modalSubmit }).catch(async (error: any) => {
			await interactionErrorResolver({ error, interaction, retryOperation: false });
		});
	} else if (interaction.isAutocomplete()) {
		const option = interaction.options.getFocused(true);

		if (!option) return;

		const autocompleteId = option.name.split("_")[0];
		const autocomplete = client.autocomplete.get(autocompleteId);

		if (!autocomplete)
			return console.error(`[Error code: 1138] Found unknown autocomplete interaction ${autocompleteId}`, interaction.commandName);

		autocomplete.run({ client, interaction, option }).catch((e: any) => console.error("[Error code: 1139]", e));
	}

	logCommandInteraction(interaction);
});
