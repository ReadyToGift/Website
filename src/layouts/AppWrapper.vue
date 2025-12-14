<template>
    <v-app
        :theme="prefs?.darkMode ? 'dark' : 'light'"
    >
        <DashNav />
        <v-main>
            <slot></slot>
            <GlobalDialogs />
            <v-snackbar
                v-model="showUpdatePrompt"
                location="bottom"
                width="100%"
                color="primary"
                elevation="2"
                :timeout="-1"
            >
                <div class="snackbar-content update-available">
                    <span>A new version of the app is available.<br/>Please refresh to ensure the best experience.</span>
                    <div class="buttons">
                        <v-btn
                            color="white"
                            text
                            @click="refreshApp"
                        >
                            Refresh
                        </v-btn>
                        <v-btn
                            variant="tonal"
                            color="surface"
                            @click="showUpdatePromptStore.set(false)"
                        >
                            Dismiss
                        </v-btn>
                    </div>
                </div>
            </v-snackbar>
        </v-main>
    </v-app>
</template>

<script setup>
import "vuetify/styles";
import "@/assets/main.scss";
import { onMounted, watch } from "vue";
import { useTheme } from "vuetify";

import DashNav from "@/components/DashNav.vue";
import GlobalDialogs from "@/components/GlobalDialogs.vue";

import { useStore } from "@nanostores/vue";

import { $prefs, loadPrefs } from "@/stores/prefs";
import { appInstalled, deferredPrompt } from "@/stores/pwa";
import { showUpdatePrompt as showUpdatePromptStore, startVersionCheck } from "@/stores/version";
import { init as initAuth } from "@/stores/auth";
import { init as initCurrencies } from "@/stores/currency";

const prefs = useStore($prefs);

const props = defineProps({
    user: {
        type: Object,
        required: false
    }
});

if (props.user) {
    if (props.user.prefs) {
        loadPrefs(props.user.prefs);
    }
    if (props.user.account) {
        console.log("Initializing auth with user account and session.");
        initAuth({ user: props.user.account, session: props.user.session, factors: props.user.mfaFactors } );
    }
}

const vuetifyTheme = useTheme();

// Initialize currencies without blocking
initCurrencies().catch((error) => {
    console.error("Failed to initialize currencies:", error);
});

const showUpdatePrompt = useStore(showUpdatePromptStore);

const refreshApp = () => {
    window.location.reload();
};

const setThemeColor = () => {
    try {
        vuetifyTheme.change(prefs.value.darkMode ? "dark" : "light");
    } catch (error) {
        console.error("Failed to set theme color:", error);
    }
};

setThemeColor();

watch(
    () => prefs.value.darkMode,
    () => {
        setThemeColor();
    }
);

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.set(e);
    console.log("beforeinstallprompt event fired");
});

window.addEventListener("appinstalled", () => {
    appInstalled.set(true);
    console.log("App is installed!");
});

onMounted(() => {
    startVersionCheck(1000 * 60 * 5); // Check every 5 minutes
});



// import { usePWA } from "@/stores/pwa";
// import { useVersion } from "@/stores/version";

// const pwa = usePWA();
// const versionStore = useVersion();

// console.log(window)
</script>


<style scoped>
header {
    line-height: 1.5;
    max-height: 100vh;
}

.logo {
    display: block;
    margin: 0 auto 2rem;
}

nav {
    width: 100%;
    font-size: 12px;
    text-align: center;
    margin-top: 2rem;
}

nav a.router-link-exact-active {
    color: var(--color-text);
}

nav a.router-link-exact-active:hover {
    background-color: transparent;
}

nav a {
    display: inline-block;
    padding: 0 1rem;
    border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
    border: 0;
}

.v-main {
    display: grid;
    grid-template-rows: 1fr max-content;
}

.page-content {
    height: 100%;
}

.update-available {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 1rem;

    .buttons {
        display: flex;
        gap: 1rem;
    }

    @media screen and (max-width: 768px){
        flex-direction: column;
        align-items: stretch;
    }
}

@media (min-width: 1024px) {
    header {
        display: flex;
        place-items: center;
        padding-right: calc(var(--section-gap) / 2);
    }

    .logo {
        margin: 0 2rem 0 0;
    }

    header .wrapper {
        display: flex;
        place-items: flex-start;
        flex-wrap: wrap;
    }

    nav {
        text-align: left;
        margin-left: -1rem;
        font-size: 1rem;

        padding: 1rem 0;
        margin-top: 1rem;
    }
}
</style>
