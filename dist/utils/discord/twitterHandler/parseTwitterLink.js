import { pause } from "../../general/utilities.js";
import { processedRssLinks } from "../../persistence/dataStore.js";
import { generateTwitterEmbed } from "./twitterMessageParser.js";
async function parseTwitterLinkMessage(message) {
    for (let i = 0; i < message.embeds.length; i++) {
        await processTwitterMessage(i);
    }
    async function processTwitterMessage(index) {
        let attempts = 0;
        let embed = message.embeds[index];
        while ((!embed || !embed?.author?.name) && attempts < 5) {
            await pause(attempts * 500 + 500);
            try {
                embed = (await message.fetch()).embeds[index];
            }
            catch (error) {
                console.error(`[Error code: 2051] Failed to fetch message ${message.id}`, error);
                return;
            }
            attempts++;
        }
        if (!embed?.author?.name) {
            return;
        }
        const author = getBungieTwitterAuthor(embed.author.name);
        const content = embed.description;
        if (!author || !content) {
            return;
        }
        const tweetUrl = message.content.match(/https:\/\/twitter\.com\/\w+\/status\/\d+/)?.[0];
        const url = tweetUrl || embed.url || embed.author.url;
        if (url && processedRssLinks.has(url)) {
            message.delete();
            return;
        }
        await generateTwitterEmbed({
            twitterData: { content, link: tweetUrl || "" },
            author,
            icon: embed.author.iconURL,
            url,
            originalEmbed: embed,
        });
        message.delete();
    }
}
function getBungieTwitterAuthor(author) {
    const cleanedAuthor = author
        .replace(/\s\(@\w+\)/, "")
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