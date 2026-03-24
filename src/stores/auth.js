import { account, avatars } from "@/appwrite";
import { atom } from "nanostores";
import { createTOTPChallengeDialog } from "./mfa";
import { loadPrefs } from "./prefs";
import { persistentAtom } from "@nanostores/persistent";

export const user = atom(null);
export const mfaFactors = atom([]);
export const previouslyLoggedInUserID = persistentAtom("previouslyLoggedInUserID", null);
export const authInitialized = atom(false);

let appwriteJwt = null;
let appwriteJwtExp = null;

export const getJwt = async () => {
    if (!user.get()) return false;

    if (appwriteJwt) {
        const jwtExpired = new Date().getTime() > appwriteJwtExp;

        if (!jwtExpired) return appwriteJwt;
    }

    try {
        const jwtResp = await account.createJWT();
        appwriteJwt = jwtResp.jwt;
        appwriteJwtExp =  new Date().getTime + 15 * 60 * 1000;

        return appwriteJwt;
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

export const init = async ({ router = null, currentAccount = null } = {}) => {
    console.log("Initialising auth");
    try {
        try {
            if (!currentAccount) {
                currentAccount = await account.get();
            }

            const mfaFactorsList = await account.listMFAFactors();
            mfaFactors.set(mfaFactorsList);

            if (currentAccount.prefs) {
                loadPrefs(currentAccount.prefs);
            }

            user.set({
                ...currentAccount,
                avatar: currentAccount?.name ? avatars.getInitials(currentAccount.name) : null
            });
        } catch (err) {
            if (err.type === "user_more_factors_required") {
                console.log("MFA required, initiating TOTP challenge dialog.");
                const totpChallengeResp = await createTOTPChallengeDialog();
                console.log({ totpChallengeResp });
                if (totpChallengeResp.action !== "success") {
                    await logOut();
                    return redirectToLogin(router);
                }
                console.log({ totpChallengeResp });
                window.location.reload();
            }
        }
    } catch (error) {
        console.error("Auth init error:", error);
        // Router guards will handle redirects for protected routes
    }

    authInitialized.set(true);
};

export async function logOut() {
    try {
        await account.deleteSession({ sessionId: "current" });
        appwriteJwt = null;
        appwriteJwtExp = null;
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
