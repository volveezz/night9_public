import { EmbedBuilder } from "discord.js";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { pause } from "../utilities.js";
const notifiedUsers = new Set();
let recentlyNotified = false;
const notifyEmbed = new EmbedBuilder()
    .setColor(colors.warning)
    .setAuthor({ name: "В этом канале нельзя отправлять сообщения!", iconURL: icons.warning })
    .setDescription("По всем вопросам, связанным с рейдом, обращайтесь в уникальный канал для этого рейда, который создается автоматически для каждого существующего рейда.\nДоступ к каналу вы получите после присоединения к рейду как его участник или как возможный участник.");
async function blockRaidChannelMessages(message) {
    const { channel, author } = message;
    setTimeout(() => {
        message.delete().catch((e) => { });
    }, 1000 * 5);
    if (notifiedUsers.has(author.id))
        return;
    notifiedUsers.add(author.id);
    if (recentlyNotified)
        return;
    recentlyNotified = true;
    const notifyMessage = await channel.send({ embeds: [notifyEmbed] });
    await pause(1000 * 10);
    await notifyMessage.delete().catch((e) => { });
    recentlyNotified = false;
}
export default blockRaidChannelMessages;
//# sourceMappingURL=blockRaidChannelMessages.js.map