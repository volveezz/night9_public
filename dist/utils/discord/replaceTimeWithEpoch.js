import { EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { channelIds } from "../../configs/ids.js";
import { client } from "../../index.js";
const publicNewsChannel = client.getCachedTextChannel(channelIds.externalNewsFeed) || (await client.getCachedGuild().channels.fetch(channelIds.externalNewsFeed));
async function handleTimeReplacement({ message: oldMessage }) {
    const message = await oldMessage.fetch();
    const messageEmbed = message.embeds[0];
    if (!messageEmbed || !messageEmbed.description)
        return;
    const messageDescription = messageEmbed.description;
    const replacedDescription = replaceTimeWithEpoch(messageDescription);
    if (!replacedDescription || replacedDescription.length < 5) {
        console.error(`[Error code: 1699]`, message);
        return;
    }
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setDescription(replacedDescription)
        .setFooter({ text: `BungieHelp notification` });
    if (messageEmbed.author)
        embed.setAuthor(messageEmbed.author);
    if (messageEmbed.title)
        embed.setTitle(messageEmbed.title);
    if (messageEmbed.timestamp)
        embed.setTimestamp(new Date(messageEmbed.timestamp));
    await publicNewsChannel.send({ embeds: [embed] });
    await message.delete();
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
    const timeRegex = /(\d{1,2})(:)?(\d{2})?\s?(AM|PM)(\s?PDT\s?\(-7\s?UTC\))?/gi;
    const replacement = (match, hour, colon, minute, amPm, timezone) => {
        let hourNumber = parseInt(hour, 10);
        const minuteNumber = parseInt(minute || "0", 10);
        if (amPm.toUpperCase() === "PM" && hourNumber !== 12) {
            hourNumber += 12;
        }
        else if (amPm.toUpperCase() === "AM" && hourNumber === 12) {
            hourNumber = 0;
        }
        hourNumber += 7;
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
export { handleTimeReplacement };
