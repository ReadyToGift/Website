import { defineStore } from "pinia";

const DEFAULT_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes
const FETCH_TIMEOUT_MS = 10_000; // 10 seconds
const INITIAL_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

export const useVersion = defineStore("version", {
    state: () => ({
        loadCommit: null,
        checkInterval: null,
        outdated: false,
        showUpdatePrompt: false,
        isChecking: false
    }),
    actions: {
        async getBuildCommit(timeoutMs = FETCH_TIMEOUT_MS) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const resp = await fetch("/api/version", { signal: controller.signal, cache: "no-store" });
                clearTimeout(timeout);
                if (!resp.ok) {
                    console.warn("Failed to fetch version info:", resp.status);
                    return null;
                }
                const data = await resp.json();
                return data && data.commit ? data.commit : null;
            } catch (err) {
                if (err && err.name === "AbortError") {
                    console.warn("Version fetch aborted due to timeout");
                } else {
                    console.warn("Version fetch error:", err);
                }
                return null;
            } finally {
                clearTimeout(timeout);
            }
        },

        async _fetchInitialCommitWithRetries() {
            for (let i = 0; i < INITIAL_RETRIES; i++) {
                const commit = await this.getBuildCommit();
                if (commit) return commit;
                await new Promise((res) => setTimeout(res, INITIAL_RETRY_DELAY_MS));
            }
            return null;
        },

        async startVersionCheck(intervalMs = DEFAULT_INTERVAL_MS) {
            // stop any existing check
            this.stopVersionCheck();

            this.isChecking = true;

            // establish a baseline commit (with retries)
            this.loadCommit = await this._fetchInitialCommitWithRetries();

            const loop = async () => {
                if (!this.isChecking) return;
                try {
                    const latestBuildCommit = await this.getBuildCommit();
                    if (this.loadCommit && latestBuildCommit && latestBuildCommit !== this.loadCommit) {
                        this.outdated = true;
                        this.showUpdatePrompt = true;
                        this.stopVersionCheck();
                        return;
                    }
                    if (!this.loadCommit && latestBuildCommit) {
                        this.loadCommit = latestBuildCommit;
                    }
                } catch {
                    // handled in getBuildCommit
                } finally {
                    if (this.isChecking) {
                        this.checkInterval = setTimeout(loop, intervalMs);
                    }
                }
            };

            // schedule first check after the interval to match prior behaviour
            this.checkInterval = setTimeout(loop, intervalMs);
        },

        stopVersionCheck() {
            this.isChecking = false;
            if (this.checkInterval) {
                clearTimeout(this.checkInterval);
                this.checkInterval = null;
            }
        }
    }
});
