import { EmbedBuilder } from "discord.js";
import { BotClient } from "../index.js";
import { guildId } from "../base/ids.js";
import { auth_data } from "../handlers/sequelize.js";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        const deferredInteraction = interaction.deferUpdate();
        const embed = new EmbedBuilder();
        const tz = interaction.values[0];
        embed.setTitle(`Вы установили +${tz} как свой часовой пояс`).setColor("Green");
        await auth_data
            .update({ tz: tz }, { where: { discord_id: interaction.user.id } })
            .catch((e) => console.error(`[Error code: 1042] Error during update tz of ${interaction.user.username}, ${tz}`, e));
        const member = BotClient.guilds.cache.get(guildId).members.cache.get(interaction.user.id);
        if (member) {
            const nickName = member.displayName;
            !member.permissions.has("Administrator") ? member.setNickname(`[+${tz}] ${nickName.replace(/\[[+](?:\d|\d\d)]\s?/, "").trim()}`) : [];
        }
        await deferredInteraction;
        interaction.editReply({ embeds: [embed], components: [] });
    },
};
