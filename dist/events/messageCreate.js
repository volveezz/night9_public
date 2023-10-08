import { EmbedBuilder, Message } from "discord.js";
import { workingCollectors } from "../buttons/adminDirectMessageButton.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Event } from "../structures/event.js";
import { refreshManifest } from "../utils/api/ManifestManager.js";
import { manageAdminDMChannel } from "../utils/discord/adminDmManager.js";
import blockChannelMessage from "../utils/discord/blockChannelMessages.js";
import { handleDm } from "../utils/discord/dmHandler.js";
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
        for (let embed of message.embeds) {
            const { title: embedTitle, url: embedUrl } = embed;
            if (message.content.length > 0 &&
                !message.cleanContent.includes("Retweeted") &&
                message.content.match(/(?:\[Tweeted]\(\))?https:\/\/twitter\.com\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\))?/)) {
                parseTwitterLinkMessage(message);
            }
            else {
                const regex = /(?:\[(Tweeted|Quoted)\]\()?https:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\))?/;
                if ((embedTitle === "Tweeted" || embedTitle === "Quoted") && embedUrl?.match(regex)) {
                    parseTwitterLinkMessage(message);
                }
            }
        }
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
async function handleDirectMessage(message) {
    if (message.content.includes("init")) {
        return message.channel.send({ embeds: [await sendRegistrationLink(message)] });
    }
    return handleDm(message);
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