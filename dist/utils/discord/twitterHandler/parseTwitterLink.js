import { pause } from "../../general/utilities.js";
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
            embed = (await message.fetch()).embeds[index];
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
        await generateTwitterEmbed({
            twitterData: { content, link: tweetUrl || "" },
            author,
            icon: embed.author.iconURL,
            url: tweetUrl || embed.author.url,
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