import { EmbedBuilder } from "discord.js";
import { colors } from "../base/colors.js";
import { dmChnSentMsgsLogger } from "./logger.js";
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
        let msgContent = message.content.trim().replaceAll("\\n", "\n").replaceAll("\\*", "\n — ");
        const isEmbed = msgContent.endsWith("embed") ? true : false;
        const userId = msgContent.split(" ").shift();
        let member = message.guild.members.cache.get(userId);
        const lastDM = lastestOpenedDM.get(message.author.id);
        member ? (msgContent = msgContent.slice(userId.length).trim()) : "";
        !member && lastDM ? (member = lastDM) : "";
        if ((!lastDM || lastDM.user.id !== member?.user.id) && member)
            lastestOpenedDM.set(message.author.id, member);
        isEmbed && msgContent.length > 5 ? (msgContent = msgContent.slice(0, -5).trim()) : "";
        if (member !== undefined) {
            const sendedMsg = await (isEmbed
                ? member.send({
                    embeds: [new EmbedBuilder().setColor(colors.default).setDescription(msgContent)],
                })
                : member.send(msgContent));
            message.delete();
            dmChnSentMsgsLogger(member, sendedMsg.content.length > 0 ? sendedMsg.content : sendedMsg.embeds[0].description, sendedMsg.id);
        }
        else {
            return console.error(`[Error code: 1113] ${userId} ${isEmbed}`);
        }
    }
}
