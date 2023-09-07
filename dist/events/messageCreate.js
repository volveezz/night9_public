import { EmbedBuilder, Message } from "discord.js";
import { workingCollectors } from "../buttons/adminDirectMessageButton.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Event } from "../structures/event.js";
import { RefreshManifest } from "../utils/api/ManifestManager.js";
import { manageAdminDMChannel } from "../utils/discord/adminDmManager.js";
import { handleDm } from "../utils/discord/dmHandler.js";
import { handleLfgMessage } from "../utils/discord/lfgSystem/handleLFG.js";
import { generatePatchNotes } from "../utils/discord/patchnoteGenerator.js";
import sendRegistrationLink from "../utils/discord/registration.js";
import parseTwitterLinkMessage from "../utils/discord/twitterHandler/parseTwitterLink.js";
import { cacheUserActivity } from "../utils/discord/userActivityHandler.js";
import blockRaidChannelMessages from "../utils/general/raidFunctions/blockRaidChannelMessages.js";
async function handleMessage(message) {
    if (message.channelId === process.env.MANIFEST_CHANNEL_ID) {
        return RefreshManifest();
    }
    if (message.channelId === process.env.TWITTER_MESSAGES_CHANNEL_ID &&
        message.content.match(/(?:\[Tweeted]\(\))?https:\/\/twitter\.com\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\))?/)) {
        return parseTwitterLinkMessage(message);
    }
    if (!message.author || message.author.bot || message.system || !(message instanceof Message))
        return;
    if (message.channelId === process.env.RAID_CHANNEL_ID && !message.member?.permissions.has("MentionEveryone")) {
        return blockRaidChannelMessages(message);
    }
    if (message.channelId === process.env.PATCHNOTE_GENERATOR_CHANNEL_ID) {
        return generatePatchNotes(message);
    }
    if (message.channelId === process.env.PVE_PARTY_CHANNEL_ID) {
        return handleLfgMessage(message);
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
    if (message.content === "/init" || message.content === "!init" || message.content.endsWith("init")) {
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