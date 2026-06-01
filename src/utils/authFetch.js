import { getJwt } from "@/stores/auth";
import { handleFetch } from "@/utils/handleFetch";

export const ensureAuth = async ({ forceRefresh = false } = {}) => {
    if (!forceRefresh) {
        const [, validateError] = await handleFetch("/api/auth/session", {
            method: "GET"
        });

        if (!validateError) {
            return true;
        }
    }

    const jwt = await getJwt();

    if (!jwt) {
        return false;
    }

    const [, sessionError] = await handleFetch("/api/auth/session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ jwt })
    });

    return !sessionError;
};

/**
 * Runs a request, and if it fails with 401, refreshes the server auth cookie once and retries.
 */
export const handleAuthFetch = async (input, init = {}, { retryOnUnauthorized = true } = {}) => {
    let [data, error] = await handleFetch(input, init);

    if (!retryOnUnauthorized || error?.status !== 401) {
        return [data, error];
    }

    const authEnsured = await ensureAuth({ forceRefresh: true });

    if (!authEnsured) {
        return [null, error];
    }

    return await handleFetch(input, init);
};