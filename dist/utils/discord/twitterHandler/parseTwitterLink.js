import { ChannelType, EmbedBuilder } from "discord.js";
import { pause } from "../../general/utilities.js";
import { lastTwitterPublishedPosts, processedRssLinks } from "../../persistence/dataStore.js";
import { convertVideoToGifAndUpdateMessage, generateAndSendTwitterEmbed } from "./twitterMessageParser.js";
async function parseTwitterLinkMessage(message) {
    if (message.author.bot) {
        if (message.content.startsWith("[⏵]")) {
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
            const imageUrl = (embed.thumbnail && embed.thumbnail.url.match(/profile_images/i)?.[0] ? embed.image?.url : embed.thumbnail?.url) ||
                embed.image?.url;
            const imagesUrls = urlToImagesMap.get(url);
            if (imagesUrls && imageUrl) {
                imagesUrls.push(imageUrl);
            }
            else {
                urlToImagesMap.set(url, imageUrl ? [imageUrl] : []);
            }
        }
        for (const [url, images] of urlToImagesMap.entries()) {
            if (processedRssLinks.has(url))
                continue;
            const associatedEmbed = embeds.find((e) => e.url === url);
            if (associatedEmbed && associatedEmbed.description) {
                const isVxTwitter = message.content.match(/vxtwitter\.com/i)?.[0];
                const author = getBungieTwitterAuthor((isVxTwitter ? associatedEmbed.title : associatedEmbed.author?.name) || "none");
                let content = associatedEmbed.description;
                if (isVxTwitter) {
                    content = content.replace(/\n\n💖\s*\d+/, "");
                }
                const embedAuthorIcon = associatedEmbed.thumbnail?.url.match(/profile_images/i)?.[0] && associatedEmbed.thumbnail?.url;
                await generateAndSendTwitterEmbed({
                    twitterData: content,
                    author,
                    icon: isVxTwitter ? embedAuthorIcon : associatedEmbed.author?.iconURL,
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
    if (!postId)
        return;
    const postData = lastTwitterPublishedPosts.get(postId);
    if (!postData)
        return;
    const linkToVideo = message.content.match(/\]\(([^)]+)\)/)?.[1];
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