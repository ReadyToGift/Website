<template>
    <v-card-title>
        Select Image
    </v-card-title>
    <v-card-subtitle>
        Please select the image you would like to use for this item.
    </v-card-subtitle>
    <v-card-text
        width="500px"
        class="text-center"
    >
        <Splide
            :has-track="false"
            :options="mainSliderOptions"
            ref="main"
            aria-label="..."
        >
            <SplideTrack>
                <SplideSlide
                    v-for="image in images"
                    :key="image.src"
                >
                    <v-img
                        :src="image.src"
                        height="400"
                        contain
                    />
                </SplideSlide>

            </SplideTrack>
        </Splide>
        <div class="carousel-arrows">
            <v-btn
                class="carousel-arrow carousel-arrow-prev"
                :icon="mdiChevronRight"
                @click="prevSlide"
            />
            <v-btn
                class="carousel-arrow carousel-arrow-next"
                :icon="mdiChevronRight"
                @click="nextSlide"
            />
        </div>
        <Splide
            :options="thumbSliderOptions"
            ref="thumbnail"
            class="thumbnail"
        >
            <SplideSlide
                v-for="image in images"
                :key="image.src"
            >
                <v-img
                    :src="image.src"
                    contain
                />
            </SplideSlide>
        </Splide>
        <v-chip
            :text="`${ currentImageIndex + 1 } / ${images.length }`"
            color="primary"
            size="small"
            variant="flat"
            rounded="pill"
            elevation="14"
            class="mt-4"
        />
    </v-card-text>
    <v-card-actions>
        <v-spacer />
        <v-btn
            text="Select"
            color="primary"
            @click="$emit('select-image', currentImageIndex)"
            variant="tonal"
        />
    </v-card-actions>
</template>

<script setup>
import { onMounted, shallowRef, useTemplateRef } from "vue";
import { Splide, SplideSlide, SplideTrack } from "@splidejs/vue-splide";
import { mdiChevronRight } from "@mdi/js";

import "@splidejs/vue-splide/css";

const currentImageIndex = shallowRef(0);
defineEmits(["select-image"]);

// Ref: https://codestax.medium.com/easy-way-to-create-a-slider-in-vue-js-with-splide-js-8905e88dc8ab
const mainSliderOptions = {
    arrows: false,
    pagination: false,
    perPage: 1,
    type: "slide"
};

const thumbSliderOptions = {
    arrows: false,
    fixedWidth: 100,
    focus: "center",
    gap: 0,
    isNavigation: true,
    pagination: false,
    type: "slide"
};

const mainSlider = useTemplateRef("main");
const thumbnailSlider = useTemplateRef("thumbnail");

defineProps({
    images: {
        required: true,
        type: Array
    }
});

const nextSlide = () => {
    mainSlider.value.splide.go("+1");
};

const prevSlide = () => {
    mainSlider.value.splide.go("-1");
};

onMounted(() => {
    mainSlider.value.splide.sync(thumbnailSlider.value.splide);

    mainSlider.value.splide.on("move", (newIndex) => {
        currentImageIndex.value = newIndex;
    });
});

</script>

<style lang="scss">
.thumbnail {
    .splide__track--nav > .splide__list > .splide__slide.is-active {
        border: 5px solid rgb(var(--v-theme-primary));
    }
}
.carousel-arrows {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
    margin-block: 0.5rem 1rem;
    .carousel-arrow {
        position: static;
        transform: none;

        &.carousel-arrow-prev {
            transform: rotate(180deg);
        }
    }
}
</style>
