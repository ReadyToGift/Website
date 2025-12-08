<template>
    <div class="app-nav">
        <v-navigation-drawer
            expand-on-hover
            permanent
            rail
            v-if="!$vuetify.display.mobile"
        >
            <v-list v-if="auth.user">
                <v-list-item
                    :prepend-avatar="auth.avatar"
                    :title="auth.user.name || auth.user.email"
                    :subtitle="auth.user.email"
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
                    to="/dash/lists"
                />
            </v-list>
            <v-list
                v-if="auth.userPrefs.history.length > 0"
            >
                <v-divider />
                <v-list-item
                    :prepend-icon="mdiClock"
                    title="Recently Viewed"
                    disabled
                />
                <v-list-item
                    v-for="history in auth.userPrefs.history"
                    :key="history.id"
                    :title="history.title"
                    :subtitle="history.subtitle"
                    :to="`/list/${history.id}`"
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
                        v-if="auth.user"
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
                    to="/dash/lists"
                    :prepend-icon="mdiGift"
                    color="on-primary-container"
                >
                    readyto.gift
                </v-btn>
            </v-toolbar-title>

            <template v-slot:append>
                <v-btn
                    to="/dash/lists"
                    v-if="auth.user"
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
import { account } from "@/appwrite";
import { clientRouter } from "@/pages/_clientRouter";
import QuickSettings from "./dialogs/QuickSettings.vue";
import { useAuthStore } from "@/stores/auth";

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
            auth: useAuthStore(),
            loadingLoginLogout: false,
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
            clientRouter.push({
                path: "/dash/login",
                query: { redirect: encodeURIComponent(currentPath) }
            });
            this.loadingLoginLogout = false;
        },
        async logout() {
            this.loadingLoginLogout = true;
            await account.deleteSession("current");
            this.auth.user = null;
            await this.auth.init();
            this.loadingLoginLogout = false;
            const route = clientRouter.currentRoute.value;
            if (route.meta.requiresAuth) {
                this.logIn();
            }
        }
    }
};
</script>