import { ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from "discord.js";
import { BungieTwitterAuthor } from "../../../configs/BungieTwitterAuthor.js";
import { TwitterButtons } from "../../../configs/Buttons.js";
import { client } from "../../../index.js";
import { TwitterAccountNames, TwitterEmbedGeneratorProps } from "../../../interfaces/Twitter.js";
import { updateLatestTweetInfoInDatabase } from "../../api/rssHandler.js";
import translateDestinyText from "../../api/translateDestinyText.js";
import { addButtonsToMessage } from "../../general/addButtonsToMessage.js";
import { uploadImageToImgur } from "../../general/uploadImageToImgur.js";
import { lastTwitterPublishedPosts, originalTweetData, processedRssLinks, twitterOriginalVoters } from "../../persistence/dataStore.js";
import { isNitterUrlAllowed } from "./isNitterUrlAllowed.js";
import convertMp4ToGif from "./mp4IntoGif.js";
import resolveAuthor from "./resolveAuthor.js";
import { processTwitterGifFile } from "./saveGifInChannel.js";

let publicNewsChannel: TextChannel | null = null;

const originalButton = new ButtonBuilder().setCustomId(TwitterButtons.showOriginal).setLabel("Оригинал").setStyle(ButtonStyle.Secondary);

function extractMediaUrls(content: string | undefined, preferable: "image" | "video" = "image"): string[] {
	if (!content) return [];

	const imgRegex = /(https?:\/\/[^"\s]*?(?:png|jpg|jpeg|gif)(?:&amp;[^"\s]*)?)|(https?:\/\/[^"\s]+?\/pic\/enc\/[a-zA-Z0-9\-_=]+)/g;
	const videoRegex = /(https?:\/\/[^"]*?\.mp4[^"]*)|(https:\/\/video\.twimg\.com\/amplify_video\/\d+\/vid\/.*?\.(mp4|gif))/g;

	let matches: RegExpMatchArray | null = null;

	if (preferable === "image") {
		matches = content.match(imgRegex);
	} else if (preferable === "video") {
		matches = content.match(videoRegex);
	}

	return matches || [];
}

function clearText(content: string): string {
	return content
		.replace(/^R to @[^:]+: /, "") // Remove "R to @DynamicTag: " at the start
		.replace(/&nbsp;/g, " ")
		.replace(/<br\s*\/?>/gi, "") // HTML <br> tags to new lines
		.replace(/&gt;/gi, ">") // HTML entities to corresponding characters
		.replace(/&lt;/gi, "<")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&apos;/gi, "'")
		.replace(/<div class="rsshub-quote">[\s\S]*?<\/div>|<[^>]*>/g, "")
		.replace(/<div class="rsshub-quote">[\s\S]*?<\/div>|<[^>]*>|https:\/\/t\.co\/\S+|https:\/\/twitter\.com\/i\/web\/status\/\S+/g, "")
		.replace(/nitter\.[^ \n]+/g, "") // Remove URLs starting with "nitter."
		.replace(/^Re /, "") // Remove "Re " at the start
		.replace(/^ +/gm, (match) => "\u00A0".repeat(match.length)) // Replace leading spaces at the start of each line with non-breaking spaces
		.replace(/ ?⏵\s*\[\[\d+\]\]\((https?:\/\/[^\)]+)\)/g, "")
		.trim(); // Trim white spaces from the beginning and end of the string
}

function getTwitterAccountNameFromAuthor(author: BungieTwitterAuthor): TwitterAccountNames | null {
	switch (author) {
		case BungieTwitterAuthor.DestinyTheGame:
			return TwitterAccountNames.DestinyTheGame;
		case BungieTwitterAuthor.Bungie:
			return TwitterAccountNames.Bungie;
		case BungieTwitterAuthor.BungieHelp:
			return TwitterAccountNames.BungieHelp;
		case BungieTwitterAuthor.Destiny2Team:
			return TwitterAccountNames.Destiny2Team;
		default:
			return null; // Return null or some default value for unmatched cases
	}
}

