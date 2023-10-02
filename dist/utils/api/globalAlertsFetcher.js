import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { lastAlertsTimestamps, originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
import { sendApiRequest } from "./sendApiRequest.js";
import translateDestinyText from "./translateDestinyText.js";
let newsChannel = null;
const alertLevelColors = {
    [0]: "Grey",
    [1]: "Blue",
    [2]: "Yellow",
    [3]: "Red",
};
async function fetchAndPostAlerts() {
    const url = "/Platform/GlobalAlerts/";
    const BUNGIEHELP_URL = "https://twitter.com/BungieHelp";
    executeFetch();
    async function executeFetch() {
        try {
            const alerts = await sendApiRequest(url);
            if (!alerts) {
                console.error("[Error code: 2076] Failed to fetch Bungie global alerts");
                return;
            }
            if (alerts.length > 0) {
                alerts.forEach(async (latestAlert) => {
                    if (lastAlertsTimestamps.has(latestAlert.AlertTimestamp))
                        return;
                    lastAlertsTimestamps.add(latestAlert.AlertTimestamp);
                    if (!newsChannel) {
                        newsChannel =
                            client.getCachedTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID) ||
                                (await client.getTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID));
                    }
                    const embed = new EmbedBuilder()
                        .setTitle(latestAlert.AlertKey || "New Global Alert")
                        .setDescription(latestAlert.AlertHtml)
                        .setURL(latestAlert.AlertLink === BUNGIEHELP_URL ? null : latestAlert.AlertLink)
                        .setColor(alertLevelColors[latestAlert.AlertLevel] || colors.error);
                    if (latestAlert.StreamInfo?.ChannelName) {
                        embed.addFields([{ name: "Stream Channel", value: latestAlert.StreamInfo.ChannelName }]);
                    }
                    let translatedDescription = null;
                    let components = [];
                    if (latestAlert.AlertHtml && latestAlert.AlertHtml !== "") {
                        try {
                            translatedDescription = await translateDestinyText(latestAlert.AlertHtml);
                            if (translatedDescription && translatedDescription !== latestAlert.AlertHtml) {
                                embed.setDescription(translatedDescription);
                                components = [
                                    new ButtonBuilder()
                                        .setCustomId("twitter_showOriginal")
                                        .setLabel("Оригинал")
                                        .setStyle(ButtonStyle.Secondary),
                                ];
                            }
                        }
                        catch (error) {
                            console.error("[Error code: 1980] Error translating global alert:", error);
                        }
                    }
                    await newsChannel.send({ embeds: [embed], components: addButtonsToMessage(components) }).then((message) => {
                        if (translatedDescription) {
                            const voteRecord = { original: new Set(), translation: new Set() };
                            twitterOriginalVoters.set(message.id, voteRecord);
                            originalTweetData.set(message.id, latestAlert.AlertHtml);
                        }
                    });
                });
            }
            else if (lastAlertsTimestamps.size > 0) {
                lastAlertsTimestamps.clear();
            }
        }
        catch (error) {
            console.error(`[Error code: 1938] Received ${error.statusCode} error while fetching global alerts`);
        }
        finally {
            setTimeout(executeFetch, 60000);
        }
    }
}
export function fetchGlobalAlerts() {
    fetchAndPostAlerts();
}
//# sourceMappingURL=globalAlertsFetcher.js.map