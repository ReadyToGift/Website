import { init as initAuth } from "@/stores/auth";
import vuetify from "@/plugins/vuetify";

console.log("App initialized with Vuetify");

export default async function setup(app) {
    console.log("Setting up Vuetify plugin");
    app.use(vuetify);

    if (import.meta.env.SSR) return;

    await initAuth();

    // Check if we're on a SPA route and add router
    const path = window.location.pathname;
    if (path.startsWith("/dash") || path.startsWith("/list")) {
        const { clientRouter } = await import("@/router");
        console.log("Setting up router");
        app.use(clientRouter);
    }
}
