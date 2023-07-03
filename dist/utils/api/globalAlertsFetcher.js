import { EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { sendApiRequest } from "./sendApiRequest.js";
let adminChannel = null;
const alertLevelColors = {
    [0]: "Grey",
    [1]: "Blue",
    [2]: "Yellow",
    [3]: "Red",
};
async function fetchAndPostAlerts() {
    const url = "/Platform/GlobalAlerts/";
    let lastAlertKey = null;
    console.debug("Running fetchAndPostAlerts...");
    try {
        const response = await sendApiRequest(url);
        const alerts = response.Response;
        if (alerts.length > 0) {
            console.debug("Alerts received:", alerts);
            const latestAlert = alerts[0];
            if (latestAlert.AlertKey !== lastAlertKey) {
                lastAlertKey = latestAlert.AlertKey;
                if (!adminChannel) {
                    adminChannel = await client.getAsyncTextChannel(process.env.ADMIN_CHANNEL_ID);
                }
                const embed = new EmbedBuilder()
                    .setTitle("New Global Alert")
                    .setDescription(latestAlert.AlertHtml)
                    .setURL(latestAlert.AlertLink)
                    .setColor(alertLevelColors[latestAlert.AlertLevel] || colors.error)
                    .addFields([
                    { name: "Alert Type", value: latestAlert.AlertType.toString() },
                    { name: "Stream Info", value: latestAlert.StreamInfo.ChannelName },
                ]);
                if (latestAlert.AlertTimestamp) {
                    embed.setTimestamp(new Date(latestAlert.AlertTimestamp));
                }
                await adminChannel.send({ embeds: [embed] });
            }
        }
    }
    catch (error) {
        console.error("[Error code: 1938] Error fetching global alerts:", error);
    }
    finally {
        setTimeout(fetchAndPostAlerts, 60000);
    }
}
export function fetchGlobalAlerts() {
    fetchAndPostAlerts();
}
//# sourceMappingURL=globalAlertsFetcher.js.map