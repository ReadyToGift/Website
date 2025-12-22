<template>
    <v-card
        title="Try the app!"
        variant="tonal"
        v-if="!locallyDismissed && deferredPrompt && prefs.hidePWAInstallPrompt !== true"
    >
        <v-card-text pt="4">
            <p>
                Add this website as an app to your home screen for a better experience.
            </p>
            <p>
                It even allows for sharing links directly to the app to add them to your wishlist!
            </p>
            <div
                class="buttons mt-5 d-flex flex-wrap ga-3"
            >
                <v-btn
                    variant="elevated"
                    color="primary"
                    ref="pwaPromptButton"
                    @click="installPWA"
                >
                    Install
                </v-btn>
                <v-btn
                    variant="tonal"
                    :append-icon="mdiMenuDown"
                    v-bind="menuOpen"
                >
                    Dismiss

                    <v-menu
                        activator="parent"
                        location="bottom start"
                        transition="fade-transition"
                        v-model="menuOpen"
                    >
                        <v-list
                            density="compact"
                            rounded="lg"
                            slim
                        >
                            <v-list-item @click="dismissForDevice">
                                For this device
                            </v-list-item>
                            <v-list-item @click="dismissForever">
                                For all devices
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-btn>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { $prefs, updatePrefs } from "@/stores/prefs";
import { appInstalled, deferredPrompt as deferredPromptStore, locallyDismissed as locallyDismissedStore } from "@/stores/pwa";
import { VBtn, VCard, VCardText, VList, VListItem, VMenu } from "vuetify/components";
import { create as createDialog } from "@/stores/dialogs";
import { mdiMenuDown } from "@mdi/js";
import { ref } from "vue";
import { useStore } from "@nanostores/vue";

const prefs = useStore($prefs);
const locallyDismissed = useStore(locallyDismissedStore);
const deferredPrompt = useStore(deferredPromptStore);

let menuOpen = ref(false);

const installPWA = () => {
    console.log("installing PWA");
    deferredPrompt.value.prompt();
    deferredPrompt.value.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
            appInstalled.value = true;
        }
        deferredPromptStore.set(null);
    });
};

const dismissForever = async () => {
    await updatePrefs({ ...$prefs.value, hidePWAInstallPrompt: true });
    createDialog({
        actions: [
            {
                action: "close",
                color: "primary",
                text: "OK"
            }
        ],
        text: "The PWA install prompt will no longer show for this account. You can still install the app from your browser's menu.",
        title: "Prompt dismissed"
    });
    menuOpen.value = false;
};

const dismissForDevice = () => {
    locallyDismissedStore.set(true);
    createDialog({
        actions: [
            {
                action: "close",
                color: "primary",
                text: "OK"
            }
        ],
        text: "The PWA install prompt will no longer show for this device. You can still install the app from your browser's menu.",
        title: "Prompt dismissed"
    });
    menuOpen.value = false;
};
</script>