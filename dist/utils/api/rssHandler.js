import Parser from "rss-parser";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { generateTwitterEmbed } from "../discord/twitterMessageParser.js";
import { processedRssLinks } from "../persistence/dataStore.js";
import { ProcessedLink } from "../persistence/sequelize.js";
const parser = new Parser();
var TwitterAccountNames;
(function (TwitterAccountNames) {
    TwitterAccountNames["BungieHelp"] = "bungiehelp";
    TwitterAccountNames["Bungie"] = "bungie";
    TwitterAccountNames["DestinyTheGame"] = "destinythegame";
    TwitterAccountNames["Destiny2Team"] = "destiny2team";
})(TwitterAccountNames || (TwitterAccountNames = {}));
const hostUrl = "rsshub-production-e9d1.up.railway.app";
const rssBungieHelpUrl = `https://${hostUrl}/twitter/user/${TwitterAccountNames.BungieHelp}?readable=0&limit=10`;
const rssBungieUrl = `https://${hostUrl}/twitter/user/${TwitterAccountNames.Bungie}?readable=0&limit=5`;
const rssDestinyTheGameUrl = `https://${hostUrl}/twitter/user/${TwitterAccountNames.DestinyTheGame}?readable=0&limit=5`;
const rssDestinyTeamUrl = `https://${hostUrl}/twitter/user/${TwitterAccountNames.Destiny2Team}?readable=0&limit=10`;
let latestBungieHelpTweetLink;
let latestBungieTweetLink;
let latestDestinyTheGameTweetLink;
let latestDestinyTeamTweetLink;
async function fetchAndSendLatestTweets(url, latestLink, routeName) {
    try {
        console.debug(`Checking ${routeName} RSS feed`);
        const feed = await parser.parseURL(url).catch((e) => {
            console.error("[Error code: 1706] Error fetching RSS feed:", e.message, e.status, url.split("/")?.[5]);
            return;
        });
        if (!feed)
            return;
        const newEntries = [];
        for (const entry of feed.items) {
            if (routeName === TwitterAccountNames.DestinyTheGame)
                console.debug(entry);
            if (!entry.link || entry.link === latestLink || processedRssLinks.has(entry.link)) {
                break;
            }
            if (isRetweet(entry)) {
                continue;
            }
            processedRssLinks.add(entry.link);
            console.debug(`Adding a link: ${entry.link}`);
            newEntries.unshift(entry);
        }
        if (newEntries.length > 0) {
            for (const entry of newEntries) {
                const author = getBungieTwitterAuthor(entry.creator);
                if (author && isValidTweet(author, entry.guid) && entry.content && entry.content.length > 0) {
                    generateTwitterEmbed(entry, author, feed.image?.url);
                }
                else {
                    console.error("[Error code: 1705]", entry);
                }
            }
            const finalLink = newEntries.length > 0 ? newEntries[newEntries.length - 1].link : latestLink;
            if (finalLink) {
                await updateLatestLinkInDatabase(routeName, finalLink);
            }
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
(async () => {
    latestBungieHelpTweetLink = await getLatestLinkFromDatabase(TwitterAccountNames.BungieHelp);
    latestBungieTweetLink = await getLatestLinkFromDatabase(TwitterAccountNames.Bungie);
    latestDestinyTheGameTweetLink = await getLatestLinkFromDatabase(TwitterAccountNames.DestinyTheGame);
    latestDestinyTeamTweetLink = await getLatestLinkFromDatabase(TwitterAccountNames.Destiny2Team);
    if (!latestBungieHelpTweetLink) {
        latestBungieHelpTweetLink = await fetchAndSendLatestTweets(rssBungieHelpUrl, latestBungieHelpTweetLink, TwitterAccountNames.BungieHelp);
    }
    if (!latestBungieTweetLink) {
        latestBungieTweetLink = await fetchAndSendLatestTweets(rssBungieUrl, latestBungieTweetLink, TwitterAccountNames.Bungie);
    }
    if (!latestDestinyTheGameTweetLink) {
        latestDestinyTheGameTweetLink = await fetchAndSendLatestTweets(rssDestinyTheGameUrl, latestDestinyTheGameTweetLink, TwitterAccountNames.DestinyTheGame);
    }
    if (!latestDestinyTeamTweetLink) {
        latestDestinyTeamTweetLink = await fetchAndSendLatestTweets(rssDestinyTeamUrl, latestDestinyTeamTweetLink, TwitterAccountNames.Destiny2Team);
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
        console.error("Error retrieving the latest link from the database:", error);
    }
}
setInterval(async () => {
    latestBungieHelpTweetLink = await fetchAndSendLatestTweets(rssBungieHelpUrl, latestBungieHelpTweetLink, TwitterAccountNames.BungieHelp);
}, 1000 * 60);
setInterval(async () => {
    latestBungieTweetLink = await fetchAndSendLatestTweets(rssBungieUrl, latestBungieTweetLink, TwitterAccountNames.Bungie);
}, 1000 * 60);
setInterval(async () => {
    latestDestinyTheGameTweetLink = await fetchAndSendLatestTweets(rssDestinyTheGameUrl, latestDestinyTheGameTweetLink, TwitterAccountNames.DestinyTheGame);
}, 1000 * 60);
setInterval(async () => {
    latestDestinyTeamTweetLink = await fetchAndSendLatestTweets(rssDestinyTeamUrl, latestDestinyTeamTweetLink, TwitterAccountNames.Destiny2Team);
}, 1000 * 60);
//# sourceMappingURL=rssHandler.js.map