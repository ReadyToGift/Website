import { BUILD_COMMIT } from "astro:env/client";

export const prerender = true;

export const GET = async () => {
    const buildDate = new Date().toISOString();

    return new Response(
        JSON.stringify({
            commit: BUILD_COMMIT,
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
