import { EmbedBuilder, Message } from "discord.js";
import { workingCollectors } from "../buttons/adminDirectMessageButton.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Event } from "../structures/event.js";
import { refreshManifest } from "../utils/api/ManifestManager.js";
import { manageAdminDMChannel } from "../utils/discord/adminDmManager.js";
import blockChannelMessage from "../utils/discord/blockChannelMessages.js";
import { sendAdminNotification } from "../utils/discord/dmHandler.js";
import { isUserCanSendMessageInChannel } from "../utils/discord/isUserCanSendMessageInChannel.js";
import { handleLfgMessage } from "../utils/discord/lfgSystem/handleLFG.js";
import { generatePatchNotes } from "../utils/discord/patchnoteGenerator.js";
import sendRegistrationLink from "../utils/discord/registration.js";
import { processVexIncursionMessage } from "../utils/discord/restoreMessageFunctions.js";
import parseTwitterLinkMessage from "../utils/discord/twitterHandler/parseTwitterLink.js";
import { cacheUserActivity } from "../utils/discord/userActivityHandler.js";

async function handleMessage(message: Message) {
	if (message.author.id === "879470138531921920") {
		refreshManifest();
		return;
	}
	if (message.channelId === process.env.TWITTER_MESSAGES_CHANNEL_ID!) {
		if (
			message.content.length > 0 &&
			!message.cleanContent.includes("Retweeted") &&
			(message.content.match(
				/(?:\[Tweeted]\(\))?https:\/\/(twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com)\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\))?/i
			) ||
				message.content.startsWith("[⏵]"))
		) {
			parseTwitterLinkMessage(message);
		} else {
			const embed = message.embeds?.[0];
			if (!embed) return;

			// Regular expression to match either twitter.com or x.com in the URL
			const regex =
				/(?:\[(Tweeted|Quoted)\]\()?https:\/\/(twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com)\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\))?/i;
			const { title: embedTitle, url: embedUrl } = embed;

			if ((embedTitle === "Tweeted" || embedTitle === "Quoted") && embedUrl?.match(regex)) {
				parseTwitterLinkMessage(message);
			}
		}

		return;
	}

	if (message.channelId === process.env.VEX_INCURSION_CHANNEL_ID!) {
		await processVexIncursionMessage(message).catch((_) => null);
		return;
	}

	if (!message.author || message.author.bot || message.system || !(message instanceof Message)) return;

	if (isUserCanSendMessageInChannel(message.channelId, message.member?.permissions.has("MentionEveryone"))) {
		await blockChannelMessage(message).catch((e) => null);
		return;
	}

	if (message.channelId === process.env.PATCHNOTE_GENERATOR_CHANNEL_ID!) {
		await generatePatchNotes(message);
		return;
	}

	if (message.channelId === process.env.PVE_PARTY_CHANNEL_ID!) {
		if (message.cleanContent.startsWith("+")) {
			return handleLfgMessage(message);
		} else if (!message.member?.permissions.has("MentionEveryone")) {
			return blockChannelMessage(message);
		}
	}
	if (message.channel.isDMBased()) {
		return handleDirectMessage(message);
	}
	if (
		process.env.DIRECT_MESSAGES_CHANNEL_ID! === message.channelId &&
		message.member?.permissions.has("Administrator") &&
		!workingCollectors.has(message.author.id)
	) {
		return manageAdminDMChannel(message);
	}

	if (message.member?.roles.cache.has(process.env.VERIFIED!)) {
		cacheUserActivity({ userId: message.author.id, messageId: message.id });
	}
}

async function handleDirectMessage(message: Message) {
	if (message.content.includes("init") && message.channel.isSendable()) {
		return message.channel.send({ embeds: [await sendRegistrationLink(message)] });
	}

	sendAdminNotification(message);

	return;
}

export default new Event("messageCreate", async (message) => {
	try {
		await handleMessage(message);
	} catch (error: any) {
		console.error(`[Error code: 1217] Got message error during execution for ${message.author.username}\n`, error);

		const embed = new EmbedBuilder()
			.setColor(colors.error)
			.setAuthor({ name: error.name || "Произошла ошибка", iconURL: icons.error })
			.setDescription(error.description || error.message || null);

		return message.reply({ embeds: [embed] }).then((m) => setTimeout(() => m.delete(), 5000));
	}
});
