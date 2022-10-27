import { ChannelType } from "discord.js";
import { BotClient } from "../index.js";
import { guildId } from "./ids.js";
export const clan = {
    joinRequest: { chnId: "696622137028640839", joinRequestGuideMessageId: "1031364561783242852" },
    questionChnId: "694119710677008425",
};
export async function msgFetcher(unresChn, msgId) {
    const chn = chnFetcher(unresChn).messages;
    const msg = chn.cache.get(msgId);
    if (!msg) {
        const fetchedMsg = await chn.fetch(msgId);
        if (!fetchedMsg) {
            throw { name: "msgFetcher Message not found", message: `${unresChn}, ${msgId}, ${chn.cache.size}` };
        }
        else {
            return fetchedMsg;
        }
    }
    else {
        return msg;
    }
}
export function chnFetcher(chn) {
    if (typeof chn === "string") {
        if (!BotClient)
            console.error(`chnFetcher bot client error`);
        const basedChannel = BotClient.guilds.cache.get(guildId)?.channels.cache.get(chn);
        if (basedChannel && basedChannel.isTextBased() && basedChannel.type === ChannelType.GuildText) {
            return basedChannel;
        }
        else {
            throw { name: "Произошла ошибка. Попробуйте снова", chn: `${chn}, ${basedChannel}, ${BotClient.user?.username}`, code: 1 };
        }
    }
    else {
        if (chn.isTextBased() && chn.type === ChannelType.GuildText) {
            return chn;
        }
        else {
            throw { name: "Произошла ошибка. Попробуйте снова", chn: chn };
        }
    }
}
