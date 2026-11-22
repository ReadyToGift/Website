<template>
    <v-app :theme="prefs?.darkMode ? 'dark' : 'light'">
        <DashNav />
        <v-main>
            <div class="route-content">
                <router-view
                    v-if="
                        !loading &&
                        (!routeRequiresAuth || (routeRequiresAuth && !!user))
                    "
                />
                <div
                    v-else
                    class="startup-loader"
                    role="status"
                    aria-live="polite"
                >
                    <v-progress-circular
                        indeterminate
                        size="80"
                        width="8"
                        color="primary"
                        aria-hidden="true"
                    />
                    <h1>Loading…</h1>
                </div>
            </div>
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
                    <span
                        >A new version of the app is available.<br>Please
                        refresh to ensure the best experience.</span
                    >
                    <div class="buttons">
                        <v-btn color="white" text @click="refreshApp">
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
        <SiteFooter />
    </v-app>
</template>

<script setup>
import { useStore } from "@nanostores/vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "vuetify";
import {
    VApp,
    VBtn,
    VMain,
    VProgressCircular,
    VSnackbar,
} from "vuetify/components";
import "vuetify/styles";
import "@/assets/main.scss";
import DashNav from "@/components/DashNav.vue";
import GlobalDialogs from "@/components/GlobalDialogs.vue";
import SiteFooter from "@/components/SiteFooter.vue";
import { init as initAuth, user as userStore } from "@/stores/auth";
import { init as initBilling } from "@/stores/billing";
import { $prefs } from "@/stores/prefs";
import { appInstalled, deferredPrompt } from "@/stores/pwa";
import {
    showUpdatePrompt as showUpdatePromptStore,
    startVersionCheck,
} from "@/stores/version";

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
    },
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
    await initAuth({ router });
    await initBilling();

    loading.value = false;
    startVersionCheck(1000 * 60 * 5); // Check every 5 minutes
});
</script>

<style scoped>
.v-application {
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
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
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.route-content {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
}

.route-content > :deep(.page-content),
.route-content > :deep(.loader-outer) {
    flex: 1 0 auto;
    height: auto;
}

.startup-loader {
    flex: 1 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    padding: 2rem 0;
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

    @media screen and (max-width: 768px) {
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
