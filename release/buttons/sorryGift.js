import { ButtonBuilder, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
export default {
    name: "sorryGift",
    run: async ({ client, interaction }) => {
        const defferedReply = interaction.deferReply({ ephemeral: true });
        const member = interaction.member ||
            client.getCachedMembers().get(interaction.user.id) ||
            (await client.getCachedGuild().members.fetch(interaction.user.id));
        member.roles
            .add("1073799637359669268")
            .then(async (s) => {
            const embed = new EmbedBuilder().setColor(colors.serious).setTitle(`Вам была выдана роль`);
            (await defferedReply) && interaction.editReply({ embeds: [embed] });
            const giftMessageButtonRows = interaction.message.components.map((actionRow) => {
                const giftMessageButtons = actionRow.components.map((component) => {
                    if (component.type === ComponentType.Button) {
                        if (component.customId?.startsWith("sorryGift")) {
                            return ButtonBuilder.from(component).setDisabled(true);
                        }
                        else {
                            return ButtonBuilder.from(component);
                        }
                    }
                    else {
                        throw { name: "Критическая ошибка", component, log: `[Error code: 1432] Found unknown join button type` };
                    }
                });
                return giftMessageButtons;
            });
            interaction.message.edit({
                components: giftMessageButtonRows.map((components) => {
                    return { components, type: ComponentType.ActionRow };
                }),
            });
        })
            .catch(async (e) => {
            console.error(`[Error code: 1437]`, e);
            (await defferedReply) && interaction.editReply({ content: "Произошла ошибка. Администрация выдаст роль вручную" });
        });
    },
};
