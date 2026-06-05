import { createVuetify } from "vuetify";
import { vuetifyOptions } from "@/plugins/vuetify";

export default async function setup(app) {
    if (import.meta.env.SSR) {
        // During SSR we only initialize Vuetify for pages that mount the Vue app.
        // Leave it to the client-side bootstrap to lazy-load the plugin.
        return;
    }

    const isDarkMode = document.documentElement.classList.contains("dark");

    // Check if we're on a SPA route and lazily add Vuetify + router
    const path = window.location.pathname;
    if (path.startsWith("/dash") || path.startsWith("/list")) {
        // Lazy-load Vuetify only for routes that need the Vue app

        vuetifyOptions.theme.defaultTheme = isDarkMode ? "dark" : "light";

        const vuetify = createVuetify({
            ...vuetifyOptions
        });
        app.use(vuetify);

        const { clientRouter } = await import("@/router");
        app.use(clientRouter);
    }
}
