import { map } from "nanostores";

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

export const $prefs = map({ ...defaultPrefs });

export const loadPrefs = (prefs) => {
    $prefs.set({ ...defaultPrefs, ...prefs });
};