import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import { createdChannelsMap } from "../utils/discord/lfgSystem/handleLFG.js";
import lfgTextChannelHandler from "../utils/discord/lfgSystem/handleLfgJoin.js";
import { cacheUserActivity, voiceChannelJoinTimestamps } from "../utils/discord/userActivityHandler.js";
import manageVoiceChannels from "../utils/discord/voiceChannelManager.js";
import { convertSeconds } from "../utils/general/convertSeconds.js";
const voiceLogChannel = client.getCachedTextChannel(channelIds.voice);
export default new Event("voiceStateUpdate", async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) {
        return;
    }
    const embed = new EmbedBuilder().setColor(colors.success);
    const userId = newState.id || oldState.id;
    try {
        manageVoiceChannels(oldState, newState);
    }
    catch (error) {
        console.error("[Error code: 1814]", error);
    }
    if (!voiceChannelJoinTimestamps.has(userId) && newState.channelId !== newState.guild.afkChannelId && newState.channel) {
        voiceChannelJoinTimestamps.set(userId, Date.now());
    }
    if (!oldState.channelId && newState.channelId) {
        if (!oldState.member?.user.bot && createdChannelsMap.has(newState.channelId))
            lfgTextChannelHandler(newState.channelId, newState.member, "join");
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} присоединился к голосовому каналу`,
            iconURL: oldState.member?.displayAvatarURL({ forceStatic: false }) || newState.member?.displayAvatarURL({ forceStatic: false }),
        })
            .setFooter({
            text: `UId: ${userId} | ChnId: ${newState.channelId}`,
        })
            .addFields([{ name: "Канал", value: `<#${newState.channelId}>`, inline: true }]);
        return voiceLogChannel.send({ embeds: [embed] });
    }
    if (!newState.channelId) {
        if (!oldState.member?.user.bot && oldState.channelId && createdChannelsMap.has(oldState.channelId))
            lfgTextChannelHandler(oldState.channelId, oldState.member, "leave");
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} вышел из голосового канала`,
            iconURL: oldState.member?.displayAvatarURL({ forceStatic: false }) || newState.member?.displayAvatarURL({ forceStatic: false }),
        })
            .setFooter({
            text: `Chn: ${oldState.channel?.name}`,
        })
            .setColor(colors.error)
            .addFields({
            name: "Канал",
            value: `<#${oldState.channelId}>`,
            inline: true,
        });
    }
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        if (!oldState.member?.user.bot && createdChannelsMap.has(oldState.channelId))
            lfgTextChannelHandler(oldState.channelId, oldState.member, "leave");
        if (!oldState.member?.user.bot && createdChannelsMap.has(newState.channelId))
            lfgTextChannelHandler(newState.channelId, newState.member, "join");
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} сменил голосовой канал`,
            iconURL: oldState.member?.displayAvatarURL({ forceStatic: false }) || newState.member?.displayAvatarURL({ forceStatic: false }),
        })
            .setFooter({
            text: `UId: ${userId} | ChnId: ${newState.channelId}`,
        })
            .addFields([
            { name: "До", value: `<#${oldState.channelId}>`, inline: true },
            {
                name: "После",
                value: `<#${newState.channelId}>`,
                inline: true,
            },
        ]);
    }
    if (!newState.channelId || newState.channelId === newState.guild.afkChannelId) {
        checkJoinTimestamp();
    }
    try {
        await voiceLogChannel.send({ embeds: [embed] });
    }
    catch (error) {
        console.error("[Error code: 1813]", error.message, embed.data);
    }
    async function checkJoinTimestamp() {
        const userJoinTimestamp = voiceChannelJoinTimestamps.get(userId);
        if (!userJoinTimestamp)
            return;
        const secondsInVoice = Math.trunc((Date.now() - userJoinTimestamp) / 1000);
        embed.addFields({
            name: "Времени в голосовых",
            value: `${convertSeconds(secondsInVoice)}`,
            inline: true,
        });
        cacheUserActivity({ userId, voiceTime: secondsInVoice });
        voiceChannelJoinTimestamps.delete(userId);
    }
});
