import { client } from "../../../index.js";
import { channelDataMap, completedRaidsData } from "../../persistence/dataStore.js";
import { redisClient } from "../../persistence/redis.js";
import { completedPhases } from "../activityCompletionChecker.js";
async function restoreDataFromRedis() {
    await Promise.all([restoreLfgData(), restoreRaidEncountersTimesData(), restoreCompletedRaidsData()]);
    console.info("Data from the redis was restored!");
}
async function restoreRaidEncountersTimesData() {
    const completedPhasesData = await redisClient.get("completedPhasesKey");
    if (!completedPhasesData)
        return;
    const completedPhasesArray = JSON.parse(completedPhasesData);
    const completedPhasesMap = new Map(completedPhasesArray);
    completedPhasesMap.forEach((value, key) => {
        completedPhases.set(key, value);
    });
}
async function restoreLfgData() {
    const lfgChannelData = await redisClient.get("lfgData");
    if (!lfgChannelData)
        return;
    const lfgActivityDataArray = JSON.parse(lfgChannelData);
    lfgActivityDataArray.forEach(async (value) => {
        const { creator, isDeletable, lfgMessageId, voiceChannelId } = value;
        const channel = (await client.getCachedGuild().channels.fetch(voiceChannelId));
        const channelMessage = await client.getAsyncMessage(process.env.PVE_PARTY_CHANNEL_ID, lfgMessageId);
        if (!channel || !channelMessage)
            return;
        channelDataMap.set(channel.id, { voiceChannel: channel, channelMessage, creator, isDeletable, members: [] });
    });
}
async function restoreCompletedRaidsData() {
    const completedRaidsDatabaseData = await redisClient.get("completedRaidsData");
    if (!completedRaidsDatabaseData)
        return;
    const parsedRaidsData = JSON.parse(completedRaidsDatabaseData);
    for (const [key, value] of parsedRaidsData) {
        completedRaidsData.set(key, value);
    }
}
export default restoreDataFromRedis;
//# sourceMappingURL=restoreDataFromRedis.js.map