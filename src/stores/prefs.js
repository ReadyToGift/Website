import { account } from "@/appwrite";
import { persistentMap } from "@nanostores/persistent";
import { user } from "./auth";

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

export const $prefs = persistentMap("userPrefs", { ...defaultPrefs }, {
    encode: JSON.stringify,
    decode: JSON.parse
});

export const newUserPrefs = { ...defaultPrefs };

export const loadPrefs = (prefs) => {
    $prefs.set({ ...defaultPrefs, ...prefs });
    Object.assign(newUserPrefs, { ...defaultPrefs, ...prefs });
};

export const updatePrefs = async (updatedPrefs) => {
    const userAccount = user.get();
    if (userAccount) {
        await account.updatePrefs(updatedPrefs);
    }
    $prefs.set(Object.assign({}, $prefs.get(), updatedPrefs));
};