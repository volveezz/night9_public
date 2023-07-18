import { ComponentType } from "discord.js";
export function addButtonsToMessage(buttonBuilders) {
    if (!buttonBuilders || buttonBuilders.length === 0)
        return [];
    const rows = Math.ceil(buttonBuilders.length / 5);
    const components = [];
    for (let i = 0; i < rows; i++) {
        const buttonsInRow = buttonBuilders.slice(i * 5, (i + 1) * 5);
        const row = { type: ComponentType.ActionRow, components: [] };
        for (let j = 0; j < buttonsInRow.length; j++) {
            row.components.push(buttonsInRow[j]);
        }
        components.push(row);
    }
    return components;
}
//# sourceMappingURL=addButtonsToMessage.js.map