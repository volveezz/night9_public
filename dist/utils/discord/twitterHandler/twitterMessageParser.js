import { ButtonBuilder, ButtonStyle } from "discord.js";
import { client } from "../../../index.js";
import translateDestinyText from "../../api/translateDestinyText.js";
import { addButtonsToMessage } from "../../general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../../persistence/dataStore.js";
import convertMp4ToGif from "./mp4IntoGif.js";
import resolveAuthor from "./resolveAuthor.js";
import { processTwitterGifFile } from "./saveGifInChannel.js";
let publicNewsChannel = null;
function extractMediaUrl(content) {
    if (!content)
        return null;
    const videoRegex = /⏵\s*\[1\]\((https?:\/\/[^\)]+)\)/;
    const videoMatch = content.match(videoRegex);
    return videoMatch ? videoMatch[1] : null;
}
function clearText(content) {
    return (content
        .replace(/ ?⏵\s*\[\d+\]\((https?:\/\/[^\)]+)\)/g, "")
        .trim());
}
async function generateTwitterEmbed({ twitterData, author, icon, url, originalEmbed }) {
    if (!twitterData.content)
        return;
    console.debug(`Starting to clear text:`, twitterData.content);
    const cleanContent = clearText(twitterData.content);
    console.debug(`Finished clearing text:`, cleanContent);
    if (!cleanContent || cleanContent.length === 0) {
        console.error("[Error code: 1754]", twitterData);
        return;
    }
    let components = [];
    const embedMedia = originalEmbed?.data && (originalEmbed.data.thumbnail?.url || originalEmbed.data.image?.url || originalEmbed.data.video?.url);
    const extractedMedia = extractMediaUrl(twitterData.content) || embedMedia;
    const replacedDescription = replaceTimeWithEpoch(cleanContent);
    let tranlsatedContent = null;
    try {
        const translateRequest = await translateDestinyText(replacedDescription);
        if (translateRequest && translateRequest.length > 1 && !translateRequest.includes("You exceeded your current quota")) {
            tranlsatedContent = translateRequest;
            components = [new ButtonBuilder().setCustomId("twitter_showOriginal").setLabel("Оригинал").setStyle(ButtonStyle.Secondary)];
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
    if (extractedMedia) {
        embed.setImage(extractedMedia);
    }
    if (!publicNewsChannel)
        publicNewsChannel = await client.getAsyncTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
    await publicNewsChannel.send({ embeds: [embed], components: addButtonsToMessage(components) }).then((m) => {
        if (tranlsatedContent) {
            const voteRecord = { original: new Set(), translation: new Set() };
            twitterOriginalVoters.set(m.id, voteRecord);
            originalTweetData.set(m.id, cleanContent);
        }
        if (extractedMedia && extractedMedia.includes(".mp4")) {
            convertVideoToGif(extractedMedia, m, embed);
        }
    });
    return;
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
    const replacement = (match, hour, colon, minute, amPm, timezone) => {
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