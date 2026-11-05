import { CF_PAGES_COMMIT_SHA } from "astro:env/server";

export const prerender = true;

export const GET = async () => {
    const buildDate = new Date().toISOString();

    return new Response(
        JSON.stringify({
            commit: CF_PAGES_COMMIT_SHA,
            buildDate,
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        },
    );
};
