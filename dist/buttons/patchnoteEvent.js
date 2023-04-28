import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { PatchnoteButtons } from "../configs/Buttons.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
const channelOfGods = client.getCachedTextChannel(channelIds.supporters);
const newsChannel = client.getCachedTextChannel(channelIds.news);
export default {
    name: "patchnoteEvent",
    run: async ({ interaction }) => {
        const content = interaction.message.embeds.length > 0 ? EmbedBuilder.from(interaction.message.embeds[0]) : interaction.message.content;
        switch (interaction.customId) {
            case PatchnoteButtons.sendToGods: {
                const components = await addButtonComponentsToMessage([
                    new ButtonBuilder()
                        .setCustomId(PatchnoteButtons.sendToPublic)
                        .setStyle(ButtonStyle.Success)
                        .setLabel("Опубликовать для всех"),
                ]);
                const messageOptions = typeof content == "string" ? { content, components } : { embeds: [content], components };
                await channelOfGods.send(messageOptions);
                await interaction.reply({ content: `Отправлено в <#${channelIds.supporters}>`, ephemeral: true });
                await interaction.message.delete();
                return;
            }
            case PatchnoteButtons.sendToPublic: {
                const messageOptions = typeof content == "string" ? { content } : { embeds: [content] };
                await newsChannel.send(messageOptions);
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