async function generateAndSendTwitterEmbed({
	twitterData,
	author,
	icon,
	url,
	originalEmbed,
	content,
	images,
}: TwitterEmbedGeneratorProps): Promise<void> {
	if (!twitterData) {
		console.error("[Error code: 2103] Passed empty twitter data", author, icon, content);
		return;
	}

	try {
		const cleanContent = clearText(twitterData);

		if (!cleanContent || cleanContent.length === 0) {
			console.error("[Error code: 1754]", twitterData);
			return;
		}

		let components: ButtonBuilder[] = [];

		const extractedMediaUrls = extractMediaUrls(content).concat(images || []);

		// console.debug(`Extracted media:", extractedMediaUrls);

		const replacedDescription = replaceTimeWithEpoch(cleanContent);

		let tranlsatedContent: string | null = "";
		try {
			const translateRequest = await translateDestinyText(replacedDescription);
			if (translateRequest && translateRequest.length > 1 && !translateRequest.includes("You exceeded your current quota")) {
				tranlsatedContent = translateRequest;
				components = [originalButton];
			} else {
				console.error("[Error code: 1966]", translateRequest);
			}
		} catch (error) {
			console.error("[Error code: 1967]", error);
		}

		const isVxTwitter = (url || originalEmbed?.url)?.match(/vxtwitter\.com/i)?.[0];

		const embed = resolveAuthor({
			author,
			icon,
			url,
			originalAuthor: (isVxTwitter ? originalEmbed?.title : originalEmbed?.author?.name)?.replace(/\s\(@\w+\)/, ""),
		});

		if (!embed) {
			console.error("[Error code: 1998]", embed, author, icon, url);
			return;
		}

		embed.setDescription(
			tranlsatedContent && tranlsatedContent.length > 1 ? tranlsatedContent : replacedDescription.length > 0 ? replacedDescription : null
		);

		const embeds = [embed];

		if (extractedMediaUrls.length > 0) {
			const embedURL = url ? url : `https://x.com/${getTwitterAccountNameFromAuthor(author)}`;

			for (let i = 0; i < extractedMediaUrls.length; i++) {
				const mediaUrl = extractedMediaUrls[i];

				const imgUrl = isNitterUrlAllowed(mediaUrl)
					? mediaUrl
					: await uploadImageToImgur(mediaUrl).catch((error) => {
							console.error("[Error code: 2102] Failed to upload image to imgur", error);
							return mediaUrl;
					  });

				if (i === 0) {
					embed.setImage(imgUrl);
					if (extractedMediaUrls.length > 1) embed.setURL(embedURL);
				} else {
					embeds.push(new EmbedBuilder().setURL(embedURL).setImage(imgUrl));
				}
			}
		}

		if (!publicNewsChannel) publicNewsChannel = await client.getTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID!);

		if (url && !processedRssLinks.has(url)) {
			processedRssLinks.add(url);
			try {
				const authorName = getTwitterAccountNameFromAuthor(author);
				if (authorName) updateLatestTweetInfoInDatabase(authorName, { link: url, pubDate: new Date().toString() });
			} catch (error) {
				console.error("[Error code: 2084]", error);
			}
		}

		await publicNewsChannel.send({ embeds, components: addButtonsToMessage(components) }).then((m) => {
			if (url) {
				const postId = url.split("/").pop();
				if (postId) {
					lastTwitterPublishedPosts.set(postId, m);
					setTimeout(() => lastTwitterPublishedPosts.delete(postId), 1000 * 60 * 60);
				}
			}
			if (tranlsatedContent) {
				const voteRecord = { original: new Set<string>(), translation: new Set<string>() };
				twitterOriginalVoters.set(m.id, voteRecord);
				originalTweetData.set(m.id, cleanContent);
			}

			const extractedVideoMedia = extractMediaUrls(content, "video")[0];

			if (extractedVideoMedia && extractedVideoMedia.endsWith(".mp4")) {
				// console.debug("Converting video to gif");
				convertVideoToGifAndUpdateMessage(extractedVideoMedia, m, embed);
			}
		});
	} catch (error) {
		console.error("[Error code: 2083]", error);
		if (url && processedRssLinks.has(url)) processedRssLinks.delete(url);
	}
}

export async function convertVideoToGifAndUpdateMessage(videoUrl: string, message: Message<boolean>, embed: EmbedBuilder): Promise<void> {
	const gifUrl = await convertMp4ToGif(videoUrl);
	if (!gifUrl) return;

	processTwitterGifFile(gifUrl, message, embed);
}

/**
 * Replaces 12-hour format time in the input text with <t:SAME_TIME_SINCE_EPOCH> format.
 * The function also removes timezone information (PDT (UTC)) and converts the time to seconds.
 * It assumes the current year when considering month and day information (e.g., "April 13").
 *
 * @param {string} text - The input text containing time in 12-hour format, month, and day.
 * @returns {string} The modified text with time replaced by <t:SAME_TIME_SINCE_EPOCH> format.
 */
function replaceTimeWithEpoch(text: string): string {
	const dateRegex = /❖\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+)/i;
	const dateMatch = text.match(dateRegex);

	let month = 0;
	let day = 0;
	let setDate = false;

	if (dateMatch) {
		const [_, dateStr] = dateMatch;
		const dateParts = dateStr.split(" ");
		const monthStr = dateParts[0].toLowerCase();
		day = parseInt(dateParts[1], 10);

		const monthNames = [
			"january",
			"february",
			"march",
			"april",
			"may",
			"june",
			"july",
			"august",
			"september",
			"october",
			"november",
			"december",
		];
		month = monthNames.indexOf(monthStr);
		setDate = true;
	}

	const timeRegex =
		/(\d{1,2})(:)?(\d{2})?\s?(AM|PM)(\s?PDT\s?\(-7\s?UTC\)|\s?PST\s?\(\d{4}\s?UTC\)|\s?PST\s?\(-7\s?UTC\)|\s?PT|\s?PDT|\s?PST\s?\(-8\s?UTC\)|\s?PST)?/gi;

	const replacement = (_: string, hour: string, __: string, minute: string, amPm: string, timezone: string) => {
		let hourNumber = parseInt(hour, 10);
		const minuteNumber = parseInt(minute || "0", 10);

		if (amPm.toUpperCase() === "PM" && hourNumber !== 12) {
			hourNumber += 12;
		} else if (amPm.toUpperCase() === "AM" && hourNumber === 12) {
			hourNumber = 0;
		}

		if (timezone && timezone.includes("PST")) {
			hourNumber += 8;
		} else {
			hourNumber += 7;
		}

		const date = new Date();
		if (setDate) {
			date.setFullYear(date.getFullYear(), month, day);
		}
		date.setHours(hourNumber, minuteNumber, 0, 0);

		const timeSinceEpoch = Math.floor(date.getTime() / 1000);
		return setDate ? `<t:${timeSinceEpoch}>` : `<t:${timeSinceEpoch}:t>`;
	};

	return text.replace(timeRegex, replacement);
}

export { generateAndSendTwitterEmbed };
