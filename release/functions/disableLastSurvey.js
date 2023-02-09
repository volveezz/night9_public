import { ButtonBuilder, ComponentType } from "discord.js";
import { client } from "../index.js";
export async function disableLastSurvey(userId) {
    const user = client.getCachedMembers().get(userId) || client.users.cache.get(userId) || (await client.users.fetch(userId));
    const dmChannel = user.dmChannel || (await user.createDM());
    const messages = (await dmChannel.messages.fetch({ limit: 10 })).filter((a) => a.author.bot);
    const lastSurvey = messages.find((message) => message.embeds && message.embeds[0].color === 13442767 && message.components?.[0] !== undefined);
    if (lastSurvey) {
        const surverMessageButtonRows = lastSurvey.components.map((actionRow) => {
            const surveyMessageButtons = actionRow.components.map((component) => {
                if (component.type === ComponentType.Button) {
                    return ButtonBuilder.from(component).setDisabled(true);
                }
                else {
                    throw { name: "Критическая ошибка", component, log: `[Error code: 1432] Found unknown join button type` };
                }
            });
            return surveyMessageButtons;
        });
        lastSurvey.edit({
            components: surverMessageButtonRows.map((components) => {
                return { components, type: ComponentType.ActionRow };
            }),
        });
    }
}
