import { createClient } from "redis";
const redisClient = createClient({
    url: process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL,
});
redisClient.on("error", (error) => {
    console.error("Redis error", error);
});
redisClient.connect();
export { redisClient };
//# sourceMappingURL=redis.js.map