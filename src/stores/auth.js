import { persistentAtom } from "@nanostores/persistent";
import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { atom } from "nanostores";

export const authClient = createAuthClient({
    plugins: [twoFactorClient],
});

export const session = authClient.useSession;
export const user = atom(null);
export const mfaFactors = atom({});
export const previouslyLoggedInUserID = persistentAtom(
    "previouslyLoggedInUserID",
    null,
);
export const authInitialized = atom(false);
let initPromise = null;

const updateUser = (sessionData) => {
    const sessionUser = sessionData?.user ?? null;
    user.set(sessionUser);
    mfaFactors.set({
        totp: Boolean(sessionUser?.twoFactorEnabled),
    });
    return sessionUser;
};

session.listen((state) => {
    if (!state.isPending) {
        updateUser(state.data);
        authInitialized.set(true);
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

const runInit = async () => {
    await session.get().refetch();
    updateUser(session.get().data);
    authInitialized.set(true);
};

export const init = async () => {
    if (initPromise) {
        return initPromise;
    }

    console.log("Initialising auth");
    initPromise = (async () => {
        try {
            await runInit();
        } catch (error) {
            authInitialized.set(false);
            console.error("Auth init error:", error);
        }
    })();

    try {
        await initPromise;
    } finally {
        initPromise = null;
    }
};

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
