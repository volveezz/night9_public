import { UserActivityData } from "../persistence/sequelize.js";
const userMessageSentMap = new Map();
export const userVoiceTimeMap = new Map();
export const voiceChannelJoinTimestamps = new Map();
let countdown = null;
export async function cacheUserActivity({ userId, messageId, voiceTime }) {
    if (messageId) {
        const userMessages = userMessageSentMap.get(userId) ?? 0;
        userMessageSentMap.set(userId, userMessages + 1);
    }
    if (voiceTime) {
        const userVoice = userVoiceTimeMap.get(userId) ?? 0;
        userVoiceTimeMap.set(userId, userVoice + voiceTime);
    }
    if ((userMessageSentMap.size > 0 || userVoiceTimeMap.size > 0) && countdown === null) {
        countdown = setTimeout(() => {
            userActivityUpdater();
            countdown = null;
        }, 60 * 1000 * 5);
    }
}
export async function forceUpdateUserActivity() {
    if (countdown) {
        clearTimeout(countdown);
        countdown = null;
    }
    for (const [userId, joinTimestamp] of voiceChannelJoinTimestamps.entries()) {
        const secondsInVoice = Math.floor((Date.now() - joinTimestamp) / 1000);
        const existingVoiceTime = userVoiceTimeMap.get(userId) ?? 0;
        userVoiceTimeMap.set(userId, existingVoiceTime + secondsInVoice);
    }
    voiceChannelJoinTimestamps.clear();
    await userActivityUpdater();
}
async function userActivityUpdater() {
    for (const [userId, value] of userMessageSentMap) {
        userMessageSentMap.delete(userId);
        try {
            await UserActivityData.increment("messages", { by: value ?? 0, where: { discordId: userId } });
        }
        catch (error) {
            console.error("[Error code: 1825]", userId, error);
        }
    }
    for (const [userId, value] of userVoiceTimeMap) {
        userVoiceTimeMap.delete(userId);
        try {
            await UserActivityData.increment("voice", { by: value ?? 0, where: { discordId: userId } });
        }
        catch (error) {
            console.error("[Error code: 1824]", userId, error);
        }
    }
}
