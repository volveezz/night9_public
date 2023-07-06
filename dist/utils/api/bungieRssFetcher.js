import { client } from "../../index.js";
import { sendApiRequest } from "./sendApiRequest.js";
let lastFetchedArticles = null;
async function fetchNewsArticles() {
    try {
        const url = "/Platform/Content/Rss/NewsArticles/0/?includebody=false";
        const response = await sendApiRequest(url);
        const currentArticles = response?.NewsArticles;
        if (!response || !currentArticles) {
            console.error("[Error code: 1944] Invalid response from Bungie API:", response);
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
    return currentArticles.filter((article) => !lastFetchedArticles.some((lastArticle) => article.UniqueIdentifier === lastArticle.UniqueIdentifier));
}
let adminChannel = null;
async function postArticlesToDiscord(articles) {
    for (const article of articles) {
        const embed = {
            title: article.Title,
            url: `https://www.bungie.net${article.Link}`,
            description: article.Description,
            image: {
                url: article.ImagePath,
            },
            color: 65535,
        };
        try {
            if (!adminChannel)
                adminChannel = await client.getAsyncTextChannel(process.env.ADMIN_CHANNEL_ID);
            await adminChannel.send({ embeds: [embed] });
        }
        catch (error) {
            console.error("[Error code: 1936] Error posting article to Discord:", error);
        }
    }
}
export default fetchNewsArticles;
//# sourceMappingURL=bungieRssFetcher.js.map