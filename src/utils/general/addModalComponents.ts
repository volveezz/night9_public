import { ActionRowBuilder, TextInputBuilder } from "discord.js";

export function addModalComponents(...modalComponents: TextInputBuilder[]) {
	if (!modalComponents || modalComponents.length === 0) return [];

	return modalComponents.map((option) => new ActionRowBuilder<TextInputBuilder>().addComponents(option));
}
