<template>
    <div class="view-toggle">
        <button
            type="button"
            :class="{ active: mode === 'line' }"
            :aria-pressed="mode === 'line'"
            aria-label="Show items in a list"
            @click="mode = 'line'"
        >
            <span aria-hidden="true">☰</span>
        </button>
        <button
            type="button"
            :class="{ active: mode === 'grid' }"
            :aria-pressed="mode === 'grid'"
            aria-label="Show items in a grid"
            @click="mode = 'grid'"
        >
            <span aria-hidden="true">▦</span>
        </button>
    </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";

const storageKey = "wedding-items-view";
const mode = ref("line");

const applyMode = (value) => {
    document.documentElement.dataset.weddingItemsView = value;
    document.querySelectorAll("[data-wedding-items]").forEach((element) => {
        element.setAttribute("data-view", value);
    });
};

onMounted(() => {
    let savedMode;
    try {
        savedMode = window.localStorage.getItem(storageKey);
    } catch {}
    if (savedMode === "grid" || savedMode === "line") mode.value = savedMode;
    applyMode(mode.value);
});

watch(mode, (value) => {
    try {
        window.localStorage.setItem(storageKey, value);
    } catch {}
    applyMode(value);
});
</script>

<style scoped>
.view-toggle {
    align-items: center;
    display: flex;
    gap: 0.25rem;
}

button {
    align-items: center;
    background: transparent;
    border: 1px solid var(--wedding-button, #9bcbed);
    border-radius: 0.3rem;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    font-size: 1.1rem;
    height: 2.75rem;
    justify-content: center;
    width: 2.75rem;
}

button.active {
    background: var(--wedding-button, #9bcbed);
    border-color: var(--wedding-button, #9bcbed);
    color: var(--wedding-accent, #083c62);
}
</style>
