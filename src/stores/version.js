import { BUILD_COMMIT, BUILD_DATE } from "astro:env/client";
import { atom } from "nanostores";

export const loadCommit = atom(BUILD_COMMIT);
export const loadBuildDate = atom(BUILD_DATE);
export const outdated = atom(false);
export const showUpdatePrompt = atom(false);
export const isChecking = atom(false);

let checkInterval = null;

export const getBuildInfo = async () => {
    try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(
                `Failed to fetch build info: ${response.status} ${response.statusText}`,
            );
        }
        const data = await response.json();
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
        if (
            info?.commit &&
            (info.commit !== loadCommit.get() ||
                info.buildDate !== loadBuildDate.get())
        ) {
            if (!outdated.get()) {
                outdated.set(true);
                showUpdatePrompt.set(true);
            }
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
