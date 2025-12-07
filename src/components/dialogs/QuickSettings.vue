<template>
    <v-menu
        :close-on-content-click="false"
        v-model="menu"
    >
        <template v-slot:activator="{ props }">
            <slot
                name="activator"
                :props="props"
            ></slot>
        </template>
        <v-card>
            <v-list v-if="auth.user">
                <v-list-item
                    :prepend-avatar="auth.avatar"
                    :subtitle="auth.user.name ? auth.user.email : null"
                    :title="auth.user.name || auth.user.email"
                />
            </v-list>
            <v-divider v-if="auth.user" />
            <v-list>
                <v-list-item :prepend-icon="mdiCog">
                    Quick Settings
                </v-list-item>
                <v-list-item>
                    <v-list>
                        <v-list-item title="Dark Mode">
                            <template #prepend>
                                <v-switch
                                    v-model="auth.newUserPrefs.darkMode"
                                    hide-details
                                    inset
                                    color="primary"
                                    class="mr-4"
                                />
                            </template>
                        </v-list-item>
                        <v-list-item title="Show Total Price">
                            <template #prepend>
                                <v-switch
                                    v-model="auth.newUserPrefs.showTotalPrice"
                                    hide-details
                                    inset
                                    color="primary"
                                    class="mr-4"
                                />
                            </template>
                        </v-list-item>                            
                        <v-list-item
                            v-if="!!auth.user"
                            title="Spoil Surprises"
                        >
                            <template #prepend>
                                <v-switch
                                    v-model="auth.newUserPrefs.spoilSurprises"
                                    hide-details
                                    inset
                                    color="primary"
                                    class="mr-4"
                                />
                            </template>
                        </v-list-item>
                    </v-list>
                </v-list-item>
                <v-list-item
                    :prepend-icon="mdiInformation"
                    to="/dash/about"
                >
                    About
                </v-list-item>
                <v-list-item
                    v-if="!!auth.user"
                    to="/dash/settings"
                    :prepend-icon="mdiAccountCircle"
                >
                    Account Settings
                </v-list-item>
            </v-list>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    @click="emit('logIn')"
                    color="primary"
                    v-if="!auth.user"
                    :loading="loadingLoginLogout"
                >
                    Log In</v-btn>

                <v-btn
                    @click="emit('logout')"
                    color="error"
                    :loading="loadingLoginLogout"
                    v-else
                >
                    Logout
                </v-btn>
                <v-btn @click="menu = false">Cancel</v-btn>

                <v-btn
                    @click="updatePrefs"
                    color="primary"
                    variant="elevated"
                >Save</v-btn>
            </v-card-actions>
        </v-card>
    </v-menu>
</template>

<script setup>
import { mdiAccountCircle, mdiCog, mdiInformation } from "@mdi/js";
import { account } from "@/appwrite";
import { clientRouter } from "@/pages/_clientRouter";
import { shallowRef } from "vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

const loadingLoginLogout = shallowRef(false);
const menu = shallowRef(false);

const emit = defineEmits(["logout", "logIn"]);

const updatePrefs = async () => {
    if (auth.user) {
        const accountResponse = await account.updatePrefs(auth.newUserPrefs);
        auth.userPrefs = accountResponse.prefs;
    } else {
        localStorage.setItem("userPrefs", JSON.stringify(auth.newUserPrefs));
    }

    auth.userPrefs = { ...auth.newUserPrefs };

    menu.value = false;
};

clientRouter.afterEach(() => {
    menu.value = false;
});

</script>