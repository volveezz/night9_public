import { ChannelType } from "discord.js";
import { channelDataMap } from "../persistence/dataStore.js";
import { VoiceChannels } from "../persistence/sequelize.js";
const managedVoiceChannelIds = new Set();
const ignoredCategories = new Set([process.env.ADMIN_CATEGORY, process.env.TECHNICAL_CATEGORY]);
const romanNumbers = ["𝐈", "𝐈𝐈", "𝐈𝐈𝐈", "𝐈𝐕", "𝐕", "𝐕𝐈", "𝐕𝐈𝐈", "𝐕𝐈𝐈𝐈", "𝐈𝐗", "𝐗"];
async function loadChannels() {
    const channels = await VoiceChannels.findAll();
    channels.forEach((channel) => managedVoiceChannelIds.add(channel.channelId));
}
loadChannels();
async function manageVoiceChannels(oldState, newState) {
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    if (oldChannel && oldChannel.parentId && !ignoredCategories.has(oldChannel.parentId)) {
        const parentChannels = oldChannel.parent.children.cache.filter((channel) => channel.type === ChannelType.GuildVoice);
        if (!parentChannels)
            return;
        const allChannelsEmpty = parentChannels.every((channel) => channel.members.size === 0);
        if (allChannelsEmpty) {
            parentChannels.forEach(async (channel) => {
                if (managedVoiceChannelIds.has(channel.id)) {
                    await removeChannel(channel);
                }
            });
        }
        else if (managedVoiceChannelIds.has(oldChannel.id) && oldChannel.members.size === 0) {
            const emptyChannels = parentChannels.filter((channel) => channel.members.size === 0);
            const sortedEmptyChannels = emptyChannels.sort((a, b) => {
                const numeralA = a.name.match(/[𝐈𝐕𝐗]+$/)?.[0] || "𝐈";
                const numeralB = b.name.match(/[𝐈𝐕𝐗]+$/)?.[0] || "𝐈";
                return romanNumbers.indexOf(numeralA) - romanNumbers.indexOf(numeralB);
            });
            const highestEmptyChannel = sortedEmptyChannels.at(sortedEmptyChannels.size - 1);
            if (emptyChannels.size > 1) {
                await removeChannel(highestEmptyChannel || oldChannel);
            }
        }
    }
    if (newChannel &&
        newChannel.parent &&
        newChannel.parentId &&
        !ignoredCategories.has(newChannel.parentId) &&
        !channelDataMap.has(newChannel.id)) {
        let categoryChannels = newChannel.parent.children.cache.filter((channel) => channel.type === ChannelType.GuildVoice);
        if (categoryChannels.size >= 10)
            return;
        const allChannelsFilled = categoryChannels.every((channel) => channel.members.size > 0);
        if (!allChannelsFilled)
            return;
        const numeralsInUse = new Map();
        categoryChannels.forEach((channel) => {
            const numeral = channel.name.match(/[𝐈𝐕𝐗]+$/);
            if (numeral) {
                numeralsInUse.set(numeral[0], true);
            }
            else if (!managedVoiceChannelIds.has(channel.id)) {
                numeralsInUse.set("𝐈", true);
            }
        });
        let numeral = "𝐈";
        for (const roman of romanNumbers) {
            if (!numeralsInUse.has(roman)) {
                numeral = roman;
                break;
            }
        }
        numeralsInUse.clear();
        if (categoryChannels.size === 1 && numeral === "𝐈") {
            numeral = "𝐈𝐈";
        }
        const nameWithoutEmoji = newChannel.name.split("｜")[1];
        const baseName = (nameWithoutEmoji || newChannel.name).replace(/[𝐈𝐕𝐗]+$/, "").trim();
        const firstEmoji = Array.from(newChannel.name)[0];
        const emoji = getCategoryEmoji(newChannel.parentId, firstEmoji);
        const newChannelName = `${emoji}｜${baseName} ${numeral}`;
        const channel = (await newChannel.guild.channels.create({
            name: newChannelName,
            type: ChannelType.GuildVoice,
            parent: newChannel.parent,
            reason: "Users have filled all existing channels",
        }));
        managedVoiceChannelIds.add(channel.id);
        await VoiceChannels.create({ channelId: channel.id });
    }
}
async function removeChannel(channel) {
    if (!managedVoiceChannelIds.has(channel.id))
        return;
    channel.delete();
    managedVoiceChannelIds.delete(channel.id);
    VoiceChannels.destroy({ where: { channelId: channel.id } });
}
function getCategoryEmoji(categoryId, emoji) {
    let emojis;
    switch (categoryId) {
        case process.env.MAIN_VOICE_CATEGORY:
            emojis = ["🔰", "🔶", "🔷", "🔹", "💦", "🧊", "⚓️"];
            break;
        case process.env.RAID_CATEGORY:
            emojis = ["🏥", "💪", "🩸", "🪖", "💥", "🥩"];
            break;
        case process.env.PVE_PARTY_CATEGORY:
            emojis = ["🦞", "🐸", "🦖", "🐲", "🌪"];
            break;
        default:
            emojis = ["🌐", "🪢", "💧", "🥂", "🍷", "🍸"];
    }
    if (emoji) {
        emojis = emojis.filter((e) => e !== emoji);
    }
    const randomIndex = Math.floor(Math.random() * emojis.length);
    return emojis[randomIndex];
}
export default manageVoiceChannels;
//# sourceMappingURL=voiceChannelManager.js.map