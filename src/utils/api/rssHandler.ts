import Parser, { Item } from "rss-parser";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { LatestTweetInfo, TwitterAccount, TwitterAccountNames } from "../../interfaces/Twitter.js";
import { generateAndSendTwitterEmbed } from "../discord/twitterHandler/twitterMessageParser.js";
import { pause } from "../general/utilities.js";
import { processedRssLinks } from "../persistence/dataStore.js";
import { redisClient } from "../persistence/redis.js";

const parser = new Parser();

const createTwitterAccountUrl = (accountName: string) => {
	return `https://twiiit.com/${accountName}/rss`;
};

const rssUrls = {
	BungieHelp: createTwitterAccountUrl(TwitterAccountNames.BungieHelp),
	Bungie: createTwitterAccountUrl(TwitterAccountNames.Bungie),
	DestinyTheGame: createTwitterAccountUrl(TwitterAccountNames.DestinyTheGame),
	Destiny2Team: createTwitterAccountUrl(TwitterAccountNames.Destiny2Team),
};

function rehostLink(link: string): string {
	if (link.includes("https://twitter.com/")) return link;

	try {
		const urlObj = new URL(link);
		const paths = urlObj.pathname.split("/");
		if (paths.length < 3) {
			console.error("[Error code: 2056] Invalid Link Format");
			return link;
		}

		const userName = paths[1];
		const statusId = paths[3]?.split("#")[0]; // Correcting the index to get status ID
		if (!statusId) {
			console.error("[Error code: 2056] No Status ID found");
			return link;
		}
		return `https://twitter.com/${userName}/status/${statusId}`;
	} catch (error) {
		console.error("[Error code: 1710] Invalid Link:", link);
		return link; // return the original link if there is an error
	}
}

async function fetchAndSendLatestTweets(
	url: string,
	latestTweetInfo: LatestTweetInfo | undefined,
	routeName: TwitterAccountNames,
	isRetry = false
): Promise<LatestTweetInfo | undefined> {
	try {
		const feed = await parser.parseURL(url).catch(async (_) => {
			if (!isRetry) {
				await pause(10000);
				fetchAndSendLatestTweets(url, latestTweetInfo, routeName, true);
			} else {
				console.error("[Error code: 2077] Failed to fetch RSS feed twice");
			}
		});

		if (!feed || !feed.items || feed.items.length < 2) {
			return latestTweetInfo;
		}

		if (!latestTweetInfo && feed.items[0].link && feed.items[0].pubDate) {
			const correctedLink = rehostLink(feed.items[0].link);
			return { link: correctedLink, pubDate: feed.items[0].pubDate };
		} else if (!latestTweetInfo && (!feed.items[0].link || !feed.items[0].pubDate)) {
			console.error("[Error code: 2079] Invalid feed item", feed.items[0]);
			return undefined;
		} else if (!latestTweetInfo) {
			console.error("[Error code: 2080] Latest tweet info wasn't found", feed.items[0]);
			return undefined;
		}

		let finalInfo: LatestTweetInfo | undefined;

		const newTweets = [];

		for (const entry of feed.items) {
			if (!entry.link) {
				break;
			}

			if (!entry.pubDate) {
				console.error("[Error code: 2078] Pub date wasn't found in the tweet info", entry);
				break;
			}

			// Check if the entry is newer than the latest saved tweet
			if (latestTweetInfo && new Date(entry.pubDate) <= new Date(latestTweetInfo.pubDate)) {
				break;
			}

			const correctedLink = rehostLink(entry.link);

			if (correctedLink === latestTweetInfo.link || processedRssLinks.has(correctedLink)) {
				break;
			}

			if (isRetweet(entry)) continue;

			processedRssLinks.add(correctedLink);

			finalInfo = {
				link: correctedLink,
				pubDate: entry.pubDate,
			};

			const author = getBungieTwitterAuthor(entry.creator);
			if (author && isValidTweet(author, entry.guid) && entry.content && entry.content.length > 0) {
				const content = entry.title ? entry.title : entry.content ? entry.content : entry.contentSnippet;

				if (!content) continue;

				const params = {
					twitterData: content,
					content: entry.content,
					author,
					icon: feed.image?.url,
					url: correctedLink,
				};

				newTweets.push(params);
			} else {
				console.error("[Error code: 1705]", entry, author, author && isValidTweet(author, entry.guid), entry.content?.length);
			}
		}

		if (newTweets.length > 0) {
			for (const params of newTweets.reverse()) {
				await generateAndSendTwitterEmbed(params);
			}
		}

		if (finalInfo) {
			await updateLatestTweetInfoInDatabase(routeName, finalInfo);
			return finalInfo;
		}
	} catch (error) {
		console.error("[Error code: 1704] Error fetching RSS feed:", error);
	}
	return latestTweetInfo;
}

