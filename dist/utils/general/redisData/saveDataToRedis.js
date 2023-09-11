import { channelDataMap, completedRaidsData } from "../../persistence/dataStore.js";
import { redisClient } from "../../persistence/redis.js";
import { completedPhases } from "../activityCompletionChecker.js";
async function saveDataToRedis() {
    await Promise.all([saveRaidEncountersTimes(), saveLfgData(), saveRaidClearsData()]);
    return true;
}
async function saveRaidEncountersTimes() {
    if (completedPhases.size === 0)
        return;
    const serializedRaidData = JSON.stringify(Array.from(completedPhases.entries()));
    await redisClient.set("completedPhasesKey", serializedRaidData);
}
async function saveLfgData() {
    if (channelDataMap.size === 0)
        return;
    const lfgData = [];
    channelDataMap.forEach((value) => {
        lfgData.push({
            lfgMessageId: value.channelMessage.id,
            voiceChannelId: value.voiceChannel.id,
            isDeletable: value.isDeletable,
            creator: value.creator,
        });
    });
    const serializedLfgData = JSON.stringify(lfgData);
    await redisClient.set("lfgData", serializedLfgData);
}
async function saveRaidClearsData() {
    if (completedRaidsData.size === 0)
        return;
    const completedRaidsDataArray = [...completedRaidsData];
    const raidsDataString = JSON.stringify(completedRaidsDataArray);
    await redisClient.set("completedRaidsData", raidsDataString);
}
export default saveDataToRedis;
//# sourceMappingURL=saveDataToRedis.js.map