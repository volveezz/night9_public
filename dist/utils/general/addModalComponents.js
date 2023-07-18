import { ActionRowBuilder } from "discord.js";
export function addModalComponents(...modalComponents) {
    if (!modalComponents || modalComponents.length === 0)
        return [];
    return modalComponents.map((option) => new ActionRowBuilder().addComponents(option));
}
//# sourceMappingURL=addModalComponents.js.map