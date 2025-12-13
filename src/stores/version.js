import { atom } from "nanostores";;

export const loadCommit = atom(null);
export const loadBuildDate = atom(null);
export const outdated = atom(false);
export const showUpdatePrompt = atom(false);
export const isChecking = atom(false);

let checkInterval = null;

export const getBuildInfo = async () => {
    try {
        const response = await fetch("/api/version");
        if (!response.ok) {
            throw new Error(`Failed to fetch build info: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!loadCommit.get() && data.commit) {
            loadCommit.set(data.commit);
            loadBuildDate.set(data.buildDate || null);
        }
        return data;
    } catch (error) {
        console.error("Error fetching build info:", error);
    }
    return null;
};

export const startVersionCheck = (intervalMs = 60000) => {
    if (checkInterval) clearInterval(checkInterval);

    isChecking.set(true);

    const checkVersion = async () => {
        const info = await getBuildInfo();
        if (info && info.commit && info.commit !== loadCommit.get()) {
            outdated.set(true);
        }
    };

    checkVersion(); // Initial check
    checkInterval = setInterval(checkVersion, intervalMs);
};

export const stopVersionCheck = () => {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
    isChecking.set(false);
};
