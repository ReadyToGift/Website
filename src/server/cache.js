import { env } from "cloudflare:workers";

const kvCacheNamespace = env.CACHE;

export const setCache = async (key, value, ttl) => {
    try {
        await kvCacheNamespace.put(key, JSON.stringify({
            data: value,
            ttl,
            exp: new Date().getTime() + ttl
        }));
        console.log(`Set ${key} in cache`);
    } catch (err) {
        console.error("Error setting cache:", err);
    }
};

export const getCache = async (key) => {
    try {
        let value;
        value = await kvCacheNamespace.get(key);

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
        await kvCacheNamespace.delete(key);
    } catch (err) {
        console.error("Error deleting cache:", err);
    }
};