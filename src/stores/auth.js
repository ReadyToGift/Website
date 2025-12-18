import { avatars, client } from "@/appwrite";
import { atom } from "nanostores";
import { loadPrefs } from "./prefs";
import { persistentAtom } from "@nanostores/persistent";

export const user = atom(null);
export const mfaFactors = atom([]);
export const previouslyLoggedInUserID = persistentAtom("previouslyLoggedInUserID", null);

export const setUser = ({ user: userData }) => {
    user.set({
        ...user.get(),
        account: userData
    });
};

export const init = async () => {
    const accountResp = await fetch("/api/auth");
    const { user: accountData } = await accountResp.json();

    if (accountData.session) client.setSession(accountData.session);

    const userData = {
        ...accountData.account,
        avatar: accountData.account?.name ? avatars.getInitials(accountData.account.name) : null
    };

    loadPrefs(accountData.prefs);

    if (userData.mfaFactors) {
        mfaFactors.set(accountData.mfaFactors);
    }

    user.set(userData);
};

export default {
    init,
    user
};
