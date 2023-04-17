import { EmbedBuilder } from "discord.js";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { channelIds } from "../../configs/ids.js";
import { client } from "../../index.js";
import { timer } from "../general/utilities.js";
const publicNewsChannel = client.getCachedTextChannel(channelIds.externalNewsFeed) || (await client.getCachedGuild().channels.fetch(channelIds.externalNewsFeed));
const twitterNewsChannel = client.getCachedTextChannel(channelIds.admin) || (await client.getCachedGuild().channels.fetch(channelIds.admin));
function extractImageUrl(content) {
    const imgRegex = /<img.*?src="(.*?)".*?>/i;
    const videoRegex = /<video.*?poster="(.*?)".*?>/i;
    const imgMatch = content.match(imgRegex);
    const videoMatch = content.match(videoRegex);
    if (imgMatch) {
        return imgMatch[1];
    }
    else if (videoMatch) {
        return videoMatch[1];
    }
    return null;
}
async function handleTimeReplacement({ message: oldMessage }) {
    const fetchMessage = async () => {
        let message = await oldMessage.fetch();
        const messageEmbed = message.embeds[0];
        return messageEmbed ? message : null;
    };
    let message = await fetchMessage();
    if (!message) {
        await timer(1000 * 10);
        message = await fetchMessage();
    }
    if (!message || !message.embeds[0].description == null)
        return;
    const messageEmbed = message.embeds[0];
    const messageDescription = messageEmbed.description;
    const replacedDescription = replaceTimeWithEpoch(messageDescription);
    if (!replacedDescription || replacedDescription.length < 5) {
        console.error(`[Error code: 1699]`, message);
        return;
    }
    const embed = new EmbedBuilder().setColor("#FFA500").setDescription(replacedDescription).setFooter({ text: `BungieHelp notification` });
    if (messageEmbed.author)
        embed.setAuthor(messageEmbed.author);
    if (messageEmbed.title)
        embed.setTitle(messageEmbed.title);
    if (messageEmbed.timestamp)
        embed.setTimestamp(new Date(messageEmbed.timestamp));
    if (messageEmbed.image)
        embed.setImage(messageEmbed.image.url);
    if (messageEmbed.thumbnail)
        embed.setImage(messageEmbed.thumbnail.url);
    await publicNewsChannel.send({ embeds: [embed] });
    await message.delete();
}
async function generateTwitterEmbed(twitterData, author) {
    if (!twitterData.contentSnippet)
        return;
    const resolveAuthor = () => {
        const embed = new EmbedBuilder();
        const twittDate = twitterData.pubDate && new Date(twitterData.pubDate);
        if (twittDate)
            embed.setTimestamp(twittDate);
        if (author === BungieTwitterAuthor.Bungie) {
            return embed.setColor("#d3d2d0").setAuthor({
                name: "Bungie",
                iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1097538591736987779/fhGb6cpO_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.BungieHelp) {
            return embed.setColor("#FFA500").setAuthor({
                name: "BungieHelp",
                iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1097538580571758612/vNe1WM28_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.DestinyTheGame) {
            return embed.setColor("#8fcdf6").setAuthor({
                name: "DestinyTheGame",
                iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1097538571142963280/1hh-HGZb_400x400.png",
                url: twitterData.link,
            });
        }
        return embed;
    };
    const extractedMedia = extractImageUrl(twitterData.content || "")?.replaceAll("&amp;", "&");
    const replacedDescription = replaceTimeWithEpoch(twitterData.contentSnippet.replaceAll("\n", "\n\n"));
    const embed = resolveAuthor().setDescription(replacedDescription);
    if (extractedMedia) {
        embed.setImage(extractedMedia);
    }
    await twitterNewsChannel.send({ embeds: [embed] });
    return;
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
export { generateTwitterEmbed, handleTimeReplacement };
