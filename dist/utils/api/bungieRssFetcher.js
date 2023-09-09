import { ButtonBuilder, ButtonStyle } from "discord.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
import { redisClient } from "../persistence/redis.js";
import { sendApiRequest } from "./sendApiRequest.js";
import translateDestinyText from "./translateDestinyText.js";
let lastArticlePubDate = null;
const API_URL = "/Platform/Content/Rss/NewsArticles/0/?includebody=false";
async function fetchNewsArticles() {
    console.debug("[News] Fetching news articles");
    try {
        const { NewsArticles: currentArticles } = await sendApiRequest(API_URL);
        if (!currentArticles || currentArticles.length <= 0) {
            console.error("[Error code: 1944] Invalid response from Bungie API");
            return;
        }
        if (!lastArticlePubDate) {
            const redisData = await redisClient.get("lastArticlePubDate");
            lastArticlePubDate = (redisData ? new Date(redisData) : new Date()).getTime();
        }
        if (new Date(currentArticles[0].PubDate).getTime() !== lastArticlePubDate) {
            const newArticles = getNewArticles(currentArticles, lastArticlePubDate);
            await postArticlesToDiscord(newArticles);
        }
    }
    catch (error) {
        console.error("[Error code: 1935] An error occurred while fetching news articles:", error);
    }
    finally {
        const delay = timeLeftToNext01Second();
        console.debug(`[News] Next fetch in ${delay / 1000} seconds`);
        setTimeout(fetchNewsArticles, delay);
    }
}
function timeLeftToNext01Second() {
    const currentDate = new Date();
    const currentSeconds = currentDate.getSeconds();
    const currentMilliseconds = currentDate.getMilliseconds();
    if (currentSeconds === 1 && currentMilliseconds === 0) {
        return 60 * 1000 - currentMilliseconds;
    }
    if (currentSeconds < 1) {
        return 1 * 1000 - currentMilliseconds;
    }
    return (60 - currentSeconds) * 1000 + 1 * 1000 - currentMilliseconds;
}
function getNewArticles(currentArticles, lastArticlePubDate) {
    return currentArticles.filter((article) => {
        const articleDate = new Date(article.PubDate).getTime();
        return articleDate > lastArticlePubDate;
    });
}
let newsChannel = null;
const showOriginalButton = addButtonsToMessage([
    new ButtonBuilder().setCustomId("twitter_showOriginal").setLabel("Оригинал").setStyle(ButtonStyle.Secondary),
]);
async function postArticlesToDiscord(articles) {
    for (const article of articles) {
        let translatedDescription = null;
        let isButtonNeeded = false;
        if (article.Description && article.Description.trim() !== "") {
            try {
                translatedDescription = await translateDestinyText(article.Description);
                if (translatedDescription && translatedDescription !== article.Description) {
                    isButtonNeeded = true;
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
            lastArticlePubDate = new Date(article.PubDate).getTime();
            try {
                redisClient.set("lastArticlePubDate", lastArticlePubDate).then(() => {
                    console.debug(`[News] Last article pub date set to ${lastArticlePubDate}`);
                });
            }
            catch (error) {
                console.error("[Error code: 2009] Error happened while setting lastArticlePubDate in Redis", error.stack || error);
            }
            await newsChannel.send({ embeds: [embed], components: isButtonNeeded ? showOriginalButton : undefined }).then((message) => {
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