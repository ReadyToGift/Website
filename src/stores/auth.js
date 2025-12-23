import { avatars, client } from "@/appwrite";
import { atom } from "nanostores";
import { authenticatedFetch } from "@/utils/api";
import { createTOTPChallengeDialog } from "./mfa";
import { loadPrefs } from "./prefs";
import { persistentAtom } from "@nanostores/persistent";

const authRequiredRoutes = [
    "/dash/lists",
    "/dash/settings"
];

export const user = atom(null);
export const mfaFactors = atom([]);
export const previouslyLoggedInUserID = persistentAtom("previouslyLoggedInUserID", null);

export const setUser = ({ user: userData }) => {
    user.set({
        ...user.get(),
        account: userData
    });
};

const redirectToLogin = () => {
    const currentUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/dash/login?redirect=${currentUrl}`;
};

export const init = async () => {
    try {
        const accountResp = await authenticatedFetch("/api/auth");
        const { account, prefs, error, session } = await accountResp.json();
        if (error) {
            if (error.type === "user_more_factors_required") {
                console.log("MFA required, initiating TOTP challenge dialog.");
                const totpChallengeResp = await createTOTPChallengeDialog();
                if (totpChallengeResp.action !== "success") {
                    await authenticatedFetch("/api/auth", { method: "DELETE" });
                    return redirectToLogin();
                }
                console.log({ totpChallengeResp });
                window.location.reload();
            }
            return;
        }

        if (account) {
            if (session) client.setSession(session);
        
            loadPrefs(prefs);
        
            if (account.mfaFactors) {
                mfaFactors.set(account.mfaFactors);
            }
        
            user.set({
                ...account,
                avatar: account?.name ? avatars.getInitials(account.name) : null
            });
        } else {
            const routeRequiresAuth = authRequiredRoutes.some((route) => window.location.pathname.startsWith(route));
            if (routeRequiresAuth) {
                redirectToLogin();
            }
        }
    } catch (error) {
        console.error("Auth init error:", error);
        // If no session exists (not logged in), authenticatedFetch will throw
        const routeRequiresAuth = authRequiredRoutes.some((route) => window.location.pathname.startsWith(route));
        if (routeRequiresAuth) {
            redirectToLogin();
        }
    }
};

export default {
    init,
    user
};
