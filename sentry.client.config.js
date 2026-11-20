import { SENTRY_DSN } from "astro:env/client";
import * as Sentry from "@sentry/astro";

Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !import.meta.env.DEV,
    sendDefaultPii: true,
    replaysSessionSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
});
