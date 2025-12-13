import { account, avatars } from "@/appwrite";
import { defineStore } from "pinia";
import { markRaw } from "vue";
import { SENTRY_DSN } from "astro:env/client";
import { setUser as setSentryUser } from "@sentry/vue";
import TotpChallenge from "@/components/dialogs/account/mfa/totp/TotpChallenge.vue";
import { useDialogs } from "./dialogs";

const defaultPrefs = {
    darkMode: false,
    spoilSurprises: false,
    showTotalPrice: false,
    savedLists: [],
    listSorting: {
        type: { name: "Last updated", value: "$updatedAt" },
        order: "asc"
    },
    history: [],
    hidePWAInstallPrompt: false
};

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        mfaFactors: {},
        avatar: null,
        previouslyLoggedInUserID: localStorage.getItem("previouslyLoggedInUserID"),
        userPrefs: { ...defaultPrefs },
        newUserPrefs: { ...defaultPrefs }
    }),
    actions: {
        async createTOTPChallengeDialog() {
            const dialogs = useDialogs();
            return await dialogs.create({
                async: true,
                component: markRaw(TotpChallenge),
                emits: [
                    "cancel", "success", "totp-removed"
                ],
                fullscreen: false,
                maxWidth: "80%",
                title: "Multi-Factor Authentication"
            });
        },
        async completeMFAchallenge(code, factor = "totp") {
            const challenge = await account.createMFAChallenge({
                factor
            });
            const challengeId = challenge.$id;

            await account.updateMFAChallenge({
                challengeId,
                otp: code
            });
        },
        async regenerateRecoveryCodes() {
            try {
                return (await account.createMFARecoveryCodes()).recoveryCodes;
            } catch (error) {
                if (error.type === "user_recovery_codes_already_exists") {
                    const recoveryCodesResponse = await account.updateMFARecoveryCodes();

                    return recoveryCodesResponse.recoveryCodes;
                } else {
                    throw error;
                }
            }
        },
        async getRecoveryCodes(totp) {
            try {
                return (await account.createMFARecoveryCodes()).recoveryCodes;
            } catch (error) {
                if (error.type === "user_recovery_codes_already_exists") {
                    // if no totp, there should be a recent MFA challenge to complete
                    if (totp) await this.completeMFAchallenge(totp);

                    const recoveryCodesResponse = await account.getMFARecoveryCodes();

                    return recoveryCodesResponse.recoveryCodes;
                } else {
                    throw error;
                }
            }
        },
        async init() {
            try {
                try {
                    this.user = await account.get();
                } catch (error) {
                    switch (error.type) {
                    case "general_unauthorized_scope":
                        break;

                    case "user_more_factors_required":
                        if ((await this.createTOTPChallengeDialog()).action !== "cancel" ) {
                            this.user = await account.get();
                            break;
                        } else {
                            await account.deleteSession("current");
                            this.user = null;
                            break;
                        }
                    default:
                        throw error;
                    }
                }

                if (this.user) {
                    this.setPreviouslyLoggedInUserID(this.user.$id);
                    if (SENTRY_DSN) {
                        setSentryUser({
                            id: this.user.$id,
                            username: this.user.name,
                            email: this.user.email
                        });
                    }

                    this.mfaFactors = await account.listMFAFactors();
                } else {
                    if (SENTRY_DSN) {
                        setSentryUser(null);
                    }
                }

                if (this.user.name) this.avatar = avatars.getInitials(this.user.name);
                if (this.user.prefs) {
                    this.userPrefs = {
                        ...this.userPrefs,
                        ...this.user.prefs
                    };
                }
            } catch {
                if (SENTRY_DSN) {
                    setSentryUser(null);
                }
                this.user = null;
                const localPrefs = localStorage.getItem("userPrefs");
                if (localPrefs) {
                    this.userPrefs = {
                        ...this.userPrefs,
                        ...JSON.parse(localPrefs)
                    };
                } else {
                    this.userPrefs = {
                        ...this.userPrefs,
                        darkMode:
                            window.matchMedia &&
                            window.matchMedia("(prefers-color-scheme: dark)").matches,
                        spoilSurprises: false,
                        showTotalPrice: false
                    };
                }
            }

            this.newUserPrefs = { ...this.newUserPrefs, ...this.userPrefs };
        },
        removePreviouslyLoggedInUserID() {
            localStorage.removeItem("previouslyLoggedInUserID");
            this.previouslyLoggedInUserID = null;
        },
        setPreviouslyLoggedInUserID(userID) {
            localStorage.setItem("previouslyLoggedInUserID", userID);
            this.previouslyLoggedInUserID = userID;
        },
        async updatePrefs(prefs) {
            try {
                await account.updatePrefs(prefs);
                this.userPrefs = prefs;
            } catch (error) {
                return error;
            }
        },
        setUser(user) {
            this.user = user;
        },
        setMfaFactors(factors) {
            this.mfaFactors = factors;
        },
        setMFA(mfa) {
            if (this.user) {
                this.user.mfa = mfa;
            }
        },
        addToHistory(item) {
            this.userPrefs.history.unshift(item);
            this.userPrefs.history = this.userPrefs.history
                .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i) // remove duplicates
                .slice(0, 5); // keep only last 5 items

            this.updatePrefs(this.userPrefs);
        }
    },
    getters: {
        isLoggedIn() {
            return this.user !== null;
        }
    }
});
