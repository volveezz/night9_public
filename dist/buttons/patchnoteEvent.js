import { ButtonBuilder, ButtonStyle } from "discord.js";
import { PatchnoteButtons } from "../configs/Buttons.js";
import { client } from "../index.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
let channelOfGods = null;
let newsChannel = null;
export default {
    name: "patchnoteEvent",
    run: async ({ interaction }) => {
        const content = interaction.message.content;
        switch (interaction.customId) {
            case PatchnoteButtons.sendToGods: {
                const components = await addButtonsToMessage([
                    new ButtonBuilder()
                        .setCustomId(PatchnoteButtons.sendToPublic)
                        .setStyle(ButtonStyle.Success)
                        .setLabel("Опубликовать для всех"),
                ]);
                const messageOptions = { content, components };
                if (!channelOfGods)
                    channelOfGods =
                        client.getCachedTextChannel(process.env.GOD_CHANNEL_ID) ||
                            (await client.getAsyncTextChannel(process.env.GOD_CHANNEL_ID));
                await channelOfGods.send(messageOptions);
                await interaction.reply({ content: `Отправлено в <#${process.env.GOD_CHANNEL_ID}>`, ephemeral: true });
                await interaction.message.delete();
                return;
            }
            case PatchnoteButtons.sendToPublic: {
                if (!newsChannel)
                    newsChannel =
                        client.getCachedTextChannel(process.env.NEWS_CHANNEL_ID) ||
                            (await client.getAsyncTextChannel(process.env.NEWS_CHANNEL_ID));
                await newsChannel.send(content);
                await interaction.reply({ content: `Отправлено в <#${process.env.NEWS_CHANNEL_ID}>`, ephemeral: true });
                await interaction.message.delete();
                return;
            }
            case PatchnoteButtons.cancel: {
                await interaction.message.delete();
                await interaction.deferUpdate();
                return;
            }
        }
    },
};
//# sourceMappingURL=patchnoteEvent.js.map