import { EmbedBuilder } from "discord.js";
import { bungieNames } from "../../../core/userStatisticsManagement.js";
import { client } from "../../../index.js";
import { escapeString } from "../../general/utilities.js";
import { channelDataMap } from "./handleLFG.js";
export async function removeChannelData(data) {
    const channelData = typeof data === "string" ? channelDataMap.get(data) : data;
    if (!channelData)
        return;
    const channelId = channelData.voiceChannel.id;
    if (channelData.isDeletable) {
        try {
            const userVoiceCount = (await client.getCachedGuild().channels.fetch(channelId))?.members.size;
            if (!userVoiceCount || userVoiceCount == 0)
                channelData.voiceChannel.delete("Last member disconnected");
        }
        catch (error) {
            console.error("[Error code: 1820]", error);
        }
    }
    try {
        channelData.channelMessage.delete();
    }
    catch (error) {
        console.error("[Error code: 1821]", error);
    }
    channelDataMap.delete(channelId);
    return true;
}
async function handleTextChannel(channelId, member, action) {
    const channelData = channelDataMap.get(channelId);
    if (!channelData)
        return;
    if (channelData.members.includes(member.id) && action === "leave") {
        channelData.members.splice(channelData.members.indexOf(member.id), 1);
    }
    else if (action === "join") {
        channelData.members.push(member.id);
    }
    if (channelData.members.length === 0) {
        await removeChannelData(channelData);
        return;
    }
    const embed = EmbedBuilder.from(channelData.channelMessage.embeds[0]);
    if (embed.data.title) {
        const memberCount = parseInt(embed.data.title);
        const updatedCount = action === "join" ? memberCount - 1 : memberCount + 1;
        embed.setTitle(embed.data.title.replace(/\d+/, `${updatedCount > 0 ? updatedCount : 0}`));
    }
    const membersFieldIndex = embed.data.fields?.findIndex((v) => v.name.startsWith("Состав группы"));
    const updatedMembersFieldValue = channelData.members
        .map((id, i) => {
        const bungieName = bungieNames.get(id);
        return `${i + 1}. <@${id}>${bungieName ? ` — ${escapeString(bungieName)}` : ""}`;
    })
        .join("\n");
    const membersReadyField = {
        name: "Состав группы",
        value: updatedMembersFieldValue,
    };
    membersFieldIndex && membersFieldIndex >= 1
        ? embed.data.fields?.splice(membersFieldIndex, 1, membersReadyField)
        : embed.addFields(membersReadyField);
    await channelData.channelMessage.edit({ embeds: [embed] }).then((message) => channelDataMap.set(channelId, {
        ...channelData,
        channelMessage: message,
    }));
}
export default handleTextChannel;
