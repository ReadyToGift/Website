import * as Sentry from "@sentry/astro";
import { loadConfig } from "@/stores/config";

void loadConfig().then(({ sentryDsn }) => {
    Sentry.init({
        dsn: sentryDsn ?? undefined,
        enabled: !import.meta.env.DEV,
        sendDefaultPii: true,
        replaysSessionSampleRate: 1.0,
        integrations: [Sentry.replayIntegration()],
    });
});
