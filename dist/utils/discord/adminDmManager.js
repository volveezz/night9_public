import { EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { descriptionFormatter, isSnowflake } from "../general/utilities.js";
import { logClientDmMessages } from "../logging/logger.js";
const lastestOpenedDM = new Map();
export async function adminDmChnManager(message) {
    if (message.guild) {
        try {
            await new Promise((res) => setTimeout(res, 100));
            await message.fetch();
        }
        catch (error) {
            return;
        }
        let msgContent = descriptionFormatter(message.content);
        const isEmbed = msgContent.endsWith("embed") ? true : false;
        const userId = msgContent.split(" ").shift();
        const lastDM = lastestOpenedDM.get(message.author.id);
        if (!isSnowflake(userId) && !lastDM)
            return;
        const member = (isSnowflake(userId) && !lastDM) || (isSnowflake(userId) && userId !== lastDM?.id)
            ? message.guild.members.cache.get(userId) ||
                client.getCachedMembers().get(userId) ||
                (await client.getCachedGuild().members.fetch(userId))
            : lastDM;
        member && isSnowflake(userId) && userId === member.id ? (msgContent = msgContent.slice(userId.length).trim()) : "";
        if ((!lastDM || lastDM.user.id !== member?.user.id) && member)
            lastestOpenedDM.set(message.author.id, member);
        isEmbed && msgContent.length > 5 ? (msgContent = msgContent.slice(0, -5).trim()) : "";
        if (msgContent.length <= 0)
            return;
        if (member != null) {
            try {
                const sendedMsg = await (isEmbed
                    ? member.send({
                        embeds: [new EmbedBuilder().setColor(colors.default).setDescription(msgContent || "nothing")],
                    })
                    : member.send(msgContent));
                message.delete();
                logClientDmMessages(member, sendedMsg.content.length > 0 ? sendedMsg.content : sendedMsg.embeds[0].description, sendedMsg.id);
            }
            catch (error) {
                console.error(`[Error code: 1429] Error during sending DM`, { error });
                const errorEmbed = new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle("Произошла ошибка во время отправки сообщения")
                    .setAuthor({
                    name: `Пытались отправить: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
                    iconURL: member.displayAvatarURL(),
                })
                    .setTimestamp()
                    .setDescription(msgContent || "nothing")
                    .setFooter({ text: `UId: ${member.id}` });
                return message.channel.send({ embeds: [errorEmbed] });
            }
        }
        else {
            return console.error(`[Error code: 1113] ${userId} ${isEmbed}`);
        }
    }
}
