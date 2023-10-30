import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../../../configs/colors.js";
import { client } from "../../../../index.js";
import { RaidEvent } from "../../../persistence/sequelizeModels/raidEvent.js";
import { addButtonsToMessage } from "../../addButtonsToMessage.js";
const ENABLED_TEXT = "Система слежки за боевой группой запущена";
const DISABLED_TEXT = "Система слежки за боевой группой отключена";
async function updateFireteamNotification(raidEventOrId, isDisabling) {
    const raidEvent = typeof raidEventOrId === "number" ? await RaidEvent.findByPk(raidEventOrId, { attributes: ["channelId", "id"] }) : raidEventOrId;
    if (!raidEvent) {
        console.error("[Error Code: 2115] Failed to update fireteam notification.", raidEventOrId, isDisabling);
        return;
    }
    const { channelId, id: raidId } = raidEvent;
    const privateRaidChannel = client.getCachedTextChannel(channelId);
    if (!privateRaidChannel) {
        console.error("[Error Code: 1926] Channel not found for raid", raidId, channelId);
        return;
    }
    let fireteamNotification;
    let fireteamNotificationComponent;
    if (isDisabling) {
        fireteamNotification = new EmbedBuilder().setColor(colors.invisible).setTitle(DISABLED_TEXT);
        fireteamNotificationComponent = new ButtonBuilder()
            .setCustomId("raidInChnButton_fireteamTracker_start")
            .setLabel("Запустить")
            .setStyle(ButtonStyle.Success);
    }
    else {
        fireteamNotification = new EmbedBuilder().setColor(colors.default).setTitle(ENABLED_TEXT);
        fireteamNotificationComponent = new ButtonBuilder()
            .setCustomId("raidInChnButton_fireteamTracker_cancel")
            .setLabel("Остановить")
            .setStyle(ButtonStyle.Danger);
    }
    const notificationMessage = privateRaidChannel.messages.cache.find((m) => m.embeds?.length !== 0 && (m.embeds[0].title === ENABLED_TEXT || m.embeds[0].title === DISABLED_TEXT));
    const notificationMessageType = notificationMessage && notificationMessage.embeds[0].title === ENABLED_TEXT ? true : false;
    const messageOptions = {
        embeds: [fireteamNotification],
        components: addButtonsToMessage([fireteamNotificationComponent]),
    };
    if (!notificationMessage) {
        await privateRaidChannel.send(messageOptions).catch((_) => null);
    }
    else if (notificationMessage && isDisabling === notificationMessageType) {
        await notificationMessage.edit(messageOptions).catch((_) => null);
    }
}
export default updateFireteamNotification;
//# sourceMappingURL=fireteamNotificationUpdater.js.map