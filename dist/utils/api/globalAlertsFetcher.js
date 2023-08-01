import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { translateDestinyText } from "../discord/twitterHandler/twitterMessageParser.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { lastAlertKeys, originalTweetData, twitterOriginalVoters } from "../persistence/dataStore.js";
import { sendApiRequest } from "./sendApiRequest.js";
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
            if (alerts.length > 0) {
                alerts.forEach(async (latestAlert) => {
                    if (lastAlertKeys.has(latestAlert.AlertKey))
                        return;
                    lastAlertKeys.add(latestAlert.AlertKey);
                    if (!newsChannel) {
                        newsChannel = await client.getAsyncTextChannel(process.env.ENGLISH_NEWS_CHANNEL_ID);
                    }
                    const embed = new EmbedBuilder()
                        .setTitle(latestAlert.AlertKey || "New Global Alert")
                        .setDescription(latestAlert.AlertHtml)
                        .setURL(latestAlert.AlertLink === BUNGIEHELP_URL ? null : latestAlert.AlertLink)
                        .setColor(alertLevelColors[latestAlert.AlertLevel] || colors.error);
                    if (latestAlert.StreamInfo?.ChannelName) {
                        embed.addFields([{ name: "Stream Channel", value: latestAlert.StreamInfo.ChannelName }]);
                    }
                    let translatedDescription = undefined;
                    let components = [];
                    try {
                        translatedDescription = await translateDestinyText(latestAlert.AlertHtml);
                        if (translatedDescription && translatedDescription !== latestAlert.AlertHtml) {
                            embed.setDescription(translatedDescription);
                            components = [
                                new ButtonBuilder().setCustomId("twitter_showOriginal").setLabel("Оригинал").setStyle(ButtonStyle.Secondary),
                            ];
                        }
                    }
                    catch (error) {
                        console.error("[Error code: 1980] Error translating global alert:", error);
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
        }
        catch (error) {
            console.error("[Error code: 1938] Error fetching global alerts:", error);
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