import { createClient } from "redis";
import { env } from "cloudflare:workers";
import { REDIS_HOST } from "astro:env/server";

const cloudflareKV = env.CACHE;
let redis;
if (REDIS_HOST) {
    redis = createClient({
        url: `redis://${REDIS_HOST}:6379`
    });
    redis.on("error", (err) => console.error("Redis Client Error", err));
    redis.connect().then(() => console.log("Connected to Redis")).catch((err) => console.error("Error connecting to Redis:", err));
}

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
        } else {
            await cloudflareKV.put(key, JSON.stringify({
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
        } else {
            value = await cloudflareKV.get(key);
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
        } else {
            await cloudflareKV.delete(key);
        }
    } catch (err) {
        console.error("Error deleting cache:", err);
    }
};