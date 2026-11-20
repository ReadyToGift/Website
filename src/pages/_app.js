import vuetify from "@/plugins/vuetify";
import { loadConfig } from "@/stores/config";

console.log("App initialized with Vuetify");

export default async function setup(app) {
    console.log("Setting up Vuetify plugin");
    app.use(vuetify);

    if (import.meta.env.SSR) return;

    const { umamiUrl, umamiId, umamiDomains } = await loadConfig();
    if (umamiUrl && umamiId && !document.getElementById("umami-analytics")) {
        const script = document.createElement("script");
        script.id = "umami-analytics";
        script.async = true;
        script.src = umamiUrl;
        script.dataset.websiteId = umamiId;
        if (umamiDomains) script.dataset.domains = umamiDomains;
        document.head.appendChild(script);
    }

    // Check if we're on a SPA route and add router
    const path = window.location.pathname;
    if (path.startsWith("/dash") || path.startsWith("/list")) {
        const { clientRouter } = await import("@/router");
        console.log("Setting up router");
        app.use(clientRouter);
    }
}
