import { channelDataMap, completedRaidsData, lastAlertsTimestamps } from "../../persistence/dataStore.js";
import { redisClient } from "../../persistence/redis.js";
import { completedPhases } from "../activityCompletionChecker.js";
const EXPIRATION_TIMES = {
    ONE_HOUR: 60 * 60,
    HALF_HOUR: 60 * 30,
};
async function saveDataToRedis() {
    await Promise.all([
        saveIterableToRedis(completedPhases.entries(), "completedPhasesKey", EXPIRATION_TIMES.HALF_HOUR),
        saveIterableToRedis(channelDataMap, "lfgData", EXPIRATION_TIMES.HALF_HOUR, mapLfgData),
        saveIterableToRedis(completedRaidsData, "completedRaidsData", null),
        saveIterableToRedis(lastAlertsTimestamps, "lastAlertsTimestamps", null),
    ]);
    return true;
}
async function saveIterableToRedis(data, key, expiration, transformFunc) {
    if ((data instanceof Map && !data.size) || (data[Symbol.iterator] && ![...data].length))
        return;
    const serializedData = JSON.stringify(transformFunc ? transformFunc(data) : [...data]);
    await redisClient.set(key, serializedData, expiration ? { EX: expiration } : {});
}
function mapLfgData(dataMap) {
    return Array.from(dataMap.values()).map((value) => ({
        lfgMessageId: value.channelMessage.id,
        voiceChannelId: value.voiceChannel.id,
        isDeletable: value.isDeletable,
        creator: value.creator,
    }));
}
export default saveDataToRedis;
//# sourceMappingURL=saveDataToRedis.js.map