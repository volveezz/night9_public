import { EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { descriptionFormatter, isSnowflake } from "../general/utilities.js";
import { sendDmLogMessage } from "../logging/logger.js";
const lastOpenedDM = new Map();
async function sendDirectMessage(member, isEmbed, content, originatingMessage) {
    try {
        const sentMessage = await (isEmbed
            ? member.send({
                embeds: [new EmbedBuilder().setColor(colors.default).setDescription(content)],
            })
            : member.send(content));
        originatingMessage.delete();
        sendDmLogMessage(member, sentMessage.content.length > 0 ? sentMessage.content : sentMessage.embeds[0].description, sentMessage.id);
    }
    catch (error) {
        const isBlockedDM = error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser ? true : false;
        const errorEmbed = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({
            name: `Пытались отправить: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
            iconURL: member.displayAvatarURL(),
        })
            .setDescription(content)
            .setFooter({ text: `UId: ${member.id}` });
        if (isBlockedDM) {
            errorEmbed.setTitle("Пользователь закрыл личные сообщения");
        }
        else {
            console.error("[Error code: 1429] Error during sending DM", { error });
            errorEmbed.setTitle("Произошла неожиданная ошибка во время отправки сообщения");
        }
        originatingMessage.delete();
        return originatingMessage.channel.send({ embeds: [errorEmbed] });
    }
}
export async function manageAdminDMChannel(message) {
    let messageContent = message.content;
    const isEmbed = messageContent.endsWith("embed");
    const userId = messageContent.split(" ").shift();
    const lastDM = lastOpenedDM.get(message.author.id);
    if (!isSnowflake(userId) && !lastDM)
        return;
    const member = (isSnowflake(userId) && !lastDM) || (isSnowflake(userId) && userId !== lastDM?.id) ? await client.getMember(userId) : lastDM;
    if (member && isSnowflake(userId) && userId === member.id) {
        messageContent = messageContent.slice(userId.length).trim();
    }
    if ((!lastDM || lastDM.user.id !== member?.user.id) && member) {
        lastOpenedDM.set(message.author.id, member);
    }
    if (isEmbed && messageContent.length > 5) {
        messageContent = messageContent.slice(0, -5).trim();
    }
    if (messageContent.length <= 0)
        return;
    if (member != null) {
        await sendDirectMessage(member, isEmbed, descriptionFormatter(messageContent), message);
    }
    else {
        return console.error(`[Error code: 1113] ${userId} ${isEmbed}`);
    }
}
//# sourceMappingURL=adminDmManager.js.map