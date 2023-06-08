import { EmbedBuilder } from "discord.js";
import { bungieNames } from "../../../core/userStatisticsManagement.js";
import { client } from "../../../index.js";
import { escapeString } from "../../general/utilities.js";
import { createdChannelsMap } from "./handleLFG.js";
export async function deleteLfgData(channelData) {
    const lfgData = typeof channelData === "string" ? createdChannelsMap.get(channelData) : channelData;
    if (!lfgData)
        return;
    const lfgChannelId = lfgData.voice.id;
    if (lfgData.deletable) {
        try {
            const userVoiceCount = (await client.getCachedGuild().channels.fetch(lfgChannelId))?.members.size;
            if (!userVoiceCount || userVoiceCount == 0)
                lfgData.voice.delete("Last member disconnected");
        }
        catch (error) {
            console.error("[Error code: 1820]", error);
        }
    }
    try {
        lfgData.message.delete();
    }
    catch (error) {
        console.error("[Error code: 1821]", error);
    }
    createdChannelsMap.delete(lfgChannelId);
    return true;
}
async function lfgTextChannelHandler(channelId, member, state) {
    const createdChannel = createdChannelsMap.get(channelId);
    if (!createdChannel)
        return;
    if (createdChannel.joined.includes(member.id) && state === "leave") {
        createdChannel.joined.splice(createdChannel.joined.indexOf(member.id), 1);
    }
    else if (state === "join") {
        createdChannel.joined.push(member.id);
    }
    if (createdChannel.joined.length === 0) {
        await deleteLfgData(createdChannel);
        return;
    }
    const embed = EmbedBuilder.from(createdChannel.message.embeds[0]);
    if (embed.data.title) {
        const joinedCount = parseInt(embed.data.title);
        const updatedCount = state === "join" ? joinedCount - 1 : joinedCount + 1;
        embed.setTitle(embed.data.title.replace(/\d+/, `${updatedCount > 0 ? updatedCount : 0}`));
    }
    const joinedUsersFieldIndex = embed.data.fields?.findIndex((v) => v.name.startsWith("Состав группы"));
    const joinedUsersUpdatedFieldValue = createdChannel.joined
        .map((id, i) => {
        const bungieName = bungieNames.get(id);
        return `${i + 1}. <@${id}>${bungieName ? ` — ${escapeString(bungieName)}` : ""}`;
    })
        .join("\n");
    const joinedUsersReadyField = {
        name: "Состав группы",
        value: joinedUsersUpdatedFieldValue,
    };
    joinedUsersFieldIndex && joinedUsersFieldIndex >= 1
        ? embed.data.fields?.splice(joinedUsersFieldIndex, 1, joinedUsersReadyField)
        : embed.addFields(joinedUsersReadyField);
    await createdChannel.message.edit({ embeds: [embed] }).then((message) => createdChannelsMap.set(channelId, {
        ...createdChannel,
        message,
    }));
}
export default lfgTextChannelHandler;
