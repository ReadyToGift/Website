<template>
    <v-app
        old-theme="auth.userPrefs.darkMode ? 'dark' : 'light'"
        theme="dark"
    >
        <DashNav />
        <v-main>
            <slot></slot>
            <GlobalDialogs />
            <v-snackbar
                v-model="versionStore.showUpdatePrompt"
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
                            @click="versionStore.showUpdatePrompt = false"
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
import DashNav from "@/components/DashNav.vue";
import GlobalDialogs from "@/components/GlobalDialogs.vue";
import { usePWA } from "@/stores/pwa";
import { useVersion } from "@/stores/version";

const pwa = usePWA();
const versionStore = useVersion();

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pwa.setDeferredPrompt(e);
});

window.addEventListener("appinstalled", () => {
    pwa.setAppInstalled(true);
    console.log("App is installed!");
});
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
