import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { chnFetcher } from "../base/channels.js";
import { ids } from "../base/ids.js";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        const content = interaction.message.embeds.length > 0 ? EmbedBuilder.from(interaction.message.embeds[0]) : interaction.message.content;
        switch (interaction.customId) {
            case "patchnoteEvent_sendToGods": {
                const components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder().setCustomId("patchnoteEvent_sendToPublic").setStyle(ButtonStyle.Success).setLabel("Опубликовать для всех"),
                        ],
                    },
                ];
                chnFetcher(ids.godChnId)
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
            case "patchnoteEvent_sendToPublic": {
                chnFetcher(ids.newsChnId)
                    .send(typeof content == "string" ? content : { embeds: [content] })
                    .then((_r) => {
                    interaction.reply({ content: `Отправлено в <#${ids.newsChnId}>`, ephemeral: true });
                    interaction.message.delete();
                });
                return;
            }
            case "patchnoteEvent_cancel": {
                interaction.message.delete().then((_r) => interaction.deferUpdate());
                return;
            }
        }
    },
};
