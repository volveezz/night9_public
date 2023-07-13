import { EmbedBuilder } from "discord.js";
import { BungieTwitterAuthor } from "../../configs/BungieTwitterAuthor.js";
import { client } from "../../index.js";
let publicNewsChannel = null;
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
function cleanText(content) {
    content = content.replace(/<br\s*\/?>/gi, "\n");
    content = content.replace(/<div class="rsshub-quote">[\s\S]*?<\/div>|<[^>]*>|&[^;]+;/g, "");
    if (content.startsWith("Re "))
        content = content.slice(3);
    content = content.trim();
    return content;
}
async function generateTwitterEmbed(twitterData, author, icon) {
    if (!twitterData.content)
        return;
    const resolveAuthor = () => {
        const embed = new EmbedBuilder();
        if (author === BungieTwitterAuthor.Bungie) {
            return embed.setColor("#d3d2d0").setAuthor({
                name: "Bungie",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538591736987779/fhGb6cpO_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.BungieHelp) {
            return embed.setColor("#FFA500").setAuthor({
                name: "BungieHelp",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538580571758612/vNe1WM28_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.DestinyTheGame) {
            return embed.setColor("#8fcdf6").setAuthor({
                name: "DestinyTheGame",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1097538571142963280/1hh-HGZb_400x400.png",
                url: twitterData.link,
            });
        }
        else if (author === BungieTwitterAuthor.Destiny2Team) {
            return embed.setColor("#68EDFF").setAuthor({
                name: "Destiny2Team",
                iconURL: icon || "https://cdn.discordapp.com/attachments/679191036849029167/1098350594575577188/zPtKbIQx.jpg",
                url: twitterData.link,
            });
        }
        return embed;
    };
    const cleanContent = cleanText(twitterData.content || "");
    if (!cleanContent || cleanContent.length === 0) {
        console.error("[Error code: 1754]", twitterData);
        return null;
    }
    const extractedMedia = extractImageUrl(twitterData.content || "")?.replaceAll("&amp;", "&");
    const replacedDescription = replaceTimeWithEpoch(cleanContent);
    const replacedOutput = replacedDescription.replace(/https:\/\/t\.co\/\S+/g, "");
    const embed = resolveAuthor().setDescription(replacedOutput.length > 0 ? replacedOutput : null);
    if (extractedMedia) {
        embed.setImage(extractedMedia);
    }
    if (!publicNewsChannel)
        publicNewsChannel =
            client.getCachedTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID) ||
                (await client.getCachedGuild().channels.fetch(process.env.ENGLISH_NEWS_CHANNEL_ID));
    await publicNewsChannel.send({ embeds: [embed] });
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
export { generateTwitterEmbed };
//# sourceMappingURL=twitterMessageParser.js.map