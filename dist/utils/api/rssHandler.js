import Parser from "rss-parser";
import { generateTwitterEmbed } from "../discord/twitterHandler/twitterMessageParser.js";
import { processedRssLinks } from "../persistence/dataStore.js";
import { redisClient } from "../persistence/redis.js";
const parser = new Parser();
const hostUrl = "twiiit.com";
const createTwitterAccountUrl = (accountName) => {
    return `http://${hostUrl}/${accountName}/rss`;
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
async function fetchAndSendLatestTweets(url, latestLink, routeName) {
    try {
        const feed = await parser.parseURL(url).catch((e) => {
            console.error("[Error code: 1706] Error fetching RSS feed:", e.message, e.name, url.split("/")?.[5]);
            return;
        });
        if (!feed || !feed.items || feed.items.length < 2)
            return latestLink;
        if (!latestLink) {
            return feed.items[0].link;
        }
        let finalLink;
        for (const entry of feed.items) {
            if (!entry.link) {
                break;
            }
            const correctedLink = rehostLink(entry.link);
            if (correctedLink === latestLink || processedRssLinks.has(correctedLink)) {
                break;
            }
            if (isRetweet(entry))
                continue;
            processedRssLinks.add(correctedLink);
            finalLink = correctedLink;
            const author = getBungieTwitterAuthor(entry.creator);
            if (author && isValidTweet(author, entry.guid) && entry.content && entry.content.length > 0) {
                await generateTwitterEmbed({
                    twitterData: entry.title ? { content: entry.title } : entry.contentSnippet ? { content: entry.contentSnippet } : entry,
                    author,
                    icon: feed.image?.url,
                    url: correctedLink,
                });
            }
            else {
                console.error("[Error code: 1705]", entry, author, author && isValidTweet(author, entry.guid), entry.content?.length);
            }
        }
        if (finalLink) {
            await updateLatestLinkInDatabase(routeName, finalLink);
            return finalLink;
        }
    }
    catch (error) {
        console.error("[Error code: 1704] Error fetching RSS feed:", error);
    }
    return latestLink;
}
async function updateLatestLinkInDatabase(route, link) {
    await redisClient.set(route, link);
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
    console.debug("Starting rssHandler");
    const fetchAndReschedule = async (account) => {
        const request = await fetchAndSendLatestTweets(account.rssUrl, account.latestTweetLink, account.name);
        if (request)
            account.latestTweetLink = request;
        setTimeout(fetchAndReschedule, account.interval, account);
    };
    for (let account of twitterAccounts) {
        account.latestTweetLink = await getLatestLinkFromDatabase(account.name);
        console.debug(`Latest link for ${account.name}:`, account.latestTweetLink);
        if (!account.latestTweetLink) {
            const request = await fetchAndSendLatestTweets(account.rssUrl, account.latestTweetLink, account.name);
            if (request)
                account.latestTweetLink = request;
        }
        fetchAndReschedule(account);
    }
})();
async function getLatestLinkFromDatabase(route) {
    try {
        const record = await redisClient.get(route);
        return record || undefined;
    }
    catch (error) {
        console.error(`[Error code: 1946] Error retrieving the latest link from the database for route ${route}:`, error);
    }
}
//# sourceMappingURL=rssHandler.js.map