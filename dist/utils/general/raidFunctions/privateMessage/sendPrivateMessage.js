import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import raidsGuide from "../../../../configs/raidGuideData.js";
import { client } from "../../../../index.js";
import { addButtonsToMessage } from "../../addButtonsToMessage.js";
import { getRaidDetails, raidChallenges } from "../../raidFunctions.js";
import getDefaultRaidComponents from "../getDefaultRaidComponents.js";
import updatePrivateRaidMessage from "./updatePrivateMessage.js";
async function sendRaidPrivateMessage({ channel, raidEvent: raidData, oldMessage, transaction }) {
    const participantEmbed = new EmbedBuilder()
        .setColor("#F3AD0C")
        .addFields([{ name: "Испытания этой недели", value: "⁣　⁣*на одном из этапов*\n\n**Модификаторы рейда**\n　*если есть...*" }]);
    const components = getDefaultRaidComponents(oldMessage?.components[0]);
    if (raidData.raid in raidsGuide) {
        components.push(new ButtonBuilder().setCustomId(`raidGuide_${raidData.raid}`).setLabel("Руководство по рейду").setStyle(ButtonStyle.Primary));
    }
    const raidChannel = await client.getTextChannel(channel || raidData.channelId);
    const message = await raidChannel.send({
        embeds: [participantEmbed],
        components: addButtonsToMessage(components),
    });
    raidData.inChannelMessageId = message.id;
    if (!transaction) {
        await raidData.save({ transaction });
    }
    await updatePrivateRaidMessage(raidData);
    await raidChallenges({
        privateChannelMessage: message,
        raidData: getRaidDetails(raidData.raid, raidData.difficulty),
        raidEvent: raidData,
    });
    return message;
}
export default sendRaidPrivateMessage;
//# sourceMappingURL=sendPrivateMessage.js.map