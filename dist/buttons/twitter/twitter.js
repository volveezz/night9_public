import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { TwitterVoteButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../../utils/persistence/dataStore.js";
const activeAwaiters = new Map();
export default {
    name: "twitter",
    run: async ({ interaction }) => {
        const messageData = originalTweetData.get(interaction.message.id);
        if (!messageData) {
            const embed = new EmbedBuilder()
                .setColor(colors.error)
                .setAuthor({ name: "Ошибка. Оригинал сообщения не найден", iconURL: icons.error });
            interaction.reply({ embeds: [embed], ephemeral: true });
            interaction.message.edit({ components: [] });
            return;
        }
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.setDescription(messageData);
        let components = [];
        const voteData = twitterOriginalVoters.get(interaction.message.id);
        if (voteData) {
            components = [
                new ButtonBuilder()
                    .setCustomId(TwitterVoteButtons.originalBetter)
                    .setLabel("Оригинал лучше перевода")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(TwitterVoteButtons.translationBetter)
                    .setLabel("Перевод лучше оригинала")
                    .setStyle(ButtonStyle.Secondary),
            ];
        }
        const interactionReply = await interaction.reply({ embeds: [embed], components: addButtonsToMessage(components), ephemeral: true });
        const uniqueId = Symbol();
        if (!activeAwaiters.has(interaction.user.id)) {
            activeAwaiters.set(interaction.user.id, uniqueId);
        }
        const i = await interactionReply.awaitMessageComponent({
            time: 1000 * 60 * 5,
            filter: (i) => i.user.id === interaction.user.id,
        });
        if (activeAwaiters.get(interaction.user.id) !== uniqueId) {
            return;
        }
        const userId = interaction.user.id;
        const messageId = interaction.message.id;
        let vote;
        switch (i.customId) {
            case TwitterVoteButtons.originalBetter:
                vote = "originalBetter";
                break;
            case TwitterVoteButtons.translationBetter:
                vote = "translationBetter";
                break;
            default:
                return;
        }
        let voteRecord = twitterOriginalVoters.get(messageId);
        if (!voteRecord) {
            voteRecord = { original: new Set(), translation: new Set() };
            twitterOriginalVoters.set(messageId, voteRecord);
        }
        const voteEmbed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Голос учтён", iconURL: icons.voted });
        activeAwaiters.delete(interaction.user.id);
        if (vote === "originalBetter") {
            voteRecord.translation.delete(userId);
            voteRecord.original.add(userId);
            i.reply({ embeds: [voteEmbed], ephemeral: true });
        }
        else if (vote === "translationBetter") {
            voteRecord.original.delete(userId);
            voteRecord.translation.add(userId);
            i.reply({ embeds: [voteEmbed], ephemeral: true });
        }
        await interactionReply.edit({ components: [] });
    },
};
//# sourceMappingURL=twitter.js.map