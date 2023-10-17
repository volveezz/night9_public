import { client } from "../../../index.js";
import { channelDataMap, completedRaidsData } from "../../persistence/dataStore.js";
import { redisClient } from "../../persistence/redis.js";
import { completedPhases } from "../activityCompletionChecker.js";
async function restoreDataFromRedis() {
    await Promise.all([restoreCompletedPhases(), restoreLfgChannelData(), restoreCompletedRaids()]);
    console.info("Data from Redis was restored!");
}
async function restoreCompletedPhases() {
    const data = await fetchDataFromRedis("completedPhasesKey");
    if (data)
        populateMapFromEntries(completedPhases, data);
}
async function restoreLfgChannelData() {
    const data = await fetchDataFromRedis("lfgData");
    if (!data)
        return;
    const guild = await client.getGuild();
    if (!guild)
        return;
    for (const value of data) {
        const { creator, isDeletable, lfgMessageId, voiceChannelId } = value;
        const channel = (guild.channels.cache.get(voiceChannelId) || (await guild.channels.fetch(voiceChannelId)));
        const channelMessage = channel && (await client.getAsyncMessage(process.env.PVE_PARTY_CHANNEL_ID, lfgMessageId));
        if (channel && channelMessage) {
            channelDataMap.set(channel.id, { voiceChannel: channel, channelMessage, creator, isDeletable, members: [] });
        }
    }
}
async function restoreCompletedRaids() {
    const data = await fetchDataFromRedis("completedRaidsData");
    if (data)
        populateMapFromEntries(completedRaidsData, data);
}
async function fetchDataFromRedis(key) {
    const rawData = await redisClient.get(key);
    return rawData ? JSON.parse(rawData) : null;
}
function populateMapFromEntries(targetMap, entries) {
    for (const [key, value] of entries) {
        targetMap.set(key, value);
    }
}
export default restoreDataFromRedis;
//# sourceMappingURL=restoreDataFromRedis.js.map