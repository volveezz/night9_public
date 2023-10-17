import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { client } from "../../../index.js";
import { updateLatestTweetInfoInDatabase } from "../../api/rssHandler.js";
import translateDestinyText from "../../api/translateDestinyText.js";
import { addButtonsToMessage } from "../../general/addButtonsToMessage.js";
import { uploadImageToImgur } from "../../general/uploadImageToImgur.js";
import { originalTweetData, processedRssLinks, twitterOriginalVoters } from "../../persistence/dataStore.js";
import { isNitterUrlAllowed } from "./isNitterUrlAllowed.js";
import convertMp4ToGif from "./mp4IntoGif.js";
import resolveAuthor from "./resolveAuthor.js";
import { processTwitterGifFile } from "./saveGifInChannel.js";
let publicNewsChannel = null;
const originalButton = new ButtonBuilder().setCustomId("twitter_showOriginal").setLabel("Оригинал").setStyle(ButtonStyle.Secondary);
function extractMediaUrl(content, preferable = "image") {
    if (!content)
        return null;
    const imgRegex = /(https?:\/\/[^"]*?(?:png|jpg|jpeg|gif)(?:&amp;[^"]*)?)/g;
    const videoRegex = /(https?:\/\/[^"]*?\.mp4[^"]*)|(https:\/\/video\.twimg\.com\/amplify_video\/\d+\/vid\/.*?\.(mp4|gif))/g;
    const imgMatch = content.match(imgRegex);
    const videoMatch = content.match(videoRegex);
    if (preferable === "image") {
        return imgMatch ? imgMatch[1] || imgMatch[0] : null;
    }
    else if (preferable === "video") {
        return videoMatch ? videoMatch[1] || videoMatch[0] : null;
    }
    return null;
}
function clearText(content) {
    return content
        .replace(/&nbsp;/g, " ")
        .replace(/<br\s*\/?>/gi, "")
        .replace(/&gt;/gi, ">")
        .replace(/&lt;/gi, "<")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&apos;/gi, "'")
        .replace(/<div class="rsshub-quote">[\s\S]*?<\/div>|<[^>]*>/g, "")
        .replace(/<div class="rsshub-quote">[\s\S]*?<\/div>|<[^>]*>|https:\/\/t\.co\/\S+|https:\/\/twitter\.com\/i\/web\/status\/\S+/g, "")
        .replace(/nitter\.[^ \n]+/g, "")
        .replace(/^Re /, "")
        .replace(/^ +/gm, (match) => "\u00A0".repeat(match.length))
        .replace(/ ?⏵\s*\[\[\d+\]\]\((https?:\/\/[^\)]+)\)/g, "")
        .trim();
}
function getTwitterAccountNameFromAuthor(author) {
    switch (author) {
        case 1:
            return "destinythegame";
        case 2:
            return "bungie";
        case 3:
            return "bungiehelp";
        case 4:
            return "destiny2team";
        default:
            return null;
    }
}
async function generateTwitterEmbed({ twitterData, author, icon, url, originalEmbed, content, images, }) {
    console.debug("Started to generate twitter embed");
    try {
        if (!twitterData)
            return;
        const cleanContent = clearText(twitterData);
        if (!cleanContent || cleanContent.length === 0) {
            console.error("[Error code: 1754]", twitterData);
            return;
        }
        let components = [];
        const embedMedia = originalEmbed?.data && (originalEmbed.data.thumbnail?.url || originalEmbed.data.image?.url || originalEmbed.data.video?.url);
        const extractedMedia = extractMediaUrl(content) || embedMedia;
        console.debug(`Extracted media: ${extractedMedia}`, embedMedia);
        const replacedDescription = replaceTimeWithEpoch(cleanContent);
        let tranlsatedContent = "";
        try {
            const translateRequest = await translateDestinyText(replacedDescription);
            if (translateRequest && translateRequest.length > 1 && !translateRequest.includes("You exceeded your current quota")) {
                tranlsatedContent = translateRequest;
                components = [originalButton];
            }
            else {
                console.error("[Error code: 1966]", translateRequest);
            }
        }
        catch (error) {
            console.error("[Error code: 1967]", error);
        }
        const embed = resolveAuthor({ author, icon, url, originalAuthor: originalEmbed?.author?.name?.replace(/\s\(@\w+\)/, "") });
        if (!embed) {
            console.error("[Error code: 1998]", embed, author, icon, url);
            return;
        }
        embed.setDescription(tranlsatedContent && tranlsatedContent.length > 1 ? tranlsatedContent : replacedDescription.length > 0 ? replacedDescription : null);
        const embeds = [embed];
        if (extractedMedia) {
            const mainEmbedImage = isNitterUrlAllowed(extractedMedia)
                ? extractedMedia
                : await uploadImageToImgur(extractedMedia).catch((error) => {
                    console.error("[Error code: 2101] Failed to upload main embed image to imgur", error);
                    return extractedMedia;
                });
            embeds[0].setImage(mainEmbedImage);
            if (images && images.length > 0 && url) {
                const imageIndex = images.indexOf(extractedMedia);
                imageIndex > -1 && images.splice(imageIndex, 1);
                images.forEach(async (imageLink) => {
                    let subEmbedImage = isNitterUrlAllowed(imageLink)
                        ? extractedMedia
                        : await uploadImageToImgur(imageLink).catch((error) => {
                            console.error("[Error code: 2102] Failed to upload sub embed image to imgur", error);
                            return imageLink;
                        });
                    embeds.push(new EmbedBuilder().setURL(url).setImage(subEmbedImage));
                });
            }
        }
        if (!publicNewsChannel)
            publicNewsChannel = await client.getTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
        if (url && !processedRssLinks.has(url)) {
            processedRssLinks.add(url);
            try {
                const authorName = getTwitterAccountNameFromAuthor(author);
                if (authorName)
                    updateLatestTweetInfoInDatabase(authorName, { link: url, pubDate: new Date().toString() });
            }
            catch (error) {
                console.error("[Error code: 2084]", error);
            }
        }
        await publicNewsChannel.send({ embeds, components: addButtonsToMessage(components) }).then((m) => {
            if (tranlsatedContent) {
                const voteRecord = { original: new Set(), translation: new Set() };
                twitterOriginalVoters.set(m.id, voteRecord);
                originalTweetData.set(m.id, cleanContent);
            }
            const extractedVideoMedia = extractMediaUrl(content, "video");
            if (extractedVideoMedia && extractedVideoMedia.endsWith(".mp4")) {
                console.debug("Converting video to gif");
                convertVideoToGif(extractedVideoMedia, m, embed);
            }
        });
    }
    catch (error) {
        console.error("[Error code: 2083]", error);
        if (url && processedRssLinks.has(url))
            processedRssLinks.delete(url);
    }
}
async function convertVideoToGif(videoUrl, message, embed) {
    const gifUrl = await convertMp4ToGif(videoUrl);
    if (!gifUrl)
        return;
    processTwitterGifFile(gifUrl, message, embed);
}
function replaceTimeWithEpoch(text) {
    const dateRegex = /❖\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+)/i;
    const dateMatch = text.match(dateRegex);
    let month = 0;
    let day = 0;
    let setDate = false;
    if (dateMatch) {
        const [_, dateStr] = dateMatch;
        const dateParts = dateStr.split(" ");
        const monthStr = dateParts[0].toLowerCase();
        day = parseInt(dateParts[1], 10);
        const monthNames = [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
        ];
        month = monthNames.indexOf(monthStr);
        setDate = true;
    }
    const timeRegex = /(\d{1,2})(:)?(\d{2})?\s?(AM|PM)(\s?PDT\s?\(-7\s?UTC\)|\s?PST\s?\(\d{4}\s?UTC\)|\s?PST\s?\(-7\s?UTC\)|\s?PT|\s?PDT|\s?PST\s?\(-8\s?UTC\)|\s?PST)?/gi;
    const replacement = (_, hour, __, minute, amPm, timezone) => {
        let hourNumber = parseInt(hour, 10);
        const minuteNumber = parseInt(minute || "0", 10);
        if (amPm.toUpperCase() === "PM" && hourNumber !== 12) {
            hourNumber += 12;
        }
        else if (amPm.toUpperCase() === "AM" && hourNumber === 12) {
            hourNumber = 0;
        }
        if (timezone && timezone.includes("PST")) {
            hourNumber += 8;
        }
        else {
            hourNumber += 7;
        }
        const date = new Date();
        if (setDate) {
            date.setFullYear(date.getFullYear(), month, day);
        }
        date.setHours(hourNumber, minuteNumber, 0, 0);
        const timeSinceEpoch = Math.floor(date.getTime() / 1000);
        return setDate ? `<t:${timeSinceEpoch}>` : `<t:${timeSinceEpoch}:t>`;
    };
    return text.replace(timeRegex, replacement);
}
export { generateTwitterEmbed };
//# sourceMappingURL=twitterMessageParser.js.map