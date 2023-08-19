import { pause } from "../../general/utilities.js";
import { generateTwitterEmbed } from "./twitterMessageParser.js";
async function parseTwitterLinkMessage(message) {
    console.debug("Received a message that looks like a Twitter link. Parsing it...");
    let embed = message.embeds[0];
    let attempts = 0;
    while (!embed?.author?.name && attempts < 3) {
        console.debug(`Message doesn't contain embed or author field. Attempting to fetch embed from message...`);
        await pause(attempts * 500 + 500);
        embed = (await message.fetch()).embeds[0];
        attempts++;
    }
    if (!embed?.author?.name) {
        console.debug("Failed to get embed from the message, exiting...");
        return;
    }
    const author = getBungieTwitterAuthor(embed.author.name);
    const content = embed.description;
    if (!author || !content)
        return;
    await generateTwitterEmbed({
        twitterData: { content },
        author,
        icon: embed.author.iconURL,
        url: embed.author.url,
        originalEmbed: embed,
    });
    message.delete();
}
function getBungieTwitterAuthor(author) {
    const cleanedAuthor = author.replace(/\s\(@\w+\)/, "");
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
            return null;
    }
}
export default parseTwitterLinkMessage;
//# sourceMappingURL=parseTwitterLink.js.map