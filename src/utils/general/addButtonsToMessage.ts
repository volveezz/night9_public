import { ActionRowData, ButtonBuilder, ComponentType, MessageActionRowComponent, StringSelectMenuBuilder } from "discord.js";

export function addButtonsToMessage(
	buttonBuilders: MessageActionRowComponent[] | ButtonBuilder[] | StringSelectMenuBuilder[]
): ActionRowData<ButtonBuilder | StringSelectMenuBuilder | MessageActionRowComponent>[] {
	if (!buttonBuilders || buttonBuilders.length === 0) return [];
	const rows = Math.ceil(buttonBuilders.length / 5);
	const components: ActionRowData<ButtonBuilder | StringSelectMenuBuilder | MessageActionRowComponent>[] = [];

	for (let i = 0; i < rows; i++) {
		const buttonsInRow = buttonBuilders.slice(i * 5, (i + 1) * 5);
		const row: ActionRowData<ButtonBuilder | StringSelectMenuBuilder | MessageActionRowComponent> = {
			type: ComponentType.ActionRow,
			components: [],
		};

		row.components = [...row.components, ...buttonsInRow];

		components.push(row);
	}

	return components;
}
