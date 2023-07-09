import Parser from "rss-parser";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { generateTwitterEmbed } from "../discord/twitterMessageParser.js";
import { processedRssLinks } from "../persistence/dataStore.js";
import { ProcessedLink } from "../persistence/sequelize.js";
const parser = new Parser();
const hostUrl = "rsshub-production-e9d1.up.railway.app";
const readable = 0;
var TwitterAccountNames;
(function (TwitterAccountNames) {
    TwitterAccountNames["BungieHelp"] = "bungiehelp";
    TwitterAccountNames["Bungie"] = "bungie";
    TwitterAccountNames["DestinyTheGame"] = "destinythegame";
    TwitterAccountNames["Destiny2Team"] = "destiny2team";
})(TwitterAccountNames || (TwitterAccountNames = {}));
const createTwitterAccountUrl = (accountName, limit) => `https://${hostUrl}/twitter/user/${accountName}?readable=${readable}&limit=${limit}`;
const rssUrls = {
    BungieHelp: createTwitterAccountUrl(TwitterAccountNames.BungieHelp, 10),
    Bungie: createTwitterAccountUrl(TwitterAccountNames.Bungie, 5),
    DestinyTheGame: createTwitterAccountUrl(TwitterAccountNames.DestinyTheGame, 5),
    Destiny2Team: createTwitterAccountUrl(TwitterAccountNames.Destiny2Team, 10),
};
async function fetchAndSendLatestTweets(url, latestLink, routeName) {
    try {
        const feed = await parser.parseURL(url).catch((e) => {
            console.error("[Error code: 1706] Error fetching RSS feed:", e.message, e.status, url.split("/")?.[5]);
            return;
        });
        if (!feed || !feed.items || feed.items.length < 2)
            return latestLink;
        if (!latestLink) {
            return feed.items[0].link;
        }
        let finalLink;
        for (const entry of feed.items) {
            if (!entry.link || entry.link === latestLink || processedRssLinks.has(entry.link)) {
                break;
            }
            if (isRetweet(entry))
                continue;
            processedRssLinks.add(entry.link);
            finalLink = entry.link;
            const author = getBungieTwitterAuthor(entry.creator);
            if (author && isValidTweet(author, entry.guid) && entry.content && entry.content.length > 0) {
                generateTwitterEmbed(entry, author, feed.image?.url);
            }
            else {
                console.error("[Error code: 1705]", entry);
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
    await ProcessedLink.upsert({
        route,
        link,
    });
}
function getBungieTwitterAuthor(creator) {
    switch (creator) {
        case "Destiny 2":
            return BungieTwitterAuthor.DestinyTheGame;
        case "Bungie":
            return BungieTwitterAuthor.Bungie;
        case "Bungie Help":
            return BungieTwitterAuthor.BungieHelp;
        case "Destiny 2 Team":
            return BungieTwitterAuthor.Destiny2Team;
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
    if (retweetPattern.test(item.content || item.contentSnippet)) {
        return true;
    }
    return false;
}
function isValidTweet(author, guid) {
    if (!guid)
        return false;
    const guidLowerCase = guid.toLowerCase();
    return ((author === BungieTwitterAuthor.Bungie && guidLowerCase.startsWith("https://twitter.com/bungie/")) ||
        (author === BungieTwitterAuthor.BungieHelp && guidLowerCase.startsWith("https://twitter.com/bungiehelp/")) ||
        (author === BungieTwitterAuthor.DestinyTheGame && guidLowerCase.startsWith("https://twitter.com/destinythegame/")) ||
        (author === BungieTwitterAuthor.Destiny2Team && guidLowerCase.startsWith("https://twitter.com/destiny2team/")));
}
const twitterAccounts = [
    {
        name: TwitterAccountNames.BungieHelp,
        interval: 1000 * 50,
        rssUrl: rssUrls.BungieHelp,
    },
    {
        name: TwitterAccountNames.Destiny2Team,
        interval: 1000 * 58,
        rssUrl: rssUrls.Destiny2Team,
    },
    {
        name: TwitterAccountNames.Bungie,
        interval: 1000 * 66,
        rssUrl: rssUrls.Bungie,
    },
    {
        name: TwitterAccountNames.DestinyTheGame,
        interval: 1000 * 72,
        rssUrl: rssUrls.DestinyTheGame,
    },
];
function getCurrentUtcHour() {
    const currentUtcDate = new Date().getUTCHours();
    return currentUtcDate;
}
function calculateDestinyInterval() {
    const hour = getCurrentUtcHour();
    if ((hour >= 13 && hour <= 14) || (hour >= 17 && hour <= 18)) {
        return 1000 * 60;
    }
    else {
        return 1000 * 60 * 10;
    }
}
(async () => {
    const fetchAndReschedule = async (account) => {
        const request = await fetchAndSendLatestTweets(account.rssUrl, account.latestTweetLink, account.name);
        if (request)
            account.latestTweetLink = request;
        const interval = account.name === TwitterAccountNames.DestinyTheGame ? calculateDestinyInterval() : account.interval;
        setTimeout(fetchAndReschedule, interval, account);
    };
    for (let account of twitterAccounts) {
        account.latestTweetLink = await getLatestLinkFromDatabase(account.name);
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
        const record = await ProcessedLink.findOne({
            where: { route },
        });
        return record?.link;
    }
    catch (error) {
        console.error(`[Error code: 1946] Error retrieving the latest link from the database for route ${route}:`, error);
    }
}
//# sourceMappingURL=rssHandler.js.map