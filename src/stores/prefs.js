import { persistentMap } from "@nanostores/persistent";
import { authClient, user } from "./auth";

const defaultPrefs = {
    darkMode: false,
    spoilSurprises: false,
    showTotalPrice: false,
    savedLists: [],
    listSorting: {
        type: { name: "Last updated", value: "updatedAt" },
        order: "asc",
    },
    history: [],
    hidePWAInstallPrompt: false,
};

const validListSortFields = new Set([
    "createdAt",
    "updatedAt",
    "title",
    "itemCount",
]);

const normalizeListSorting = (listSorting) => {
    const sorting =
        listSorting && typeof listSorting === "object"
            ? listSorting
            : defaultPrefs.listSorting;
    const requestedField = sorting.type?.value;
    const value =
        requestedField === "$updatedAt"
            ? "updatedAt"
            : validListSortFields.has(requestedField)
              ? requestedField
              : defaultPrefs.listSorting.type.value;

    return {
        type: {
            name:
                value === "updatedAt"
                    ? "Last updated"
                    : value === "createdAt"
                      ? "Created"
                      : value === "itemCount"
                        ? "Item Count"
                        : "Title",
            value,
        },
        order: sorting.order === "desc" ? "desc" : "asc",
    };
};

export const $prefs = persistentMap(
    "userPrefs",
    { ...defaultPrefs },
    {
        encode: JSON.stringify,
        decode: JSON.parse,
    },
);

export const newUserPrefs = { ...defaultPrefs };

export const loadPrefs = (prefs) => {
    const loadedPrefs = {
        ...defaultPrefs,
        ...prefs,
        listSorting: normalizeListSorting(prefs?.listSorting),
    };
    $prefs.set(loadedPrefs);
    Object.assign(newUserPrefs, loadedPrefs);
};

export const updatePrefs = async (updatedPrefs) => {
    const userAccount = user.get();
    const newPrefs = {
        ...Object.assign({}, $prefs.get(), updatedPrefs),
        listSorting: normalizeListSorting(
            updatedPrefs.listSorting || $prefs.get().listSorting,
        ),
    };
    if (userAccount) {
        const preferenceUpdate = Object.fromEntries(
            Object.keys(defaultPrefs).map((key) => [key, newPrefs[key]]),
        );
        const { data, error } = await authClient.updateUser(preferenceUpdate);
        if (error) {
            throw new Error(error.message || "Failed to update preferences");
        }

        if (data) {
            user.set(data);
        }
    }
    $prefs.set(newPrefs);
};

export const addToHistory = (item) => {
    let history = $prefs.get().history;
    history.unshift(item);
    history = history
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i) // remove duplicates
        .slice(0, 5);
    $prefs.set({ ...$prefs.get(), history });
};
