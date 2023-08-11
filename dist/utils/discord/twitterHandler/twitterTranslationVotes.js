import { EmbedBuilder } from "discord.js";
import { client } from "../../../index.js";
import { originalTweetData, twitterOriginalVoters } from "../../persistence/dataStore.js";
async function calculateVoteResults() {
    const channel = client.getCachedTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
    const promises = Array.from(twitterOriginalVoters).map(async ([messageId, { original, translation }]) => {
        try {
            const message = await channel.messages.fetch(messageId);
            if ((original.size === 0 && translation.size === 0) || original.size <= translation.size) {
                await removeComponents(message);
            }
            else {
                const originalText = originalTweetData.get(messageId);
                if (!originalText) {
                    await removeComponents(message);
                    return;
                }
                const embed = EmbedBuilder.from(message.embeds[0]).setDescription(originalText);
                await message.edit({ components: [], embeds: [embed] });
            }
            async function removeComponents(message) {
                await message.edit({ components: [] });
            }
        }
        catch (error) {
            console.error("[Error code: 1968]", error);
        }
    });
    await Promise.all(promises);
    twitterOriginalVoters.clear();
}
export default calculateVoteResults;
//# sourceMappingURL=twitterTranslationVotes.js.map