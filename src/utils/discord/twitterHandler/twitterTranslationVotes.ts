import { EmbedBuilder, Message } from "discord.js";
import { client } from "../../../index.js";
import { originalTweetData, twitterOriginalVoters } from "../../persistence/dataStore.js";

async function calculateVoteResults() {
	const channel = client.getCachedTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID!);

	// Reuse the async function instead of re-creating it for each map iteration
	async function removeComponents(message: Message): Promise<void> {
		message.edit({ components: [] });
	}

	const promises = Array.from(twitterOriginalVoters).map(([messageId, { original, translation }]) => {
		// Remove components if there are no original and translation votes, or original votes are fewer
		if ((original.size === 0 && translation.size === 0) || original.size <= translation.size) {
			// Try to get message from cache to avoid potential fetch failure due to message deletion
			const message = channel.messages.cache.get(messageId);
			return message ? removeComponents(message) : Promise.resolve();
		}

		// Get original text from cache if available
		const originalText = originalTweetData.get(messageId);
		if (!originalText) {
			const message = channel.messages.cache.get(messageId);
			return message ? removeComponents(message) : Promise.resolve();
		}

		// Try to fetch the message and handle failure gracefully
		return channel.messages
			.fetch(messageId)
			.then((message) => {
				// Build embed and edit message in one API call
				const embed = EmbedBuilder.from(message.embeds[0]).setDescription(originalText);
				return message.edit({ components: [], embeds: [embed] });
			})
			.catch((error) => {
				// Handle fetch failure gracefully
				console.error("[Error code: 1968] Failed to fetch message", messageId, error);
			});
	});

	await Promise.allSettled(promises);
	twitterOriginalVoters.clear();
}

export default calculateVoteResults;
