import { client } from "../../../index.js";
import { channelDataMap } from "../../persistence/dataStore.js";
import { redisClient } from "../../persistence/redis.js";
import { completedPhases } from "../activityCompletionChecker.js";
async function restoreDataFromRedis() {
    await Promise.all([restoreLfgData(), restoreRaidEncountersTimesData()]);
    console.debug(`Data from the redis was restored`);
    return true;
}
async function restoreRaidEncountersTimesData() {
    const completedPhasesData = await redisClient.get("completedPhasesKey");
    if (completedPhasesData) {
        const completedPhasesArray = JSON.parse(completedPhasesData);
        const completedPhasesMap = new Map(completedPhasesArray);
        completedPhasesMap.forEach((value, key) => {
            completedPhases.set(key, value);
        });
        await redisClient.del("completedPhasesKey");
        console.debug("Completed phases map", completedPhasesMap);
    }
    else {
        console.log("[Error code: 2011] No data found for completedPhasesKey");
    }
}
async function restoreLfgData() {
    const lfgChannelData = await redisClient.get("lfgData");
    if (lfgChannelData) {
        const lfgActivityDataArray = JSON.parse(lfgChannelData);
        lfgActivityDataArray.forEach(async (value) => {
            const { creator, isDeletable, lfgMessageId, voiceChannelId } = value;
            const channel = (await client.getCachedGuild().channels.fetch(voiceChannelId));
            const channelMessage = await client.getAsyncMessage(process.env.PVE_PARTY_CHANNEL_ID, lfgMessageId);
            if (!channel || !channelMessage)
                return;
            channelDataMap.set(channel.id, { voiceChannel: channel, channelMessage, creator, isDeletable, members: [] });
        });
        await redisClient.del("lfgData");
        console.debug("Lfg activity array", lfgActivityDataArray);
    }
    else {
        console.log("[Error code: 2010] No data found for lfgData");
    }
}
export default restoreDataFromRedis;
//# sourceMappingURL=restoreDataFromRedis.js.map