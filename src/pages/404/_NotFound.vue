<template>
    <div class="page-content">
        <h1>404</h1>
        <p>Page not found</p>
        <v-btn href="/">Go Home</v-btn>
    </div>
</template>

<style lang="scss" scoped>
.page-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    align-items: center;
    text-align: center;

    h1 {
        font-size: 8rem;
    }

    p {
        font-size: 2rem;
    }
}
</style>
