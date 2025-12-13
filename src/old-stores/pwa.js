import { defineStore } from "pinia";

const appInstalled = window.matchMedia("(display-mode: standalone)").matches;

export const usePWA = defineStore("pwa",{
    state: () => ({
        deferredPrompt: null,
        appInstalled
    }),
    actions: {
        setDeferredPrompt(deferredPrompt) {
            this.deferredPrompt = deferredPrompt;
        },
        setAppInstalled(appInstalled) {
            this.appInstalled = appInstalled;
        }
    }
});
