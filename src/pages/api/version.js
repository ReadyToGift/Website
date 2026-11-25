import { BUILD_COMMIT, BUILD_DATE } from "astro:env/client";

export const prerender = false;

export const GET = async () => {
    return new Response(
        JSON.stringify({
            commit: BUILD_COMMIT,
            buildDate: BUILD_DATE,
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
