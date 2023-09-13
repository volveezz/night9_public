import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../../../configs/colors.js";
import { client } from "../../../../index.js";
import { addButtonsToMessage } from "../../addButtonsToMessage.js";
async function sendPrivateChannelNotify(raidData) {
    const { channelId, id: raidId } = raidData;
    const fireteamCheckingNotification = new EmbedBuilder().setColor(colors.default).setTitle("Система слежка за составом запущена");
    const fireTeamCheckingNotificationComponents = new ButtonBuilder()
        .setCustomId("raidInChnButton_fireteamChecker_cancel")
        .setLabel("Отключить")
        .setStyle(ButtonStyle.Danger);
    const privateRaidChannel = client.getCachedTextChannel(channelId);
    if (!privateRaidChannel) {
        console.error("[Error code: 1926] Channel not found", raidId, channelId);
        return;
    }
    const wasMessageAlreadySent = privateRaidChannel.messages.cache.find((m) => m.embeds?.length !== 0 && m.embeds[0].title === "Система слежка за составом запущена");
    if (wasMessageAlreadySent) {
        console.debug("Fireteam checker system message was already sent");
        return;
    }
    await privateRaidChannel.send({
        embeds: [fireteamCheckingNotification],
        components: addButtonsToMessage([fireTeamCheckingNotificationComponents]),
    });
}
export default sendPrivateChannelNotify;
//# sourceMappingURL=sendCheckerNotify.js.map