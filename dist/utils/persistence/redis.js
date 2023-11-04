import { createClient } from "redis";
if (process.env.REDIS_PRIVATE_URL) {
    console.debug("Connecting to redis with the private url");
}
else {
    console.debug("Connecting to redis with the usual url");
}
const redisClient = createClient({
    url: process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL,
});
redisClient.on("error", (error) => {
    console.error("Redis error", error);
});
redisClient.connect();
export { redisClient };
//# sourceMappingURL=redis.js.map