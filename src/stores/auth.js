import { passkeyClient } from "@better-auth/passkey/client";
import { persistentAtom } from "@nanostores/persistent";
import { polarClient } from "@polar-sh/better-auth/client";
import * as Sentry from "@sentry/astro";
import { createAuthClient } from "better-auth/client";
import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { atom } from "nanostores";
import { loadConfig } from "./config";
import { loadPrefs } from "./prefs";

export let authClient;
export let session;
let authReady;
export const user = atom(null);
export const mfaFactors = atom({});
export const previouslyLoggedInUserID = persistentAtom(
    "previouslyLoggedInUserID",
    null,
);
export const authInitialized = atom(false);

const updateUser = (sessionData) => {
    const sessionUser = sessionData?.user ?? null;
    if (!import.meta.env.SSR) {
        Sentry.setUser(sessionUser?.id ? { id: sessionUser.id } : null);
    }
    user.set(sessionUser);
    if (sessionUser?.id) {
        previouslyLoggedInUserID.set(sessionUser.id);
    }
    loadPrefs(sessionUser || {});
    mfaFactors.set({
        totp: Boolean(sessionUser?.twoFactorEnabled),
    });
    return sessionUser;
};

export const init = () => {
    authReady ??= loadConfig().then(({ enableBilling }) => {
        const plugins = [twoFactorClient(), magicLinkClient(), passkeyClient()];
        if (enableBilling) plugins.push(polarClient());

        authClient = createAuthClient({ plugins });
        session = authClient.useSession;

        return new Promise((resolve) => {
            session.subscribe((state) => {
                if (state.isPending) return;
                updateUser(state.data);
                authInitialized.set(true);
                resolve();
            });
        });
    });
    return authReady;
};

export const setUser = ({ user: userData }) => user.set(userData);

export const getCurrentUser = async () => {
    try {
        if (!authInitialized.get()) {
            console.log("Auth initialized during getCurrentUser");
            await init();
        }
        return user.get();
    } catch (error) {
        console.error("Error getting current user:", error);
        return null;
    }
};

export const getMFAFactors = async () => {
    await init();
    await session.get().refetch();
    updateUser(session.get().data);
    return mfaFactors.get();
};

export const refreshSession = async () => {
    await init();
    await session.get().refetch();
    return updateUser(session.get().data);
};

export async function logOut() {
    try {
        await init();
        await authClient.signOut();
    } catch (error) {
        console.error("Error signing out:", error);
    } finally {
        if (!import.meta.env.SSR) {
            Sentry.setUser(null);
        }
        user.set(null);
        mfaFactors.set({});
        authInitialized.set(true);
    }
}

export default {
    init,
    user,
    logOut,
};
