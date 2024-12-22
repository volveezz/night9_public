import { NewsArticleRssItem, NewsArticleRssResponse } from "bungie-api-ts/content";
import { ButtonBuilder, ButtonStyle, TextChannel } from "discord.js";
import { TwitterButtons } from "../../configs/Buttons.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
import { redisClient } from "../persistence/redis.js";
import { sendApiRequest } from "./sendApiRequest.js";
import translateDestinyText from "./translateDestinyText.js";

let lastArticlePubDate: number | null = null; // Initialize the last article pub date to null

const API_URL = "/Platform/Content/Rss/NewsArticles/0/?includebody=false";

async function fetchNewsArticles() {
	try {
		const { NewsArticles: currentArticles } = await sendApiRequest<NewsArticleRssResponse>(API_URL);

		if (!currentArticles || currentArticles.length <= 0) {
			console.error("[Error code: 1944] Invalid response from Bungie API");
			return;
		}

		if (!lastArticlePubDate) {
			const redisData = await redisClient.get("lastArticlePubDate");

			if (!redisData) {
				console.error("[Error code: 2037] No last article pub date found in Redis. Setting to current date");
			}

			lastArticlePubDate = redisData ? parseInt(redisData) : new Date().getTime();
		}

		// Check for new articles
		if (new Date(currentArticles[0].PubDate).getTime() > lastArticlePubDate) {
			const newArticles = getNewArticles(currentArticles, lastArticlePubDate);

			// Post new articles to Discord channel
			await postArticlesToDiscord(newArticles);
		}
	} catch (error: any) {
		console.error(`[Error code: 1935] Received ${error.statusCode} error during news fetch`);
	} finally {
		const delay = timeLeftToNext01Second();

		setTimeout(fetchNewsArticles, delay);
	}
}

function timeLeftToNext01Second(): number {
	const currentDate = new Date();
	const currentSeconds = currentDate.getSeconds();
	const currentMilliseconds = currentDate.getMilliseconds();

	// If we're already at the :01 second mark, calculate the time for the next minute
	if (currentSeconds === 1 && currentMilliseconds === 0) {
		return 60 * 1000 - currentMilliseconds;
	}

	// If we haven't yet reached the :01 second mark
	if (currentSeconds < 1) {
		return 1 * 1000 - currentMilliseconds;
	}

	// If we've passed the :01 second mark
	return (60 - currentSeconds) * 1000 + 1 * 1000 - currentMilliseconds;
}

function getNewArticles(currentArticles: NewsArticleRssItem[], lastArticlePubDate: number): NewsArticleRssItem[] {
	return currentArticles.filter((article) => {
		const articleDate = new Date(article.PubDate).getTime();
		return articleDate > lastArticlePubDate;
	});
}

let newsChannel: TextChannel | null = null;

const showOriginalButton = addButtonsToMessage([
	new ButtonBuilder().setCustomId(TwitterButtons.showOriginal).setLabel("Оригинал").setStyle(ButtonStyle.Secondary),
]);

async function postArticlesToDiscord(articles: NewsArticleRssItem[]) {
	for (const article of articles) {
		let translatedDescription: string | null = null;
		let isButtonNeeded: boolean = false;

		if (article.Description && article.Description.trim() !== "") {
			try {
				translatedDescription = await translateDestinyText(article.Description);
				if (translatedDescription && translatedDescription !== article.Description) {
					isButtonNeeded = true;
				}
			} catch (error) {
				console.error("[Error code: 1981]", error);
			}
		}

		const embed = {
			title: article.Title,
			url: `https://www.bungie.net${article.Link}`,
			...((translatedDescription && translatedDescription.length > 1) || (article.Description && article.Description.length > 1)
				? { description: translatedDescription || article.Description }
				: {}),
			image: {
				url: article.ImagePath,
			},
			color: 65535,
		};

		try {
			if (!newsChannel) newsChannel = await client.getTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID!);

			lastArticlePubDate = new Date(article.PubDate).getTime();
			try {
				redisClient.set("lastArticlePubDate", lastArticlePubDate).then(() => {
					// console.debug(`[News] Last article pub date set to ${lastArticlePubDate}`);
				});
			} catch (error: any) {
				console.error("[Error code: 2009] Error happened while setting lastArticlePubDate in Redis", error.stack || error);
			}
			await newsChannel.send({ embeds: [embed], components: isButtonNeeded ? showOriginalButton : undefined }).then((message) => {
				if (translatedDescription) {
					const voteRecord = { original: new Set<string>(), translation: new Set<string>() };
					twitterOriginalVoters.set(message.id, voteRecord);
					originalTweetData.set(message.id, article.Description);
				}
			});
		} catch (error) {
			console.error("[Error code: 1936] Error posting article to Discord:", error);
		}
	}
}

export default fetchNewsArticles;
