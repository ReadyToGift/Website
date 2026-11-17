import { env } from "cloudflare:workers";

const cloudflareKV = env.CACHE;
const fallbackCache = new Map();

export const setCache = async (key, value, ttl) => {
    try {
        const exp = Date.now() + ttl;
        const serialized = JSON.stringify({ data: value, ttl, exp });
        if (cloudflareKV) {
            await cloudflareKV.put(key, serialized, {
                expirationTtl: Math.ceil(ttl / 1000),
            });
        } else {
            fallbackCache.set(key, serialized);
        }
        console.log(`Set ${key} in cache`);
    } catch (err) {
        console.error("Error setting cache:", err);
    }
};

export const getCache = async (key) => {
    try {
        let value;
        if (cloudflareKV) {
            value = await cloudflareKV.get(key);
        } else {
            value = fallbackCache.get(key);
        }

        if (value) {
            value = JSON.parse(value);

            if (value.exp <= Date.now()) {
                value = null;
                console.log(`${key} expired`);
                if (fallbackCache.has(key)) fallbackCache.delete(key);
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
        if (cloudflareKV) {
            await cloudflareKV.delete(key);
        } else {
            fallbackCache.delete(key);
        }
    } catch (err) {
        console.error("Error deleting cache:", err);
    }
};
