import { ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { client } from "../../index.js";
async function unlockRaidMessage({ interaction, raidEvent }) {
    const raidChannel = client.getCachedTextChannel(process.env.RAID_CHANNEL_ID);
    const raidMessage = raidChannel.messages.cache.get(raidEvent.messageId) || (await client.getAsyncMessage(raidChannel, raidEvent.messageId));
    if (!raidMessage) {
        throw { name: "Ошибка", description: "Сообщение рейда не найдено" };
    }
    const [components, inChannelComponents] = await raidButtonsUnlocker({ interaction, raidEvent }, raidMessage);
    const publicMessagePromise = raidMessage.edit({
        components: components.map((components) => {
            return { components, type: ComponentType.ActionRow };
        }),
    });
    const privateMessagePromise = interaction.message.edit({
        components: inChannelComponents.map((components) => {
            return { components, type: ComponentType.ActionRow };
        }),
    });
    await Promise.all([publicMessagePromise, privateMessagePromise]);
}
async function raidButtonsUnlocker({ interaction, raidEvent }, raidMessage) {
    const inChannelMessageButtonRows = interaction.message.components.map((actionRow) => {
        const inChannelMessageButtons = actionRow.components.map((component) => {
            const unlockButton = component;
            if (component.customId === "raidInChnButton_unlock" && unlockButton) {
                if (unlockButton.label === "Закрыть набор") {
                    return ButtonBuilder.from(unlockButton).setStyle(ButtonStyle.Success).setLabel("Открыть набор");
                }
                else if (unlockButton.label === "Открыть набор") {
                    return ButtonBuilder.from(unlockButton).setStyle(ButtonStyle.Danger).setLabel("Закрыть набор");
                }
            }
            return ButtonBuilder.from(unlockButton);
        });
        return inChannelMessageButtons;
    });
    const raidMessageButtonRows = raidMessage.components.map((actionRow) => {
        const raidMessageButtons = actionRow.components.map((component) => {
            if (component.type === ComponentType.Button) {
                if (component.customId === "raidButton_action_join" || component.customId === "raidButton_action_alt") {
                    return ButtonBuilder.from(component).setDisabled(!component.disabled);
                }
                else {
                    return ButtonBuilder.from(component);
                }
            }
            else {
                console.error("[Error code: 2018] Found unknown join button type", component.type, raidEvent);
                throw { name: "Произошла непредвиденная ошибка" };
            }
        });
        return raidMessageButtons;
    });
    return [raidMessageButtonRows, inChannelMessageButtonRows];
}
export default unlockRaidMessage;
//# sourceMappingURL=unlockRaidMessage.js.map