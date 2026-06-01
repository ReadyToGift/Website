import { account, avatars } from "@/appwrite";
import { atom } from "nanostores";
import { createTOTPChallengeDialog } from "./mfa";
import { loadPrefs } from "./prefs";
import { persistentAtom } from "@nanostores/persistent";

export const user = atom(null);
export const mfaFactors = atom([]);
export const previouslyLoggedInUserID = persistentAtom("previouslyLoggedInUserID", null);
export const authInitialized = atom(false);
let initPromise = null;

const dev = process.env.NODE_ENV === "development";


// Store jwt in localStorage for dev only
let appwriteJwtExp = dev ?
    persistentAtom("appwriteJwtExp", "") : atom("");

let appwriteJwt = dev ?
    persistentAtom("appwriteJwt", "") : atom("");

if (dev) {
    if (appwriteJwt.get() && appwriteJwtExp.get() < new Date().getTime()) {
        appwriteJwt.set("");
        appwriteJwtExp.set("");
    }
}

export const getJwt = async () => {
    if (!authInitialized.get()) {
        await init();
    }

    if (!user.get()) {
        console.error("No user logged in, cannot get JWT");
        return false;
    }

    if (appwriteJwt.get() && appwriteJwtExp.get()) {
        const jwtExpired = new Date().getTime() > appwriteJwtExp.get();

        if (!jwtExpired) return appwriteJwt.get();
    }

    try {
        const jwtResp = await account.createJWT();
        appwriteJwt.set(jwtResp.jwt);
        appwriteJwtExp.set(new Date().getTime() + 15 * 60 * 1000);

        return appwriteJwt.get();
    } catch (err) {
        console.log(err);
    }

    return false;
};

export const setUser = ({ user: userData }) => {
    user.set({
        ...user.get(),
        account: userData
    });
};

const redirectToLogin = (router) => {
    const currentUrl = encodeURIComponent(window.location.pathname);
    if (router) {
        router.push({ path: "/dash/login", query: { redirect: window.location.pathname } });
    } else {
        window.location.href = `/dash/login?redirect=${currentUrl}`;
    }
};

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
    const mfaFactorsList = await account.listMFAFactors();
    mfaFactors.set(mfaFactorsList);
    return mfaFactorsList;
};

const isUnauthorizedError = (error) => {
    return error?.type === "user_unauthorized" || error?.code === 401;
};

const runInit = async ({ currentAccount = null } = {}) => {
    if (!currentAccount) {
        currentAccount = await account.get();
    }

    if (currentAccount.prefs) {
        loadPrefs(currentAccount.prefs);
    }

    user.set({
        ...currentAccount,
        avatar: currentAccount?.name ? avatars.getInitials(currentAccount.name) : null
    });
    authInitialized.set(true);
};

export const init = async ({ router = null, currentAccount = null } = {}) => {
    if (initPromise) {
        return initPromise;
    }

    console.log("Initialising auth");
    initPromise = (async () => {
        try {
            await runInit({ currentAccount });
        } catch (err) {
            if (err?.type === "user_more_factors_required") {
                console.log("MFA required, initiating TOTP challenge dialog.");
                const totpChallengeResp = await createTOTPChallengeDialog();
                console.log({ totpChallengeResp });
                if (totpChallengeResp.action !== "success") {
                    await logOut();
                    return redirectToLogin(router);
                }
                console.log({ totpChallengeResp });
                window.location.reload();
                return;
            }

            if (isUnauthorizedError(err)) {
                user.set(null);
                authInitialized.set(true);
                return;
            }

            authInitialized.set(false);
            console.error("Auth init error:", err);
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
        await account.deleteSession({ sessionId: "current" });
        await fetch("/api/auth/session", { method: "DELETE" });
        appwriteJwt.set("");
        appwriteJwtExp.set("");
    } catch (error) {
        console.error("Error deleting session during logout:", error);
    }
    user.set(null);
}

export default {
    init,
    user,
    logOut
};
