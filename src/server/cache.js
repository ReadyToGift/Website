import { createClient } from "redis";
import { REDIS_HOST } from "astro:env/server";


export let cacheType = null; // null, 'redis'

let redisClient;

if (REDIS_HOST) {
    cacheType = "redis";
    redisClient = await createClient({
        url: `redis://${REDIS_HOST}:6379`
    })
        .on("error", (err) => console.log("Redis Client Error", err))
        .connect(() => console.log("Connected to Redis"));
}

await redisClient.flushAll();

export const setCache = async (key, value, ttl) => {
    try {
        if (!cacheType) return;
        if (redisClient) {
            await redisClient.set(key, JSON.stringify({
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
        if (!cacheType) return;

        let value;
        if (redisClient) {
            value = await redisClient.get(key);
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
        if (!cacheType) return;
        if (redisClient) await redisClient.del(key);
    } catch (err) {
        console.error("Error deleting cache:", err);
    }
};