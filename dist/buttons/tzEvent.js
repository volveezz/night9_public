import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { userTimezones } from "../core/userStatisticsManagement.js";
import { Button } from "../structures/button.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { AuthData } from "../utils/persistence/sequelize.js";
const ButtonCommand = new Button({
    name: "tzEvent",
    run: async ({ client, selectMenu: interaction }) => {
        const deferredInteraction = interaction.deferUpdate();
        const timezone = interaction.values[0];
        const member = interaction.member ? interaction.member : client.getCachedMembers().get(interaction.user.id);
        const embed = new EmbedBuilder().setTitle(`Вы установили +${timezone} как свой часовой пояс`).setColor(colors.success);
        AuthData.update({ timezone: parseInt(timezone) }, { where: { discordId: interaction.user.id } }).catch((e) => console.error(`[Error code: 1042] Error during update tz of ${interaction.user.username}, ${timezone}`, e));
        userTimezones.set(interaction.user.id, parseInt(timezone));
        if (member && !member.permissions.has("Administrator")) {
            member.setNickname(`[+${timezone}] ${nameCleaner(member.displayName)}`);
        }
        (await deferredInteraction) && interaction.editReply({ embeds: [embed], components: [] });
    },
});
export default ButtonCommand;
//# sourceMappingURL=tzEvent.js.map