<template>
    <div class="app-nav">
        <v-navigation-drawer
            expand-on-hover
            permanent
            rail
            v-if="!$vuetify.display.mobile"
        >
            <v-list v-if="account">
                <v-list-item
                    :prepend-avatar="account.avatar"
                    :title="account.name || account.email"
                    :subtitle="account.email"
                />
            </v-list>
            <v-divider/>
            <v-list
                density="compact"
                nav
            >
                <v-list-item
                    :prepend-icon="mdiFormatListBulleted"
                    title="Lists"
                    href="/dash/lists"
                />
            </v-list>
            <v-list
                v-if="prefs.history.length > 0"
            >
                <v-divider />
                <v-list-item
                    :prepend-icon="mdiClock"
                    title="Recently Viewed"
                    disabled
                />
                <v-list-item
                    v-for="history in prefs.history"
                    :key="history.id"
                    :title="history.title"
                    :subtitle="history.subtitle"
                    :href="`/list/${history.id}`"
                    :prepend-avatar="history.avatar"
                />
            </v-list>
            <template v-slot:append>
                <v-list>
                    <v-list-item
                        :prepend-icon="mdiGithub"
                        href="https://github.com/ReadyToGift/Website"
                        title="GitHub"
                        target="_blank"
                    />
                    <QuickSettings>
                        <template v-slot:activator="{ props }">
                            <v-list-item
                                :prepend-icon="mdiCog"
                                title="Settings"
                                v-bind="props"
                            />
                        </template>
                    </QuickSettings>
                    <v-list-item
                        :prepend-icon="mdiLogout"
                        title="Log Out"
                        @click="logout"
                        :loading="loadingLoginLogout"
                        v-if="account"
                    />
                    <v-list-item
                        :prepend-icon="mdiLogin"
                        title="Log In"
                        @click="logIn"
                        :loading="loadingLoginLogout"
                        v-else
                    />
                </v-list>
            </template>
        </v-navigation-drawer>

        <v-app-bar
            color="primary"
            width="lg"
            variant="tonal"
            elevation="6"
            v-else
        >
            <v-toolbar-title>
                <v-btn
                    href="/dash/lists"
                    :prepend-icon="mdiGift"
                    color="on-primary-container"
                >
                    readyto.gift
                </v-btn>
            </v-toolbar-title>

            <template v-slot:append>
                <v-btn
                    href="/dash/lists"
                    v-if="account"
                    :prepend-icon="mdiFormatListBulleted"
                    color="on-primary-container"
                    variant="tonal"
                >
                    Lists
                </v-btn>

                <QuickSettings>
                    <template v-slot:activator="{ props }">
                        <v-btn
                            :icon="mdiAccountCircle"
                            v-bind="props"
                            class="ml-2"
                            density="compact"
                            size="large"
                        />
                    </template>
                </QuickSettings>
            </template>


            <v-progress-linear
                :active="loading"
                indeterminate
                color="primary"
                absolute
                bottom
            />
        </v-app-bar>
    </div>
</template>

<script>
import {
    mdiAccountCircle,
    mdiClock,
    mdiCog,
    mdiFormatListBulleted,
    mdiGift,
    mdiGithub,
    mdiLockReset,
    mdiLogin,
    mdiLogout,
    mdiMenu,
    mdiTune
} from "@mdi/js";
// import { account } from "@/appwrite";
// import { clientRouter } from "@/pages/_clientRouter";
import QuickSettings from "./dialogs/QuickSettings.vue";

import { $prefs } from "@/stores/prefs";
import { user } from "@/stores/auth";
import { useStore } from "@nanostores/vue";


export default {
    components: {
        QuickSettings
    },
    props: {
        loading: {
            type: Boolean,
            default: true
        }
    },
    data() {
        return {
            account: useStore(user),
            loadingLoginLogout: false,
            prefs: useStore($prefs),
            mdiAccountCircle,
            mdiClock,
            mdiCog,
            mdiFormatListBulleted,
            mdiGift,
            mdiGithub,
            mdiLockReset,
            mdiLogin,
            mdiLogout,
            mdiMenu,
            mdiTune
        };
    },
    methods: {
        logIn () {
            this.loadingLoginLogout = true;
            const currentPath = window.location.pathname + window.location.search;
            window.location.href = `/dash/login?redirect=${encodeURIComponent(currentPath)}`;
            this.loadingLoginLogout = false;
        },
        async logout() {
            this.loadingLoginLogout = true;
            await fetch("/api/auth", {
                method: "DELETE",
                credentials: "include"
            });
            window.location.reload();
        }
    }
};
</script>