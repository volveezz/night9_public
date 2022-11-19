import { EmbedBuilder } from "discord.js";
import { longOffline } from "../features/full_checker.js";
export default {
    name: "wasibanned",
    description: "Проверьте свой статус бана",
    callback: async (_client, interaction, _member, _guild, _channel) => {
        const embed = new EmbedBuilder();
        const banned = longOffline.has(interaction.user.id)
            ? {
                text: "Да. Вы забанены",
                message: `Причина бана: долгое отсутствие в игре (более 1 часа)\n\nВместе с вами в бане находится: ${longOffline.size} участников`,
            }
            : { text: "Вы не в бане :)" };
        embed.setTitle(banned.text);
        banned.message ? embed.setDescription(banned.message).setColor("Red") : embed.setColor("Green");
        interaction.reply({ embeds: [embed] });
    },
};
