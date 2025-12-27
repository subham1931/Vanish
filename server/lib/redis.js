const Redis = require("ioredis");

// Default to localhost:6379 if not valid in ENV
const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});

module.exports = redis;
