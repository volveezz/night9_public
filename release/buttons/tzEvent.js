import { EmbedBuilder } from "discord.js";
import { AuthData } from "../handlers/sequelize.js";
import colors from "../configs/colors.js";
import nameCleaner from "../functions/nameClearer.js";
export default {
    name: "tzEvent",
    run: async ({ client, selectMenu: interaction }) => {
        const deferredInteraction = interaction.deferUpdate();
        const timezone = interaction.values[0];
        const member = interaction.member ? interaction.member : client.getCachedMembers().get(interaction.user.id);
        const embed = new EmbedBuilder().setTitle(`Вы установили +${timezone} как свой часовой пояс`).setColor(colors.success);
        AuthData.update({ timezone: parseInt(timezone) }, { where: { discordId: interaction.user.id } }).catch((e) => console.error(`[Error code: 1042] Error during update tz of ${interaction.user.username}, ${timezone}`, e));
        if (member && !member.permissions.has("Administrator")) {
            member.setNickname(`[+${timezone}] ${nameCleaner(member.displayName)}`);
        }
        (await deferredInteraction) && interaction.editReply({ embeds: [embed], components: [] });
    },
};
