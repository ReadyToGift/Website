<template>
    <v-list-item :prepend-icon="props.icon">
        <v-list-item-title>{{ props.name }}</v-list-item-title>
        <v-list-item-subtitle v-if="props.name !== 'Password'">{{ props.modelValue.value }}</v-list-item-subtitle>
        <template v-slot:append>
            <v-dialog v-model="dialogOpen">
                <template v-slot:activator="{ props: activatorProps }">
                    <v-btn
                        v-bind="activatorProps"
                        :icon="mdiPencil"
                        variant="tonal"
                        class="ml-5"
                        size="small"
                    />
                </template>
                <template v-slot:default>
                    <v-confirm-edit
                        v-model="formData"
                        hide-actions
                    >
                        <template v-slot:default="{ model: proxyModel, isPristine }">
                            <v-card
                                class="mx-auto"
                                max-width="90%"
                                min-width="400"
                                :title="`Update ${props.name}`"
                            >
                                <template v-slot:text>
                                    <div
                                        :class="[
                                            'd-flex',
                                            // Reverse column direction for password fields so current password is above new password
                                            props.name === 'Password' ? 'flex-column-reverse' : 'flex-column',
                                            'gap-4',
                                            'pa-4'
                                        ]"
                                    >
                                        <v-text-field
                                            :label="props.name"
                                            v-model="proxyModel.value.value"
                                            :autocomplete="props.autocomplete"

                                            :append-icon="props.name === 'Password' ? (showNewPassword ? mdiEye : mdiEyeOff) : ''"
                                            @click:append="props.name === 'Password' ? (showNewPassword = !showNewPassword) : null"
                                            :type="props.name === 'Password' ? (showNewPassword ? 'text' : 'password') : 'text'"
                                        />
                                        <v-text-field
                                            v-if="props.requiresPassword"
                                            label="Current Password"
                                            autocomplete="current-password"
                                            v-model="proxyModel.value.passwordConfirmation"
                                            :append-icon="showCurrentPassword ? mdiEye : mdiEyeOff"
                                            @click:append="showCurrentPassword = !showCurrentPassword"
                                            :type="showCurrentPassword ? 'text' : 'password'"
                                        />
                                    </div>
                                </template>

                                <template v-slot:actions>
                                    <v-spacer/>
                                    <v-btn
                                        text
                                        @click="cancel"
                                    >
                                        Cancel
                                    </v-btn>
                                    <v-btn
                                        text
                                        @click="save(proxyModel.value)"
                                        :disabled="isPristine"
                                    >
                                        Update
                                    </v-btn>
                                </template>
                            </v-card>
                        </template>
                    </v-confirm-edit>
                </template>
            </v-dialog>
        </template>
    </v-list-item>
</template>

<script setup>
import { computed, shallowRef } from "vue";
import { mdiAccount, mdiEye, mdiEyeOff, mdiPencil } from "@mdi/js";
import { VBtn, VCard, VConfirmEdit, VDialog, VListItem, VListItemSubtitle, VListItemTitle, VSpacer, VTextField } from "vuetify/components";

const dialogOpen = shallowRef(false);

const props = defineProps({
    autocomplete: {
        default: "",
        type: String
    },
    icon: {
        default: mdiAccount,
        type: String
    },
    modelValue: {
        required: false,
        type: Object
    },
    name: {
        default: "Field",
        type: String
    },
    requiresPassword: {
        default: true,
        type: Boolean
    },
    save: {
        required: true,
        type: Function
    }
});

const showCurrentPassword = shallowRef(false);
const showNewPassword = shallowRef(false);

const emits = defineEmits(["update:modelValue", "save"]);

const formData = computed({
    get: () => props.modelValue,
    set: (value) => {
        if (props.name !== "Password") emits("update:modelValue", value);
    }
});

const cancel = () => {
    dialogOpen.value = false;
    showCurrentPassword.value = false;
    showNewPassword.value = false;
    if (props.modelValue.passwordConfirmation !== undefined) {
        emits("update:modelValue", {
            ...props.modelValue,
            passwordConfirmation: ""
        });
    }
};

const save = async (newValue) => {
    const success = await props.save(newValue);
    if (!success) {
        return;
    }

    emits("update:modelValue", {
        ...newValue,
        passwordConfirmation: ""
    });

    showCurrentPassword.value = false;
    showNewPassword.value = false;
    dialogOpen.value = false;
};
</script>