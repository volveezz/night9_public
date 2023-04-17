import { EmbedBuilder, Message } from "discord.js";
import { workingCollectors } from "../buttons/adminDMInteractionHandler.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { channelIds } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { Event } from "../structures/event.js";
import { manageAdminDMChannel } from "../utils/discord/adminDmManager.js";
import { handleDm } from "../utils/discord/dmHandler.js";
import { generatePatchNotes } from "../utils/discord/patchnoteGenerator.js";
import { handlePveParty } from "../utils/discord/pvePartyHandler.js";
import sendRegistrationLink from "../utils/discord/registration.js";
import { handleTimeReplacement } from "../utils/discord/twitterMessageParser.js";
import { cacheUserActivity } from "../utils/discord/userActivityHandler.js";
const bungieHelpTwitter = "https://twitter.com/BungieHelp/status/";
async function handleMessage(message) {
    if (message.content.startsWith(bungieHelpTwitter) && message.channelId === channelIds.externalNewsFeed) {
        setTimeout(async () => {
            handleTimeReplacement({ message });
        }, 1000 * 5);
    }
    if (!message.author || message.author.bot || message.system || !(message instanceof Message))
        return;
    if (message.channelId === channelIds.patchNoteGenerator) {
        return generatePatchNotes(message);
    }
    if (message.channelId === channelIds.pveParty) {
        return handlePveParty(message);
    }
    if (message.channel.isDMBased()) {
        return handleDirectMessage(message);
    }
    if (channelIds.directMessages === message.channelId &&
        message.member?.permissions.has("Administrator") &&
        !workingCollectors.has(message.author.id)) {
        return manageAdminDMChannel(message);
    }
    if (!message.member?.roles.cache.has(statusRoles.verified))
        return;
    cacheUserActivity({ userId: message.author.id, messageId: message.id });
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
        const embed = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: error.name || "Произошла ошибка", iconURL: icons.error })
            .setDescription(error.description || error.message || null);
        console.error(`[Error code: 1217] Got message error during execution for ${message.author.username}\n`, error);
        return message.reply({ embeds: [embed] }).then((m) => setTimeout(() => m.delete(), 5000));
    }
});
