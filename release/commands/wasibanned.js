import { EmbedBuilder } from "discord.js";
import { longOffline } from "../features/memberStatisticsHandler.js";
import { Command } from "../structures/command.js";
import { apiStatus } from "../structures/apiStatus.js";
import colors from "../configs/colors.js";
export default new Command({
    name: "wasibanned",
    description: "Проверьте свой статус бана",
    run: async ({ interaction }) => {
        const embed = new EmbedBuilder().setColor(colors.invisible);
        const banned = longOffline.has(interaction.user.id)
            ? {
                text: "Да. Вы забанены",
                description: `Причина бана: долгое отсутствие в игре (более 1 часа)\n\nВместе с вами в бане находится: ${longOffline.size} участников`,
            }
            : { text: "Вы не в бане :)" };
        embed.setTitle(banned.text).setFooter({ text: `API Status: ${apiStatus.status}` });
        interaction.reply({ embeds: [embed], ephemeral: true });
    },
});
