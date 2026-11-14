/// <reference types="astro/client" />

type ENV = {
    CACHE: KVNamespace;
};

// use a default runtime configuration (advanced mode).
type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;
declare namespace App {
    interface Locals extends Runtime {
        user: import("better-auth").User | null;
        session: import("better-auth").Session | null;
    }
}
