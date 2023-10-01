import { redisClient } from "./redis.js";
export async function storeDiscordTokens(userId, tokens) {
    try {
        await redisClient.set(`discord-${userId}`, JSON.stringify(tokens));
    }
    catch (err) {
        console.error("[Error code: 2044] Error storing Discord tokens:", err);
    }
}
export async function getDiscordTokens(userId) {
    try {
        const data = await redisClient.get(`discord-${userId}`);
        return data ? JSON.parse(data) : null;
    }
    catch (err) {
        console.error("[Error code: 2043] Error getting Discord tokens:", err);
    }
}
//# sourceMappingURL=webStorage.js.map