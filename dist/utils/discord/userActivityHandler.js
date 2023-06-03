import { database, UserActivityData } from "../persistence/sequelize.js";
const messageMap = new Map();
const voiceMap = new Map();
var countdown = null;
export async function cacheUserActivity({ userId, messageId, voiceTime }) {
    if (messageId) {
        const userMessages = messageMap.get(userId) ?? 0;
        messageMap.set(userId, userMessages + 1);
    }
    if (voiceTime) {
        const userVoice = voiceMap.get(userId) ?? 0;
        voiceMap.set(userId, userVoice + voiceTime);
    }
    if ((messageMap.size > 0 || voiceMap.size > 0) && countdown === null) {
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
    userActivityUpdater();
}
async function userActivityUpdater() {
    const t = await database.transaction();
    for await (const [userId, value] of messageMap) {
        messageMap.delete(userId);
        UserActivityData.increment("messages", { by: value ?? 0, where: { discordId: userId }, transaction: t });
    }
    for await (const [userId, value] of voiceMap) {
        voiceMap.delete(userId);
        UserActivityData.increment("voice", { by: value ?? 0, where: { discordId: userId }, transaction: t });
    }
    await t.commit().catch(async (e) => {
        await t.rollback();
        console.error("[Error code: 1201] Error during updating discord_activity values", { e });
    });
}
