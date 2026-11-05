export const prerender = true;

export const GET = async () => {
    const buildDate = new Date().toISOString();
    const lastCommit = __BUILD_COMMIT__;

    return new Response(
        JSON.stringify({
            commit: lastCommit,
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
