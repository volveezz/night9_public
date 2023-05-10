import { EmbedBuilder } from "discord.js";
import { bungieNames } from "../../../core/userStatisticsManagement.js";
import { escapeString } from "../../general/utilities.js";
import { createdChannelsMap } from "./handleLFG.js";
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
        return createdChannel.message.delete().then((r) => {
            createdChannelsMap.delete(channelId);
            if (createdChannel.deletable)
                createdChannel.voice.delete("Last member disconnected");
        });
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
        joined: createdChannel.joined,
        message,
        voice: createdChannel.voice,
        deletable: createdChannel.deletable,
    }));
}
export default lfgTextChannelHandler;
