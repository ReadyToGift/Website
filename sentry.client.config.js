import * as Sentry from "@sentry/astro";
import { loadConfig } from "@/stores/config";

void loadConfig().then(({ sentryDsn }) => {
    Sentry.init({
        dsn: sentryDsn ?? undefined,
        enabled: !import.meta.env.DEV,
        sendDefaultPii: false,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        maxBreadcrumbs: 0,
        beforeSend(event) {
            delete event.request;
            return event;
        },
    });
});
