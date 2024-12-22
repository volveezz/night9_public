import { ChannelType, Embed, EmbedBuilder, Message } from "discord.js";
import { BungieTwitterAuthor } from "../../../configs/BungieTwitterAuthor.js";
import { pause } from "../../general/utilities.js";
import { lastTwitterPublishedPosts, processedRssLinks } from "../../persistence/dataStore.js";
import { convertVideoToGifAndUpdateMessage, generateAndSendTwitterEmbed } from "./twitterMessageParser.js";

async function parseTwitterLinkMessage(message: Message<boolean>) {
	if (message.author.bot) {
		// console.debug(`Found a new automated twitter message. It is", message.content.startsWith("[⏵]"));
		if (message.content.startsWith("[⏵]")) {
			// console.debug(`Starting to process attachment-type message");
			await processTwitterAttachment(message);
		} else if (message.embeds?.length > 0) {
			// If sent by bot, directly process the embeds
			await processEmbeds(message.embeds);
		}
	} else {
		// If sent by a user, wait for embeds to generate
		let attempts = 0;
		let fetchedMessage = message;

		while (fetchedMessage.embeds.length === 0 && attempts < 5) {
			await pause(attempts * 500 + 500); // Increase the pause time with each attempt
			try {
				fetchedMessage = await message.fetch();
			} catch (error) {
				console.error(`[Error code: 2051] Failed to fetch message ${message.id}`, error);
				return;
			}
			attempts++;
		}
		await processEmbeds(fetchedMessage.embeds);
	}

	async function processEmbeds(embeds: Embed[]) {
		const urlToImagesMap: Map<string, string[]> = new Map();

		// Group images by embed url
		for (const embed of embeds) {
			const url = embed.url;
			if (!url) continue;

			const imageUrl =
				(embed.thumbnail && embed.thumbnail.url.match(/profile_images/i)?.[0] ? embed.image?.url : embed.thumbnail?.url) ||
				embed.image?.url;

			const imagesUrls = urlToImagesMap.get(url);
			if (imagesUrls && imageUrl) {
				imagesUrls.push(imageUrl);
			} else {
				urlToImagesMap.set(url, imageUrl ? [imageUrl] : []);
			}
		}

		// Process the grouped images
		for (const [url, images] of urlToImagesMap.entries()) {
			if (processedRssLinks.has(url)) continue;

			const associatedEmbed = embeds.find((e) => e.url === url);
			if (associatedEmbed && associatedEmbed.description) {
				const isVxTwitter = message.content.match(/vxtwitter\.com/i)?.[0];
				const author = getBungieTwitterAuthor((isVxTwitter ? associatedEmbed.title : associatedEmbed.author?.name) || "none");
				let content = associatedEmbed.description;

				if (isVxTwitter) {
					content = content.replace(/\n\n💖\s*\d+/, "");
				}

				const embedAuthorIcon = associatedEmbed.thumbnail?.url.match(/profile_images/i)?.[0] && associatedEmbed.thumbnail?.url;

				await generateAndSendTwitterEmbed({
					twitterData: content,
					author,
					icon: isVxTwitter ? embedAuthorIcon : associatedEmbed.author?.iconURL,
					url,
					originalEmbed: associatedEmbed,
					images,
				});
			}
		}
	}
}

async function processTwitterAttachment(message: Message) {
	const postId = await findTwitterPostIdFromAttachmentMessage();
	// console.debug(`Extracted post id:", postId);
	if (!postId) return;

	const postData = lastTwitterPublishedPosts.get(postId);
	// console.debug(`Extracted post data:", postData?.id);
	if (!postData) return;

	const linkToVideo = message.content.match(/\]\(([^)]+)\)/)?.[1];
	// console.debug(`Extracted link:", linkToVideo, message.content);
	if (!linkToVideo) return;

	await convertVideoToGifAndUpdateMessage(linkToVideo, postData, EmbedBuilder.from(postData.embeds[0]));

	async function findTwitterPostIdFromAttachmentMessage() {
		const channel = message.channel.type === ChannelType.GuildText ? message.channel : null;
		if (!channel) return;

		const messageBefore = (await channel.messages.fetch({ before: message.id, limit: 1 })).at(0);
		if (!messageBefore || messageBefore.author.id !== message.author.id) return;

		const postId = messageBefore.content.split("/").pop();
		return postId;
	}
}

function getBungieTwitterAuthor(author: string | undefined): BungieTwitterAuthor {
	// Destiny 2 Team (@Destiny2Team) -> Destiny 2 Team
	const cleanedAuthor = author
		?.replace(/\s\(@\w+\)/, "")
		.replace("✧", "")
		.trim();

	switch (cleanedAuthor) {
		case "Destiny 2":
			return BungieTwitterAuthor.DestinyTheGame;
		case "Bungie":
			return BungieTwitterAuthor.Bungie;
		case "Bungie Help":
			return BungieTwitterAuthor.BungieHelp;
		case "Destiny 2 Team":
			return BungieTwitterAuthor.Destiny2Team;
		default:
			return BungieTwitterAuthor.Other;
	}
}

export default parseTwitterLinkMessage;
