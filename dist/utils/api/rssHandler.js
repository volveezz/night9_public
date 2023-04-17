import Parser from "rss-parser";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { generateTwitterEmbed } from "../discord/twitterMessageParser.js";
const parser = new Parser();
const rssBungieHelpUrl = "https://rss-hub-ten-plum.vercel.app/twitter/user/bungiehelp/readable=1&brief=100&limit=1";
const rssBungieUrl = "https://rss-hub-ten-plum.vercel.app/twitter/user/bungie/readable=1&brief=100&limit=1";
const rssDestinyTheGameUrl = "https://rss-hub-ten-plum.vercel.app/twitter/user/destinythegame/readable=1&brief=100&limit=1";
let latestBungieHelpTweetLink;
let latestBungieTweetLink;
let latestDestinyTheGameTweetLink;
async function fetchAndSendLatestTweet(url, latestLink) {
    try {
        const feed = await parser.parseURL(url);
        const latestEntry = feed.items[0];
        if (!latestEntry.link) {
            console.error(`[Error code: 1703]`, latestEntry);
            return latestLink;
        }
        if (!latestLink) {
            return latestEntry.link;
        }
        if (latestLink !== latestEntry.link) {
            const author = latestEntry.creator === "Destiny 2"
                ? BungieTwitterAuthor.DestinyTheGame
                : latestEntry.creator === "Bungie"
                    ? BungieTwitterAuthor.Bungie
                    : latestEntry.creator === "Bungie Help"
                        ? BungieTwitterAuthor.BungieHelp
                        : null;
            if (author) {
                await generateTwitterEmbed(latestEntry, author);
            }
            else {
                console.error(`[Error code: 1705]`, latestEntry);
            }
            return latestEntry.link;
        }
    }
    catch (error) {
        console.error("[Error code: 1704] Error fetching RSS feed:", error);
    }
    return latestLink;
}
(async () => {
    latestBungieHelpTweetLink = await fetchAndSendLatestTweet(rssBungieHelpUrl, latestBungieHelpTweetLink);
    latestBungieTweetLink = await fetchAndSendLatestTweet(rssBungieUrl, latestBungieTweetLink);
    latestDestinyTheGameTweetLink = await fetchAndSendLatestTweet(rssDestinyTheGameUrl, latestDestinyTheGameTweetLink);
})();
setInterval(async () => {
    latestBungieHelpTweetLink = await fetchAndSendLatestTweet(rssBungieHelpUrl, latestBungieHelpTweetLink);
}, 1000 * 60);
setInterval(async () => {
    latestBungieTweetLink = await fetchAndSendLatestTweet(rssBungieUrl, latestBungieTweetLink);
}, 1000 * 75);
setInterval(async () => {
    latestDestinyTheGameTweetLink = await fetchAndSendLatestTweet(rssDestinyTheGameUrl, latestDestinyTheGameTweetLink);
}, 1000 * 90);
