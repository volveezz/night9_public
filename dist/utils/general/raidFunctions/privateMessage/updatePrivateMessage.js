import { EmbedBuilder } from "discord.js";
import { client } from "../../../../index.js";
import getUserRaidStatusString from "./privateMessageRaidCounter.js";
import sendRaidPrivateMessage from "./sendPrivateMessage.js";
async function updatePrivateRaidMessage(raidEvent) {
    const { channelId, inChannelMessageId, joined, hotJoined, alt } = raidEvent;
    const inChnMsgPromise = client.getAsyncMessage(channelId, inChannelMessageId);
    const textForJoined = joined.map(async (userId) => getUserRaidStatusString(userId));
    const textForHotJoined = hotJoined.map(async (userId) => getUserRaidStatusString(userId));
    const textForAlt = alt.map(async (userId) => getUserRaidStatusString(userId));
    let privateChannelMessage = null;
    try {
        privateChannelMessage = await inChnMsgPromise;
    }
    catch (error) {
        console.error("[Error code: 1992]", error);
    }
    if (!privateChannelMessage) {
        privateChannelMessage = await sendRaidPrivateMessage({ raidEvent });
        if (!privateChannelMessage)
            return null;
    }
    const embed = EmbedBuilder.from(privateChannelMessage.embeds[0]);
    embed.spliceFields(1, 3);
    if (textForJoined.length > 0)
        embed.spliceFields(1, 0, { name: "Закрытия рейдов у основной группы", value: (await Promise.all(textForJoined)).join("\n") });
    if (textForHotJoined.length > 0)
        embed.spliceFields(2, 0, { name: "Закрытия рейдов у запасных участников", value: (await Promise.all(textForHotJoined)).join("\n") });
    if (textForAlt.length > 0)
        embed.spliceFields(3, 0, { name: "Закрытия рейдов у возможных участников", value: (await Promise.all(textForAlt)).join("\n") });
    return await privateChannelMessage.edit({ embeds: [embed] });
}
export default updatePrivateRaidMessage;
//# sourceMappingURL=updatePrivateMessage.js.map