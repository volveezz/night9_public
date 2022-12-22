import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { guildId, ids } from "../configs/ids.js";
import { client } from "../index.js";
import { PatchnoteButtons } from "../enums/Buttons.js";
const channelOfGods = client.guilds.cache.get(guildId)?.channels.cache.get(ids.godChnId);
const newsChannel = client.guilds.cache.get(guildId)?.channels.cache.get(ids.newsChnId);
export default {
    name: "patchnoteEvent",
    run: async ({ interaction }) => {
        const content = interaction.message.embeds.length > 0 ? EmbedBuilder.from(interaction.message.embeds[0]) : interaction.message.content;
        switch (interaction.customId) {
            case PatchnoteButtons.sendToGods: {
                const components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder().setCustomId(PatchnoteButtons.sendToPublic).setStyle(ButtonStyle.Success).setLabel("Опубликовать для всех"),
                        ],
                    },
                ];
                channelOfGods
                    .send(typeof content == "string"
                    ? { content, components }
                    : {
                        embeds: [content],
                        components,
                    })
                    .then((_r) => {
                    interaction.reply({ content: `Отправлено в <#${ids.godChnId}>`, ephemeral: true });
                    interaction.message.delete();
                });
                return;
            }
            case PatchnoteButtons.sendToPublic: {
                newsChannel.send(typeof content == "string" ? content : { embeds: [content] }).then((_r) => {
                    interaction.reply({ content: `Отправлено в <#${ids.newsChnId}>`, ephemeral: true });
                    interaction.message.delete();
                });
                return;
            }
            case PatchnoteButtons.cancel: {
                interaction.message.delete().then((_r) => interaction.deferUpdate());
                return;
            }
        }
    },
};
