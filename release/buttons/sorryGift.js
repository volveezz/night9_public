import { EmbedBuilder } from "discord.js";
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
        })
            .catch(async (e) => {
            console.error(`[Error code: 1437]`, e);
            (await defferedReply) && interaction.editReply({ content: "Произошла ошибка. Администрация выдаст роль вручную" });
        });
    },
};
