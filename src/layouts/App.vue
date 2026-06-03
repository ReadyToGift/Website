<template>
    <v-app
        :theme="prefs?.darkMode ? 'dark' : 'light'"
    >
        <DashNav />
        <v-main>
            <router-view v-if="!loading && (!routeRequiresAuth || (routeRequiresAuth && !!user))" />
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
import { computed, onMounted, ref, watch } from "vue";
import { VApp, VBtn, VMain, VSnackbar } from "vuetify/components";
import { useTheme } from "vuetify";

import { UMAMI_DOMAINS, UMAMI_ID, UMAMI_URL } from "astro:env/client";

import DashNav from "@/components/vuetify/DashNav.vue";
import GlobalDialogs from "@/components/vuetify/GlobalDialogs.vue";

import { init as initBilling } from "@/stores/billing";
import { useStore } from "@nanostores/vue";

import { appInstalled, deferredPrompt } from "@/stores/pwa";
import { showUpdatePrompt as showUpdatePromptStore, startVersionCheck } from "@/stores/version";
import { useRouter } from "vue-router";

import { init as initAuth, user as userStore } from "@/stores/auth";
import { $prefs } from "@/stores/prefs";

const loading = ref(true);

const prefs = useStore($prefs);
const router = useRouter();
const user = useStore(userStore);

const routeRequiresAuth = computed(() => {
    if (!router?.currentRoute?.value) return false;
    const currentRoute = router.currentRoute.value;
    return currentRoute?.meta?.requiresAuth === true;
});
const vuetifyTheme = useTheme();

const showUpdatePrompt = useStore(showUpdatePromptStore);

const refreshApp = () => {
    window.location.reload();
};

const setThemeColor = () => {
    try {
        vuetifyTheme.change(prefs.darkMode ? "dark" : "light");
    } catch (error) {
        console.error("Failed to set theme color:", error);
    }
};

setThemeColor();

watch(
    () => prefs.darkMode,
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

onMounted(async () => {
    loading.value = "Loading Auth..."; // not currently used but could be useful for future loading states
    await initAuth({ router });
    if (UMAMI_URL && UMAMI_ID) {
        const script = document.createElement("script");
        script.src = `${UMAMI_URL}`;
        script.setAttribute("data-website-id", UMAMI_ID);
        if (UMAMI_DOMAINS) {
            script.setAttribute("data-domains", UMAMI_DOMAINS);
        }
        document.head.appendChild(script);
    }

    await initBilling();

    loading.value = false;
    startVersionCheck(1000 * 60 * 5); // Check every 5 minutes
});
</script>


<style scoped>
.v-application {
    height: auto;
}

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
