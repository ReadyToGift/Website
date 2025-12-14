import { avatars, client } from "@/appwrite";
import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

export const user = atom(null);
export const mfaFactors = atom([]);
export const previouslyLoggedInUserID = persistentAtom("previouslyLoggedInUserID", null);

export const init = async ({ user: userData, session, factors }) => {
    if (session) client.setSession(session);
    if (userData) {
        if (userData.name) {
            userData.avatar = avatars.getInitials(userData.name);
        }
        if (userData.$id) {
            previouslyLoggedInUserID.set(userData.$id);
        }
        user.set(userData);
    }
    if (factors) {
        mfaFactors.set(factors);
    }
};

export default {
    init,
    user
};
