import { EmbedBuilder, Message } from "discord.js";
import { workingCollectors } from "../buttons/adminDirectMessageButton.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Event } from "../structures/event.js";
import { refreshManifest } from "../utils/api/ManifestManager.js";
import { manageAdminDMChannel } from "../utils/discord/adminDmManager.js";
import blockChannelMessage from "../utils/discord/blockChannelMessages.js";
import { sendAdminNotification } from "../utils/discord/dmHandler.js";
import { handleLfgMessage } from "../utils/discord/lfgSystem/handleLFG.js";
import { generatePatchNotes } from "../utils/discord/patchnoteGenerator.js";
import sendRegistrationLink from "../utils/discord/registration.js";
import parseTwitterLinkMessage from "../utils/discord/twitterHandler/parseTwitterLink.js";
import { cacheUserActivity } from "../utils/discord/userActivityHandler.js";
async function handleMessage(message) {
    if (message.author.id === "879470138531921920") {
        refreshManifest();
        return;
    }
    if (message.channelId === process.env.TWITTER_MESSAGES_CHANNEL_ID) {
        if (message.content.length > 0 &&
            !message.cleanContent.includes("Retweeted") &&
            message.content.match(/(?:\[Tweeted]\(\))?https:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\))?/)) {
            parseTwitterLinkMessage(message);
        }
        else {
            const embed = message.embeds?.[0];
            if (!embed)
                return;
            const regex = /(?:\[(Tweeted|Quoted)\]\()?https:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\))?/;
            const { title: embedTitle, url: embedUrl } = embed;
            if ((embedTitle === "Tweeted" || embedTitle === "Quoted") && embedUrl?.match(regex)) {
                parseTwitterLinkMessage(message);
            }
        }
        return;
    }
    if (message.channelId === process.env.VEX_INCURSION_CHANNEL_ID) {
        processVexIncursionMessage(message).catch((e) => null);
        return;
    }
    if (!message.author || message.author.bot || message.system || !(message instanceof Message))
        return;
    if (message.channelId === process.env.RAID_CHANNEL_ID && !message.member?.permissions.has("MentionEveryone")) {
        return blockChannelMessage(message);
    }
    if (message.channelId === process.env.PATCHNOTE_GENERATOR_CHANNEL_ID) {
        return generatePatchNotes(message);
    }
    if (message.channelId === process.env.PVE_PARTY_CHANNEL_ID) {
        if (message.cleanContent.startsWith("+")) {
            return handleLfgMessage(message);
        }
        else if (!message.member?.permissions.has("MentionEveryone")) {
            return blockChannelMessage(message);
        }
    }
    if (message.channel.isDMBased()) {
        return handleDirectMessage(message);
    }
    if (process.env.DIRECT_MESSAGES_CHANNEL_ID === message.channelId &&
        message.member?.permissions.has("Administrator") &&
        !workingCollectors.has(message.author.id)) {
        return manageAdminDMChannel(message);
    }
    if (message.member?.roles.cache.has(process.env.VERIFIED)) {
        cacheUserActivity({ userId: message.author.id, messageId: message.id });
    }
}
async function processVexIncursionMessage(message) {
    console.debug('Found a message in "Vex Incursion" channel');
    const timestampField = message.embeds?.[0]?.fields?.find((field) => field.value.startsWith("<t:"));
    if (!timestampField)
        return;
    console.debug("Found a timestamp field in the message", timestampField.value);
    const regex = /<t:(\d+):R>/;
    const match = message.content.match(regex);
    if (!match)
        return;
    console.debug("Found timestamp in message content", match[1]);
    console.debug("Setting a new timeout to delete the message");
    const timeout = parseInt(match[1]) * 1000 - Date.now() + 60 * 1000 * 5;
    console.debug("Timeout is", timeout);
    setTimeout(() => {
        console.debug("Deleting message", message.id);
        message.delete().catch((_) => null);
    }, timeout);
}
async function handleDirectMessage(message) {
    if (message.content.includes("init")) {
        return message.channel.send({ embeds: [await sendRegistrationLink(message)] });
    }
    sendAdminNotification(message);
    return;
}
export default new Event("messageCreate", async (message) => {
    try {
        await handleMessage(message);
    }
    catch (error) {
        console.error(`[Error code: 1217] Got message error during execution for ${message.author.username}\n`, error);
        const embed = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: error.name || "Произошла ошибка", iconURL: icons.error })
            .setDescription(error.description || error.message || null);
        return message.reply({ embeds: [embed] }).then((m) => setTimeout(() => m.delete(), 5000));
    }
});
//# sourceMappingURL=messageCreate.js.map