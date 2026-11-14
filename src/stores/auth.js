import { ENABLE_BILLING } from "astro:env/client";
import { persistentAtom } from "@nanostores/persistent";
import { polarClient } from "@polar-sh/better-auth/client";
import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { atom } from "nanostores";
import { loadPrefs } from "./prefs";

const plugins = [twoFactorClient()];

if (ENABLE_BILLING) {
    plugins.push(polarClient());
}

export const authClient = createAuthClient({
    plugins,
});

export const session = authClient.useSession;
export const user = atom(null);
export const mfaFactors = atom({});
export const previouslyLoggedInUserID = persistentAtom(
    "previouslyLoggedInUserID",
    null,
);
export const authInitialized = atom(false);
let resolveAuthReady;
const authReady = new Promise((resolve) => {
    resolveAuthReady = resolve;
});

const updateUser = (sessionData) => {
    const sessionUser = sessionData?.user ?? null;
    user.set(sessionUser);
    loadPrefs(sessionUser || {});
    mfaFactors.set({
        totp: Boolean(sessionUser?.twoFactorEnabled),
    });
    return sessionUser;
};

session.listen((state) => {
    if (!state.isPending) {
        updateUser(state.data);
        authInitialized.set(true);
        resolveAuthReady();
    }
});

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
    await session.get().refetch();
    updateUser(session.get().data);
    return mfaFactors.get();
};

export const refreshSession = async () => {
    await session.get().refetch();
    return updateUser(session.get().data);
};

export const init = () => authReady;

export async function logOut() {
    try {
        await authClient.signOut();
    } catch (error) {
        console.error("Error signing out:", error);
    } finally {
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
