import { ButtonBuilder, ButtonStyle } from "discord.js";
import { PatchnoteButtons } from "../configs/Buttons.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
const channelOfGods = client.getCachedTextChannel(channelIds.supporters);
const newsChannel = client.getCachedTextChannel(channelIds.news);
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
                await channelOfGods.send(messageOptions);
                await interaction.reply({ content: `Отправлено в <#${channelIds.supporters}>`, ephemeral: true });
                await interaction.message.delete();
                return;
            }
            case PatchnoteButtons.sendToPublic: {
                await newsChannel.send(content);
                await interaction.reply({ content: `Отправлено в <#${channelIds.news}>`, ephemeral: true });
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
