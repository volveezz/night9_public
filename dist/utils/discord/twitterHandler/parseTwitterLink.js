import { pause } from "../../general/utilities.js";
import { processedRssLinks } from "../../persistence/dataStore.js";
import { generateTwitterEmbed } from "./twitterMessageParser.js";
async function parseTwitterLinkMessage(message) {
    if (message.author.bot) {
        await processEmbeds(message.embeds);
    }
    else {
        let attempts = 0;
        let fetchedMessage = message;
        while (fetchedMessage.embeds.length === 0 && attempts < 5) {
            await pause(attempts * 500 + 500);
            try {
                fetchedMessage = await message.fetch();
            }
            catch (error) {
                console.error(`[Error code: 2051] Failed to fetch message ${message.id}`, error);
                return;
            }
            attempts++;
        }
        await processEmbeds(fetchedMessage.embeds);
    }
    async function processEmbeds(embeds) {
        const urlToImagesMap = new Map();
        for (const embed of embeds) {
            const url = embed.url;
            if (!url)
                continue;
            if (urlToImagesMap.has(url) && embed.image?.url) {
                urlToImagesMap.get(url).push(embed.image.url);
            }
            else {
                urlToImagesMap.set(url, embed.image?.url ? [embed.image.url] : []);
            }
        }
        for (const [url, images] of urlToImagesMap.entries()) {
            if (processedRssLinks.has(url))
                continue;
            const associatedEmbed = embeds.find((e) => e.url === url);
            if (associatedEmbed && associatedEmbed.description) {
                const author = getBungieTwitterAuthor(associatedEmbed.author?.name);
                const content = associatedEmbed.description;
                await generateTwitterEmbed({
                    twitterData: content,
                    author,
                    icon: associatedEmbed.author?.iconURL,
                    url,
                    originalEmbed: associatedEmbed,
                    images,
                });
            }
        }
    }
}
function getBungieTwitterAuthor(author) {
    const cleanedAuthor = author
        ?.replace(/\s\(@\w+\)/, "")
        .replace("✧", "")
        .trim();
    switch (cleanedAuthor) {
        case "Destiny 2":
            return 1;
        case "Bungie":
            return 2;
        case "Bungie Help":
            return 3;
        case "Destiny 2 Team":
            return 4;
        default:
            return 5;
    }
}
export default parseTwitterLinkMessage;
//# sourceMappingURL=parseTwitterLink.js.map