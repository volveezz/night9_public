import { ButtonBuilder, ButtonStyle } from "discord.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
import { sendApiRequest } from "./sendApiRequest.js";
import translateDestinyText from "./translateDestinyText.js";
let lastFetchedArticles = null;
const checkedUrls = new Set();
async function fetchNewsArticles() {
    try {
        const url = "/Platform/Content/Rss/NewsArticles/0/?includebody=false";
        const response = await sendApiRequest(url);
        const currentArticles = response?.NewsArticles;
        if (!response || !currentArticles) {
            console.error("[Error code: 1944] Invalid response from Bungie API");
            return;
        }
        if (lastFetchedArticles === null) {
            lastFetchedArticles = currentArticles;
            setTimeout(fetchNewsArticles, 60 * 1000);
            return;
        }
        if (currentArticles.length > 0 && currentArticles[0].UniqueIdentifier !== lastFetchedArticles[0].UniqueIdentifier) {
            const newArticles = getNewArticles(currentArticles, lastFetchedArticles);
            postArticlesToDiscord(newArticles);
        }
        lastFetchedArticles = currentArticles;
    }
    catch (error) {
        console.error("[Error code: 1935] An error occurred while fetching news articles:", error);
        if (lastFetchedArticles === null) {
            setTimeout(fetchNewsArticles, 30 * 60 * 1000);
            return;
        }
    }
    finally {
        if (lastFetchedArticles !== null) {
            setTimeout(fetchNewsArticles, 60 * 1000);
        }
    }
}
function getNewArticles(currentArticles, lastFetchedArticles) {
    return currentArticles.filter((article) => !lastFetchedArticles.some((lastArticle) => article.UniqueIdentifier === lastArticle.UniqueIdentifier && !checkedUrls.has(article.Link)));
}
let newsChannel = null;
async function postArticlesToDiscord(articles) {
    for (const article of articles) {
        let translatedDescription = null;
        let components = [];
        if (article.Description && article.Description.trim() !== "") {
            try {
                translatedDescription = await translateDestinyText(article.Description);
                if (translatedDescription && translatedDescription !== article.Description) {
                    components = [
                        new ButtonBuilder().setCustomId("twitter_showOriginal").setLabel("Оригинал").setStyle(ButtonStyle.Secondary),
                    ];
                }
            }
            catch (error) {
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
            if (!newsChannel)
                newsChannel = await client.getAsyncTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
            await newsChannel.send({ embeds: [embed], components: addButtonsToMessage(components) }).then((message) => {
                checkedUrls.add(article.Link);
                if (translatedDescription) {
                    const voteRecord = { original: new Set(), translation: new Set() };
                    twitterOriginalVoters.set(message.id, voteRecord);
                    originalTweetData.set(message.id, article.Description);
                }
            });
        }
        catch (error) {
            console.error("[Error code: 1936] Error posting article to Discord:", error);
        }
    }
}
export default fetchNewsArticles;
//# sourceMappingURL=bungieRssFetcher.js.map