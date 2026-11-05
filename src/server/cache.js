import { createClient } from "redis";
import { REDIS_HOST } from "astro:env/server";
import { env } from "cloudflare:workers";

let cloudflareKV = env.CACHE;
let redis;
let fallbackCache = new Map();

if (REDIS_HOST) {
    cacheType = "redis";

    redis = cacheType === "Redis"
        ? createClient({ url: `redis://${REDIS_HOST}:6379` })
        : null;

    redis.on("error", (err) => console.error("Redis Client Error", err));
    redis.connect().then(
        () => console.log("Connected to Redis"),
        (err) => console.error("Error connecting to Redis:", err)
    );
}

const cacheType = cloudflareKV ? "KV" : (REDIS_HOST ? "Redis" : "Fallback");


export const setCache = async (key, value, ttl) => {
    try {
        if (redis) {
            await redis.set(key, JSON.stringify({
                data: value,
                ttl,
                exp: new Date().getTime() + ttl
            }), {
                EX: ttl / 1000
            });
        } else if (cloudflareKV) {
            await cloudflareKV.put(key, JSON.stringify({
                data: value,
                ttl,
                exp: new Date().getTime() + ttl
            }));
        } else {
            fallbackCache.set(key, JSON.stringify({
                data: value,
                ttl,
                exp: new Date().getTime() + ttl
            }));
        }
        console.log(`Set ${key} in cache`);
    } catch (err) {
        console.error("Error setting cache:", err);
    }
};

export const getCache = async (key) => {
    try {
        let value;
        if (redis) {
            value = await redis.get(key);
        } else if (cloudflareKV) {
            value = await cloudflareKV.get(key);
        } else {
            value = fallbackCache.get(key);
        }

        if (value) {
            value = JSON.parse(value);

            if (value.exp < new Date().getTime()) {
                value = null;
                console.log(`${key} expired`);
            } else {
                console.log(`Got ${key} from cache`);
                return value.data;
            }
        }

    } catch (err) {
        console.error("Error getting cache:", err);
        return null;
    }
};

export const deleteCache = async (key) => {
    try {
        if (redis) {
            await redis.del(key);
        } else if (cloudflareKV) {
            await cloudflareKV.delete(key);
        } else {
            fallbackCache.delete(key);
        }
    } catch (err) {
        console.error("Error deleting cache:", err);
    }
};