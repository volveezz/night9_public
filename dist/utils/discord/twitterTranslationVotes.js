import { EmbedBuilder } from "discord.js";
import { client } from "../../index.js";
import { originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
async function calculateVoteResults() {
    const channel = await client.getAsyncTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
    for (const [messageId, { original, translation }] of twitterOriginalVoters) {
        try {
            if ((original.size === 0 && translation.size === 0) || original.size <= translation.size) {
                await removeComponents();
            }
            else {
                const originalText = originalTweetData.get(messageId);
                if (!originalText) {
                    await removeComponents();
                    continue;
                }
                const message = await channel.messages.fetch(messageId);
                const embed = EmbedBuilder.from(message.embeds[0]).setDescription(originalText);
                await (await channel.messages.fetch(messageId)).edit({ components: [], embeds: [embed] });
            }
            async function removeComponents() {
                await (await channel.messages.fetch(messageId)).edit({ components: [] });
            }
        }
        catch (error) {
            console.error("[Error code: 1968]", error);
        }
    }
    twitterOriginalVoters.clear();
}
export default calculateVoteResults;
//# sourceMappingURL=twitterTranslationVotes.js.map