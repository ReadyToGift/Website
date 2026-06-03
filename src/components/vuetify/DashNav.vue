<template>
    <div class="app-nav">
        <v-navigation-drawer
            expand-on-hover
            permanent
            rail
            v-if="!$vuetify.display.mobile"
        >
            <v-list v-if="user">
                <v-list-item
                    :prepend-avatar="user.avatar"
                    :title="user.name || user.email"
                    :subtitle="user.email"
                />
            </v-list>
            <v-divider v-if="user" />
            <v-list
                density="compact"
                nav
                v-if="user"
            >
                <v-list-item
                    :prepend-icon="mdiFormatListBulleted"
                    title="Lists"
                    to="/dash/lists"
                />
                <v-list-item
                    :prepend-icon="mdiCog"
                    title="Settings"
                    to="/dash/settings"
                />
            </v-list>
            <v-list
                v-if="prefs.history && prefs.history.length > 0"
            >
                <v-divider v-if="user" />
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
                    <QuickSettings :hide="['login', 'logout']">
                        <template v-slot:activator="{ props }">
                            <v-list-item
                                :prepend-icon="mdiTune"
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
                        v-if="user"
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
                    v-if="user"
                    :prepend-icon="mdiFormatListBulleted"
                    color="on-primary-container"
                    variant="tonal"
                >
                    Lists
                </v-btn>

                <QuickSettings @logout="logout">
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
import { 
    VAppBar, 
    VBtn, 
    VDivider, 
    VList, 
    VListItem, 
    VNavigationDrawer, 
    VProgressLinear, 
    VToolbarTitle 
} from "vuetify/components";
import QuickSettings from "./dialogs/QuickSettings.vue";

import { logOut as logOutUser, user as userStore } from "@/stores/auth";
import { $prefs } from "@/stores/prefs";
import { useStore } from "@nanostores/vue";

const prefs = useStore($prefs);
const user = useStore(userStore);


export default {
    components: {
        QuickSettings,
        VNavigationDrawer,
        VList,
        VListItem,
        VDivider,
        VAppBar,
        VToolbarTitle,
        VBtn,
        VProgressLinear
    },
    props: {
        loading: {
            type: Boolean,
            default: true
        }
    },
    data() {
        return {
            loadingLoginLogout: false,
            prefs,
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
            mdiTune,
            user
        };
    },
    methods: {
        logIn () {
            this.loadingLoginLogout = true;
            const currentPath = window.location.pathname + window.location.search;
            this.$router.push({ path: "/dash/login", query: { redirect: currentPath } });
            this.loadingLoginLogout = false;
        },
        async logout() {
            this.loadingLoginLogout = true;
            await logOutUser();
            window.location.reload();
        }
    }
};
</script>