import { GlobalAlert, GlobalAlertLevel } from "bungie-api-ts/core";
import { ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder, TextChannel } from "discord.js";
import { TwitterButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
import { redisClient } from "../persistence/redis.js";
import { sendApiRequest } from "./sendApiRequest.js";
import translateDestinyText from "./translateDestinyText.js";

let newsChannel: TextChannel | null = null;

const alertLevelColors: { [key in GlobalAlertLevel]: ColorResolvable } = {
	[GlobalAlertLevel.Unknown]: "Grey",
	[GlobalAlertLevel.Blue]: "Blue",
	[GlobalAlertLevel.Yellow]: "Yellow",
	[GlobalAlertLevel.Red]: colors.error,
};

let latestAlertTimestamp: Date;

async function fetchAndPostAlerts() {
	const url = "/Platform/GlobalAlerts/";
	const BUNGIEHELP_URL = "https://twitter.com/BungieHelp";

	if (!latestAlertTimestamp) {
		latestAlertTimestamp = await fetchLastAlertTimestamp();
	}

	executeFetch();

	async function executeFetch() {
		try {
			if (!latestAlertTimestamp) {
				latestAlertTimestamp = await fetchLastAlertTimestamp();
			}

			const alerts = await sendApiRequest<GlobalAlert[]>(url);

			if (!alerts) {
				console.error("[Error code: 2076] Failed to fetch Bungie global alerts");
				return;
			}

			if (alerts.length > 0) {
				for (const alert of alerts) {
					const alertDate = new Date(alert.AlertTimestamp);

					if (alertDate <= latestAlertTimestamp) return;

					latestAlertTimestamp = new Date(alert.AlertTimestamp);

					if (!newsChannel) newsChannel = await client.getTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID!);

					const embed = new EmbedBuilder()
						.setTitle(alert.AlertKey || "New Global Alert")
						.setDescription(alert.AlertHtml)
						.setURL(alert.AlertLink === BUNGIEHELP_URL ? null : alert.AlertLink)
						.setColor(alertLevelColors[alert.AlertLevel] || colors.error);

					if (alert.StreamInfo?.ChannelName) {
						embed.addFields({ name: "Stream Channel", value: alert.StreamInfo.ChannelName });
					}

					let translatedDescription: string | null = null;
					let components: ButtonBuilder[] = [];

					if (alert.AlertHtml && alert.AlertHtml !== "") {
						try {
							translatedDescription = await translateDestinyText(alert.AlertHtml);

							if (translatedDescription && translatedDescription !== alert.AlertHtml) {
								embed.setDescription(translatedDescription);
								components = [
									new ButtonBuilder()
										.setCustomId(TwitterButtons.showOriginal)
										.setLabel("Оригинал")
										.setStyle(ButtonStyle.Secondary),
								];
							}
						} catch (error) {
							console.error("[Error code: 1980] Error translating global alert:", error);
						}
					}

					await newsChannel.send({ embeds: [embed], components: addButtonsToMessage(components) }).then(async (message) => {
						try {
							const serializedData = JSON.stringify(latestAlertTimestamp);
							await redisClient.set("latestAlertTimestamp", serializedData);
						} catch (error) {
							console.error("[Error code: 2104] Failed to update latestAlertTimestamp in Redis:", error);
						}

						if (translatedDescription) {
							const voteRecord = { original: new Set<string>(), translation: new Set<string>() };
							twitterOriginalVoters.set(message.id, voteRecord);
							originalTweetData.set(message.id, alert.AlertHtml);
						}
					});
				}
			}
		} catch (error: any) {
			console.error(`[Error code: 1938] Received ${error.statusCode} error while fetching global alerts`);
		} finally {
			setTimeout(executeFetch, 60000); // reschedule the function
		}
	}
}

async function fetchLastAlertTimestamp(): Promise<Date> {
	let latestAlertTimestamp: Date;

	try {
		const redisLatestAlertTimestamp = await redisClient.get("latestAlertTimestamp");

		if (redisLatestAlertTimestamp) {
			const parsedData = new Date(JSON.parse(redisLatestAlertTimestamp));
			latestAlertTimestamp = parsedData;
		} else {
			// Handle the case where redisLatestAlertTimestamp is null or undefined.
			latestAlertTimestamp = new Date();
		}
	} catch (error) {
		console.error("[Error code: 2105] Failed to fetch latestAlertTimestamp from Redis:", error);
		latestAlertTimestamp = new Date();
	}

	return latestAlertTimestamp;
}

export function fetchGlobalAlerts() {
	fetchAndPostAlerts(); // initial run
}
