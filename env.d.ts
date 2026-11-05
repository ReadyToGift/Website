/// <reference types="astro/client" />

type ENV = {
    // replace `MY_KV` with your KV namespace
    CACHE: KVNamespace;
};

// use a default runtime configuration (advanced mode).
type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;
declare namespace App {
    interface Locals extends Runtime {}
}