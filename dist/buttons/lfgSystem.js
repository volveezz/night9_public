import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { createdChannelsMap } from "../utils/discord/lfgSystem/handleLFG.js";
import { deleteLfgData } from "../utils/discord/lfgSystem/handleLfgJoin.js";
export default {
    name: "lfgSystem",
    run: async ({ interaction }) => {
        let keyValueBasedOnMessageId;
        for (let [key, value] of createdChannelsMap.entries()) {
            if (value.message.id === interaction.message.id) {
                keyValueBasedOnMessageId = { key, value };
                break;
            }
        }
        if (!keyValueBasedOnMessageId) {
            console.error("[Error code: 1815]", interaction.message.id, createdChannelsMap.entries(), keyValueBasedOnMessageId);
            const embed = new EmbedBuilder().setColor(colors.error).setAuthor({ name: "Ошибка. Сбор не найден", iconURL: icons.error });
            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        if (keyValueBasedOnMessageId.value.author !== interaction.user.id) {
            const member = await client.getAsyncMember(interaction.user.id);
            if (!member || !member.permissions.has("Administrator")) {
                const embed = new EmbedBuilder().setColor(colors.error).setAuthor({ name: "Ошибка. Недостаточно прав", iconURL: icons.error });
                interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
        }
        deleteLfgData(keyValueBasedOnMessageId.key);
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сбор удален", iconURL: icons.success });
        await deferredReply;
        await interaction.editReply({ embeds: [embed] });
        return;
    },
};
