import Parser from "rss-parser";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { generateTwitterEmbed } from "../discord/twitterMessageParser.js";
const parser = new Parser();
const rssBungieHelpUrl = "https://rss-hub-ten-plum.vercel.app/twitter/user/bungiehelp?readable=1&limit=10";
const rssBungieUrl = "https://rss-hub-ten-plum.vercel.app/twitter/user/bungie?readable=1&limit=10";
const rssDestinyTheGameUrl = "https://rss-hub-ten-plum.vercel.app/twitter/user/destinythegame?readable=1&limit=10";
let latestBungieHelpTweetLink;
let latestBungieTweetLink;
let latestDestinyTheGameTweetLink;
async function fetchAndSendLatestTweets(url, latestLink) {
    try {
        const feed = await parser.parseURL(url);
        if (!latestLink) {
            const firstEntry = feed.items[0];
            return firstEntry.link;
        }
        const newEntries = [];
        for (const entry of feed.items) {
            if (entry.link === latestLink) {
                break;
            }
            newEntries.unshift(entry);
        }
        if (newEntries.length > 0) {
            for (const entry of newEntries) {
                if (!entry.link) {
                    console.error(`[Error code: 1703]`, entry);
                    continue;
                }
                const author = getBungieTwitterAuthor(entry.creator);
                if (author) {
                    if (isValidTweet(author, entry.guid)) {
                        if (entry.content && entry.content.length > 0) {
                            generateTwitterEmbed(entry, author);
                        }
                        else {
                            console.error(`[Error code: 1707]`, entry);
                        }
                    }
                }
                else {
                    console.error(`[Error code: 1705]`, entry);
                }
            }
            return newEntries[0].link;
        }
    }
    catch (error) {
        console.error("[Error code: 1704] Error fetching RSS feed:", error);
    }
    return latestLink;
}
function getBungieTwitterAuthor(creator) {
    switch (creator) {
        case "Destiny 2":
            return BungieTwitterAuthor.DestinyTheGame;
        case "Bungie":
            return BungieTwitterAuthor.Bungie;
        case "Bungie Help":
            return BungieTwitterAuthor.BungieHelp;
        default:
            return null;
    }
}
function isValidTweet(author, guid) {
    if (!guid)
        return false;
    const guidLowerCase = guid.toLowerCase();
    return ((author === BungieTwitterAuthor.Bungie && guidLowerCase.startsWith("https://twitter.com/bungie/")) ||
        (author === BungieTwitterAuthor.BungieHelp && guidLowerCase.startsWith("https://twitter.com/bungiehelp/")) ||
        (author === BungieTwitterAuthor.DestinyTheGame && guidLowerCase.startsWith("https://twitter.com/destinythegame/")));
}
(async () => {
    latestBungieHelpTweetLink = await fetchAndSendLatestTweets(rssBungieHelpUrl, latestBungieHelpTweetLink);
    latestBungieTweetLink = await fetchAndSendLatestTweets(rssBungieUrl, latestBungieTweetLink);
    latestDestinyTheGameTweetLink = await fetchAndSendLatestTweets(rssDestinyTheGameUrl, latestDestinyTheGameTweetLink);
})();
setInterval(async () => {
    latestBungieHelpTweetLink = await fetchAndSendLatestTweets(rssBungieHelpUrl, latestBungieHelpTweetLink);
}, 1000 * 60);
setInterval(async () => {
    latestBungieTweetLink = await fetchAndSendLatestTweets(rssBungieUrl, latestBungieTweetLink);
}, 1000 * 60);
setInterval(async () => {
    latestDestinyTheGameTweetLink = await fetchAndSendLatestTweets(rssDestinyTheGameUrl, latestDestinyTheGameTweetLink);
}, 1000 * 60);
