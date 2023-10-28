import { ChannelType, EmbedBuilder } from "discord.js";
import { pause } from "../../general/utilities.js";
import { lastTwitterPublishedPosts, processedRssLinks } from "../../persistence/dataStore.js";
import { convertVideoToGifAndUpdateMessage, generateAndSendTwitterEmbed } from "./twitterMessageParser.js";
async function parseTwitterLinkMessage(message) {
    if (message.author.bot) {
        console.debug("Found a new automated twitter message. It is", message.content.startsWith("[⏵]"));
        if (message.content.startsWith("[⏵]")) {
            console.debug("Starting to process attachment-type message");
            await processTwitterAttachment(message);
        }
        else if (message.embeds?.length > 0) {
            await processEmbeds(message.embeds);
        }
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
                await generateAndSendTwitterEmbed({
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
async function processTwitterAttachment(message) {
    const postId = await findTwitterPostIdFromAttachmentMessage();
    console.debug("Extracted post id:", postId);
    if (!postId)
        return;
    const postData = lastTwitterPublishedPosts.get(postId);
    console.debug("Extracted post data:", postData?.id);
    if (!postData)
        return;
    const linkToVideo = message.content.match(/\]\(([^)]+)\)/)?.[1];
    console.debug("Extracted link:", linkToVideo, message.content);
    if (!linkToVideo)
        return;
    await convertVideoToGifAndUpdateMessage(linkToVideo, postData, EmbedBuilder.from(postData.embeds[0]));
    async function findTwitterPostIdFromAttachmentMessage() {
        const channel = message.channel.type === ChannelType.GuildText ? message.channel : null;
        if (!channel)
            return;
        const messageBefore = (await channel.messages.fetch({ before: message.id, limit: 1 })).at(0);
        if (!messageBefore || messageBefore.author.id !== message.author.id)
            return;
        const postId = messageBefore.content.split("/").pop();
        return postId;
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