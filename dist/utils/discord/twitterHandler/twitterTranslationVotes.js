import { EmbedBuilder } from "discord.js";
import { client } from "../../../index.js";
import { originalTweetData, twitterOriginalVoters } from "../../persistence/dataStore.js";
async function calculateVoteResults() {
    const channel = client.getCachedTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
    async function removeComponents(message) {
        message.edit({ components: [] });
    }
    const promises = Array.from(twitterOriginalVoters).map(([messageId, { original, translation }]) => {
        if ((original.size === 0 && translation.size === 0) || original.size <= translation.size) {
            const message = channel.messages.cache.get(messageId);
            return message ? removeComponents(message) : Promise.resolve();
        }
        const originalText = originalTweetData.get(messageId);
        if (!originalText) {
            const message = channel.messages.cache.get(messageId);
            return message ? removeComponents(message) : Promise.resolve();
        }
        return channel.messages
            .fetch(messageId)
            .then((message) => {
            const embed = EmbedBuilder.from(message.embeds[0]).setDescription(originalText);
            return message.edit({ components: [], embeds: [embed] });
        })
            .catch((error) => {
            console.error("[Error code: 1968] Failed to fetch message", messageId, error);
        });
    });
    await Promise.allSettled(promises);
    twitterOriginalVoters.clear();
}
export default calculateVoteResults;
//# sourceMappingURL=twitterTranslationVotes.js.map