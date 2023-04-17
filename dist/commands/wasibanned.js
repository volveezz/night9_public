import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { longOffline } from "../core/userStatisticsManagement.js";
import { apiStatus } from "../structures/apiStatus.js";
import { Command } from "../structures/command.js";
export default new Command({
    name: "wasibanned",
    description: "Проверьте свой статус бана",
    descriptionLocalizations: {
        "en-GB": "Check whether your statistics are currently being checked",
        "en-US": "Check whether your statistics are currently being checked",
    },
    run: async ({ interaction }) => {
        const embed = new EmbedBuilder().setColor(colors.invisible);
        const banned = longOffline.has(interaction.user.id)
            ? {
                text: "Да. Вы забанены",
            }
            : { text: "Вы не в бане :)" };
        embed.setTitle(banned.text).setFooter({ text: `API Status: ${apiStatus.status} | Banned amount: ${longOffline.size}` });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
});
