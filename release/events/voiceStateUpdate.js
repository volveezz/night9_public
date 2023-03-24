import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import convertSeconds from "../functions/utilities.js";
import { activityReceiver } from "../handlers/discordActivity.js";
import { createdChannelsMap, pvePartyVoiceChatHandler } from "../handlers/pvePartyHandler.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const voiceChannel = client.getCachedTextChannel(ids.voiceChnId);
const voiceUsers = new Map();
export default new Event("voiceStateUpdate", (oldState, newState) => {
    const embed = new EmbedBuilder().setColor(colors.success).setTimestamp();
    if (!oldState.channelId && newState.channelId) {
        if (createdChannelsMap.has(newState.channelId))
            pvePartyVoiceChatHandler(newState.channelId, newState.member, "join");
        voiceUsers.set(newState.member.id, {
            joinTimestamp: Date.now(),
        });
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} присоединился к голосовому каналу`,
            iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
        })
            .setFooter({
            text: `UId: ${newState.member?.id} | ChnId: ${newState.channelId}`,
        })
            .addFields([
            { name: "Пользователь", value: `<@${newState.member.id}>`, inline: true },
            { name: "Канал", value: `<#${newState.channelId}>`, inline: true },
        ]);
        return voiceChannel.send({ embeds: [embed] });
    }
    if (!newState.channelId) {
        if (oldState.channelId && createdChannelsMap.has(oldState.channelId))
            pvePartyVoiceChatHandler(oldState.channelId, oldState.member, "leave");
        const getTimestamp = voiceUsers.get(oldState.member.id)?.joinTimestamp;
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} вышел из голосового канала`,
            iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
        })
            .setFooter({
            text: `Chn: ${oldState.channel?.name}`,
        })
            .setColor(colors.error)
            .addFields([
            { name: "Пользователь", value: `<@${oldState.member.id}>`, inline: true },
            {
                name: "Канал",
                value: `<#${oldState.channelId}>`,
                inline: true,
            },
        ]);
        if (getTimestamp) {
            const difference = Math.trunc((Date.now() - getTimestamp) / 1000);
            embed.addFields([
                {
                    name: "Времени в голосовых",
                    value: `**${convertSeconds(difference)}**`,
                    inline: true,
                },
            ]);
            if (newState.guild.afkChannel?.id !== newState.channelId)
                activityReceiver({ userId: oldState.id, voiceTime: difference });
        }
        voiceUsers.delete(oldState.member.id);
        return voiceChannel.send({ embeds: [embed] });
    }
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        if (createdChannelsMap.has(oldState.channelId))
            pvePartyVoiceChatHandler(oldState.channelId, oldState.member, "leave");
        if (createdChannelsMap.has(newState.channelId))
            pvePartyVoiceChatHandler(newState.channelId, newState.member, "join");
        embed
            .setAuthor({
            name: `${oldState.member?.displayName || newState.member?.displayName || "пользователь не найден"} сменил голосовой канал`,
            iconURL: oldState.member?.displayAvatarURL() || newState.member?.displayAvatarURL(),
        })
            .setFooter({
            text: `UId: ${newState.member?.id} | ChnId: ${newState.channelId}`,
        })
            .addFields([
            { name: "Пользователь", value: `<@${oldState.member.id}>`, inline: true },
            { name: "До", value: `<#${oldState.channelId}>`, inline: true },
            {
                name: "После",
                value: `<#${newState.channelId}>`,
                inline: true,
            },
        ]);
        return voiceChannel.send({ embeds: [embed] });
    }
});
