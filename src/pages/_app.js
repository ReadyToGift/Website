export default async function setup(app) {
    if (import.meta.env.SSR) {
        // During SSR we only initialize Vuetify for pages that mount the Vue app.
        // Leave it to the client-side bootstrap to lazy-load the plugin.
        return;
    }

    // Check if we're on a SPA route and lazily add Vuetify + router
    const path = window.location.pathname;
    if (path.startsWith("/dash") || path.startsWith("/list")) {
        // Lazy-load Vuetify only for routes that need the Vue app
        const vuetify = (await import("@/plugins/vuetify")).default;
        app.use(vuetify);

        const { clientRouter } = await import("@/router");
        app.use(clientRouter);
    }
}
