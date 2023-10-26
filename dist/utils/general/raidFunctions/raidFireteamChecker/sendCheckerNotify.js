import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../../../configs/colors.js";
import { client } from "../../../../index.js";
import { RaidEvent } from "../../../persistence/sequelizeModels/raidEvent.js";
import { addButtonsToMessage } from "../../addButtonsToMessage.js";
async function updateFireteamCheckerNotify(raidEventOrId, isDisabling) {
    const raidEvent = typeof raidEventOrId === "number" ? await RaidEvent.findByPk(raidEventOrId, { attributes: ["channelId", "id"] }) : raidEventOrId;
    if (!raidEvent) {
        console.error("[Error code: 2115]", raidEventOrId, isDisabling);
        return;
    }
    const { channelId, id: raidId } = raidEvent;
    const privateRaidChannel = client.getCachedTextChannel(channelId);
    if (!privateRaidChannel) {
        console.error("[Error code: 1926] Channel not found", raidId, channelId);
        return;
    }
    let fireteamCheckingNotification;
    let fireteamCheckingNotificationComponent;
    if (isDisabling) {
        fireteamCheckingNotification = new EmbedBuilder().setColor(colors.invisible).setTitle("Система слежки за боевой группой отключена");
        fireteamCheckingNotificationComponent = new ButtonBuilder()
            .setCustomId("raidInChnButton_fireteamChecker_start")
            .setLabel("Запустить")
            .setStyle(ButtonStyle.Success);
    }
    else {
        fireteamCheckingNotification = new EmbedBuilder().setColor(colors.default).setTitle("Система слежки за боевой группой запущена");
        fireteamCheckingNotificationComponent = new ButtonBuilder()
            .setCustomId("raidInChnButton_fireteamChecker_cancel")
            .setLabel("Отключить")
            .setStyle(ButtonStyle.Danger);
    }
    const notificationMessage = privateRaidChannel.messages.cache.find((m) => m.embeds?.length !== 0 &&
        (m.embeds[0].title === "Система слежки за боевой группой запущена" ||
            m.embeds[0].title === "Система слежки за боевой группой отключена"));
    const notificationMessageType = notificationMessage && notificationMessage.embeds[0].title === "Система слежки за боевой группой запущена" ? true : false;
    const messageOptions = {
        embeds: [fireteamCheckingNotification],
        components: addButtonsToMessage([fireteamCheckingNotificationComponent]),
    };
    if (!notificationMessage) {
        await privateRaidChannel.send(messageOptions);
    }
    else if (notificationMessage && isDisabling === notificationMessageType) {
        await notificationMessage.edit(messageOptions);
    }
}
export default updateFireteamCheckerNotify;
//# sourceMappingURL=sendCheckerNotify.js.map