export async function updateLatestTweetInfoInDatabase(route: TwitterAccountNames, info: LatestTweetInfo) {
	await redisClient.set(route, JSON.stringify(info));
}

async function getLatestTweetInfoFromDatabase(route: TwitterAccountNames): Promise<LatestTweetInfo | undefined> {
	const record = await redisClient.get(route);
	return record ? JSON.parse(record) : undefined;
}

function getBungieTwitterAuthor(creator: string | undefined): BungieTwitterAuthor | null {
	switch (creator) {
		case "Destiny 2":
		case "@DestinyTheGame":
			return BungieTwitterAuthor.DestinyTheGame;
		case "Bungie":
		case "@Bungie":
			return BungieTwitterAuthor.Bungie;
		case "Bungie Help":
		case "@BungieHelp":
			return BungieTwitterAuthor.BungieHelp;
		case "Destiny 2 Team":
		case "@Destiny2Team":
			return BungieTwitterAuthor.Destiny2Team;
		default:
			return null;
	}
}

function isRetweet(item: Item) {
	const retweetPattern = /^RT/;

	if (!item.content || !item.contentSnippet) {
		console.error("[Error code: 1709]", item);
		return true;
	}

	if (retweetPattern.test(item.content || item.contentSnippet) || (item.title && retweetPattern.test(item.title))) {
		return true;
	}
	return false;
}

function isValidTweet(author: BungieTwitterAuthor, guid: string | undefined): boolean {
	if (!guid) return false;
	const guidLowerCase = guid.toLowerCase();

	const isValidAuthor =
		(author === BungieTwitterAuthor.Bungie && guidLowerCase.includes("/bungie/")) ||
		(author === BungieTwitterAuthor.BungieHelp && guidLowerCase.includes("/bungiehelp/")) ||
		(author === BungieTwitterAuthor.DestinyTheGame && guidLowerCase.includes("/destinythegame/")) ||
		(author === BungieTwitterAuthor.Destiny2Team && guidLowerCase.includes("/destiny2team/"));

	return isValidAuthor;
}

const twitterAccounts: TwitterAccount[] = [
	{
		name: TwitterAccountNames.BungieHelp,
		interval: 1000 * 60 * 15 * 1,
		rssUrl: rssUrls.BungieHelp,
	},
	{
		name: TwitterAccountNames.Destiny2Team,
		interval: 1000 * 60 * 15 * 3,
		rssUrl: rssUrls.Destiny2Team,
	},
	{
		name: TwitterAccountNames.Bungie,
		interval: 1000 * 60 * 15 * 4,
		rssUrl: rssUrls.Bungie,
	},
	{
		name: TwitterAccountNames.DestinyTheGame,
		interval: 1000 * 60 * 15 * 2,
		rssUrl: rssUrls.DestinyTheGame,
	},
];

export async function startRssFetcher() {
	console.info("[RSS Feed] Starting RSS feed fetcher");

	const fetchAndReschedule = async (account: TwitterAccount) => {
		const request = await fetchAndSendLatestTweets(account.rssUrl, account.latestTweetInfo, account.name);

		if (request) account.latestTweetInfo = request;

		// Recursive setTimeout
		setTimeout(fetchAndReschedule, account.interval, account);
	};

	for (let account of twitterAccounts) {
		account.latestTweetInfo = await getLatestTweetInfoFromDatabase(account.name);

		if (!account.latestTweetInfo) {
			console.error("[Error code: 2082] Didn't found a latest tweet info for", account.name);

			const request = await fetchAndSendLatestTweets(account.rssUrl, account.latestTweetInfo, account.name);
			if (request) account.latestTweetInfo = request;
		}

		fetchAndReschedule(account);
	}
}
