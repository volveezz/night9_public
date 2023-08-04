import { ButtonBuilder, ButtonStyle } from "discord.js";
import { client } from "../index.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
let channelOfGods = null;
let newsChannel = null;
const ButtonCommand = new Button({
    name: "patchnoteEvent",
    run: async ({ interaction }) => {
        const content = interaction.message.content;
        switch (interaction.customId) {
            case "patchnoteEvent_sendToGods": {
                const components = addButtonsToMessage([
                    new ButtonBuilder()
                        .setCustomId("patchnoteEvent_sendToPublic")
                        .setStyle(ButtonStyle.Success)
                        .setLabel("Опубликовать для всех"),
                ]);
                const messageOptions = { content, components };
                if (!channelOfGods)
                    channelOfGods =
                        client.getCachedTextChannel(process.env.GOD_BOT_CHANNEL_ID) ||
                            (await client.getAsyncTextChannel(process.env.GOD_BOT_CHANNEL_ID));
                await channelOfGods.send(messageOptions);
                await interaction.reply({ content: `Отправлено в <#${process.env.GOD_BOT_CHANNEL_ID}>`, ephemeral: true });
                await interaction.message.delete();
                return;
            }
            case "patchnoteEvent_sendToPublic": {
                if (!newsChannel)
                    newsChannel =
                        client.getCachedTextChannel(process.env.NEWS_CHANNEL_ID) ||
                            (await client.getAsyncTextChannel(process.env.NEWS_CHANNEL_ID));
                await newsChannel.send(content);
                await interaction.reply({ content: `Отправлено в <#${process.env.NEWS_CHANNEL_ID}>`, ephemeral: true });
                await interaction.message.delete();
                return;
            }
            case "patchnoteEvent_cancel": {
                await interaction.message.delete();
                await interaction.deferUpdate();
                return;
            }
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=patchnoteEvent.js.map