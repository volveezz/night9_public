import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import lfgTextChannelHandler from "../utils/discord/lfgSystem/handleLfgJoin.js";
import { cacheUserActivity, voiceChannelJoinTimestamps } from "../utils/discord/userActivityHandler.js";
import manageVoiceChannels from "../utils/discord/voiceChannelManager.js";
import { convertSeconds } from "../utils/general/convertSeconds.js";
import { channelDataMap, channelsForDeletion } from "../utils/persistence/dataStore.js";
let voiceLogChannel = null;
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
    if (!voiceLogChannel)
        voiceLogChannel =
            client.getCachedTextChannel(process.env.VOICE_LOG_CHANNEL_ID) || (await client.getTextChannel(process.env.VOICE_LOG_CHANNEL_ID));
    if (!oldState.channelId && newState.channelId) {
        if (!oldState.member?.user.bot && channelDataMap.has(newState.channelId))
            lfgTextChannelHandler(newState.channelId, newState.member, "join");
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} присоединился к ${newState.channel?.name}`,
            iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
        })
            .setFooter({
            text: `UId: ${userId} | ChnId: ${newState.channelId}`,
        })
            .addFields([{ name: "Канал", value: `<#${newState.channelId}>`, inline: true }]);
        return voiceLogChannel.send({ embeds: [embed] });
    }
    if (!newState.channelId) {
        if (!oldState.member?.user.bot && oldState.channelId && channelDataMap.has(oldState.channelId))
            lfgTextChannelHandler(oldState.channelId, oldState.member, "leave");
        if (oldState.channel && oldState.channel.members.size === 0 && channelsForDeletion.has(oldState.channel.id))
            oldState.channel.delete();
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} вышел из ${oldState.channel?.name}`,
            iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
        })
            .setFooter({
            text: `UId: ${oldState.member?.id} | ChnId: ${oldState.channelId}`,
        })
            .setColor(colors.error)
            .addFields({
            name: "Канал",
            value: `<#${oldState.channelId}>`,
            inline: true,
        });
    }
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        if (oldState.member && channelDataMap.has(oldState.channelId))
            lfgTextChannelHandler(oldState.channelId, oldState.member, "leave");
        if (newState.member && !newState.member.user.bot && channelDataMap.has(newState.channelId))
            lfgTextChannelHandler(newState.channelId, newState.member, "join");
        if (oldState.channel && oldState.channel.members.size === 0 && channelsForDeletion.has(oldState.channel.id))
            oldState.channel.delete();
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} сменил голосовой канал`,
            iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
        })
            .setFooter({
            text: `UId: ${userId} | Channel: ${newState.channel?.name}`,
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
//# sourceMappingURL=voiceStateUpdate.js.map