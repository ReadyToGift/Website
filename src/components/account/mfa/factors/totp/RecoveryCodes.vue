<template>
    <v-card-text>
        <ol class="recovery-codes">
            <li
                class="recovery-code"
                v-for="recoveryCode in props.recoveryCodes"
                :key="recoveryCode"
            >
                {{ recoveryCode }}
            </li>
        </ol>
        <v-btn
            @click="downloadRecoveryCodes"
            class="mt-4"
        >
            Download
        </v-btn>
    </v-card-text>
</template>

<script setup>
import { VBtn, VCardText } from "vuetify/components";

const props = defineProps({
    recoveryCodes: {
        required: true,
        type: Array
    }
});

const downloadRecoveryCodes = () => {
    const textData = props.recoveryCodes.join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", "data:text/plain;charset=UTF-8," + encodeURIComponent(textData));
    link.setAttribute("download", "readyto_gift-recovery-codes.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
</script>

<style lang="scss" scoped>
.recovery-codes {
    padding: 0 1rem;
    font-size: 1.2rem;
    margin: 0;
}
</style>