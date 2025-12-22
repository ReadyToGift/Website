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
            <v-list v-if="user">
                <v-list-item
                    :prepend-avatar="user.avatar"
                    :subtitle="user.name ? user.email : null"
                    :title="user.name || user.email"
                />
            </v-list>
            <v-divider v-if="user" />
            <v-list>
                <v-list-item :prepend-icon="mdiCog">
                    Quick Settings
                </v-list-item>
                <v-list-item>
                    <v-list>
                        <v-list-item title="Dark Mode">
                            <template #prepend>
                                <v-switch
                                    v-model="newUserPrefs.darkMode"
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
                                    v-model="newUserPrefs.showTotalPrice"
                                    hide-details
                                    inset
                                    color="primary"
                                    class="mr-4"
                                />
                            </template>
                        </v-list-item>                            
                        <v-list-item
                            v-if="!!account"
                            title="Spoil Surprises"
                        >
                            <template #prepend>
                                <v-switch
                                    v-model="newUserPrefs.spoilSurprises"
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
                    href="/dash/about"
                >
                    About
                </v-list-item>
                <v-list-item
                    v-if="!!user"
                    href="/dash/settings"
                    :prepend-icon="mdiAccountCircle"
                >
                    Account Settings
                </v-list-item>
            </v-list>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    color="primary"
                    v-if="!user && !hide.includes('login')"
                    :loading="loadingLoginLogout"
                    :href="`/dash/login?redirect=${redirectURL}`"
                >
                    Log In
                </v-btn>

                <v-btn
                    @click="emit('logout')"
                    color="error"
                    :loading="loadingLoginLogout"
                    v-else-if="!hide.includes('logout')"
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
import { 
    VBtn, 
    VCard, 
    VCardActions, 
    VDivider, 
    VList, 
    VListItem, 
    VMenu, 
    VSpacer, 
    VSwitch 
} from "vuetify/components";
import { account } from "@/appwrite";
import { ref } from "vue";

import { $prefs, updatePrefs as updateUserPrefs } from "@/stores/prefs";
import { user as authUser } from "@/stores/auth";
import { useStore } from "@nanostores/vue";

const prefs = useStore($prefs);
const newUserPrefs = ref(Object.assign({}, prefs.value));

const user = useStore(authUser);

const loadingLoginLogout = ref(false);
const menu = ref(false);

const props = defineProps({
    hide: {
        default: () => ([]),
        type: Array
    }
});

const emit = defineEmits(["logout"]);

const updatePrefs = async () => {
    await updateUserPrefs(newUserPrefs.value);
    menu.value = false;
};

const redirectURL = encodeURIComponent(
    window.location.pathname + window.location.search
);

</script>