import Parser from "rss-parser";
import { generateTwitterEmbed } from "../discord/twitterHandler/twitterMessageParser.js";
import { processedRssLinks } from "../persistence/dataStore.js";
import { redisClient } from "../persistence/redis.js";
const parser = new Parser();
const createTwitterAccountUrl = (accountName) => {
    return `https://twiiit.com/${accountName}/rss`;
};
const rssUrls = {
    BungieHelp: createTwitterAccountUrl("bungiehelp"),
    Bungie: createTwitterAccountUrl("bungie"),
    DestinyTheGame: createTwitterAccountUrl("destinythegame"),
    Destiny2Team: createTwitterAccountUrl("destiny2team"),
};
function rehostLink(link) {
    if (link.includes("https://twitter.com/"))
        return link;
    try {
        const urlObj = new URL(link);
        const paths = urlObj.pathname.split("/");
        if (paths.length < 3) {
            console.error("[Error code: 2056] Invalid Link Format");
            return link;
        }
        const userName = paths[1];
        const statusId = paths[3]?.split("#")[0];
        if (!statusId) {
            console.error("[Error code: 2056] No Status ID found");
            return link;
        }
        return `https://twitter.com/${userName}/status/${statusId}`;
    }
    catch (error) {
        console.error("[Error code: 1710] Invalid Link:", link);
        return link;
    }
}
async function fetchAndSendLatestTweets(url, latestTweetInfo, routeName, isRetry = false) {
    try {
        const feed = await parser.parseURL(url).catch((e) => {
            console.error("[Error code: 1706] Error fetching RSS feed:", e.message, url);
            if (!isRetry) {
                console.info("Retrying another RSS request...");
                fetchAndSendLatestTweets(url, latestTweetInfo, routeName, true);
            }
            else {
                console.error("[Error code: 2077] Failed to fetch RSS feed twice");
            }
            return;
        });
        if (!feed || !feed.items || feed.items.length < 2) {
            return latestTweetInfo;
        }
        if (!latestTweetInfo && feed.items[0].link && feed.items[0].pubDate) {
            const correctedLink = rehostLink(feed.items[0].link);
            return { link: correctedLink, pubDate: feed.items[0].pubDate };
        }
        else if (!latestTweetInfo && (!feed.items[0].link || !feed.items[0].pubDate)) {
            console.error("[Error code: 2079] Invalid feed item", feed.items[0]);
            return undefined;
        }
        else if (!latestTweetInfo) {
            console.error("[Error code: 2080] Latest tweet info wasn't found", feed.items[0]);
            return undefined;
        }
        let finalInfo;
        for (const entry of feed.items) {
            if (!entry.link) {
                break;
            }
            if (!entry.pubDate) {
                console.error("[Error code: 2078] Pub date wasn't found in the tweet info", entry);
                break;
            }
            if (latestTweetInfo && new Date(entry.pubDate) <= new Date(latestTweetInfo.pubDate)) {
                break;
            }
            const correctedLink = rehostLink(entry.link);
            if (correctedLink === latestTweetInfo.link || processedRssLinks.has(correctedLink)) {
                break;
            }
            if (isRetweet(entry))
                continue;
            processedRssLinks.add(correctedLink);
            finalInfo = {
                link: correctedLink,
                pubDate: entry.pubDate,
            };
            const author = getBungieTwitterAuthor(entry.creator);
            if (author && isValidTweet(author, entry.guid) && entry.content && entry.content.length > 0) {
                const content = entry.title ? entry.title : entry.content ? entry.content : entry.contentSnippet;
                if (!content)
                    continue;
                const params = {
                    twitterData: content,
                    content: entry.content,
                    author,
                    icon: feed.image?.url,
                    url: correctedLink,
                };
                await generateTwitterEmbed(params);
            }
            else {
                console.error("[Error code: 1705]", entry, author, author && isValidTweet(author, entry.guid), entry.content?.length);
            }
        }
        if (finalInfo) {
            await updateLatestTweetInfoInDatabase(routeName, finalInfo);
            return finalInfo;
        }
    }
    catch (error) {
        console.error("[Error code: 1704] Error fetching RSS feed:", error);
    }
    return latestTweetInfo;
}
export async function updateLatestTweetInfoInDatabase(route, info) {
    await redisClient.set(route, JSON.stringify(info));
}
async function getLatestTweetInfoFromDatabase(route) {
    const record = await redisClient.get(route);
    return record ? JSON.parse(record) : undefined;
}
function getBungieTwitterAuthor(creator) {
    switch (creator) {
        case "Destiny 2":
        case "@DestinyTheGame":
            return 1;
        case "Bungie":
        case "@Bungie":
            return 2;
        case "Bungie Help":
        case "@BungieHelp":
            return 3;
        case "Destiny 2 Team":
        case "@Destiny2Team":
            return 4;
        default:
            return null;
    }
}
function isRetweet(item) {
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
function isValidTweet(author, guid) {
    if (!guid)
        return false;
    const guidLowerCase = guid.toLowerCase();
    const isValidAuthor = (author === 2 && guidLowerCase.includes("/bungie/")) ||
        (author === 3 && guidLowerCase.includes("/bungiehelp/")) ||
        (author === 1 && guidLowerCase.includes("/destinythegame/")) ||
        (author === 4 && guidLowerCase.includes("/destiny2team/"));
    return isValidAuthor;
}
const twitterAccounts = [
    {
        name: "bungiehelp",
        interval: 1000 * 60 * 15 * 1,
        rssUrl: rssUrls.BungieHelp,
    },
    {
        name: "destiny2team",
        interval: 1000 * 60 * 15 * 3,
        rssUrl: rssUrls.Destiny2Team,
    },
    {
        name: "bungie",
        interval: 1000 * 60 * 15 * 4,
        rssUrl: rssUrls.Bungie,
    },
    {
        name: "destinythegame",
        interval: 1000 * 60 * 15 * 2,
        rssUrl: rssUrls.DestinyTheGame,
    },
];
(async () => {
    console.info("[RSS Feed] Starting RSS feed fetcher.");
    const fetchAndReschedule = async (account) => {
        const request = await fetchAndSendLatestTweets(account.rssUrl, account.latestTweetInfo, account.name);
        if (request)
            account.latestTweetInfo = request;
        setTimeout(fetchAndReschedule, account.interval, account);
    };
    for (let account of twitterAccounts) {
        account.latestTweetInfo = await getLatestTweetInfoFromDatabase(account.name);
        if (!account.latestTweetInfo) {
            console.error("[Error code: 2082] Didn't found a latest tweet info for", account.name);
            const request = await fetchAndSendLatestTweets(account.rssUrl, account.latestTweetInfo, account.name);
            if (request)
                account.latestTweetInfo = request;
        }
        fetchAndReschedule(account);
    }
})();
//# sourceMappingURL=rssHandler.js.map