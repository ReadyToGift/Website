import * as Sentry from "@sentry/astro";
import { SENTRY_DSN } from "astro:env/client";

Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: true,
    sampleRate: 1.0,
    tracesSampleRate: 1.0,
    integrations: [
        Sentry.replayIntegration({
            maskAllText: false, // Only sensitive is password, which is masked by default
            blockAllMedia: false
        })
    ]
});