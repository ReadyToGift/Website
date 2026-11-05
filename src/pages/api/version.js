export const prerender = true;

export const GET = async () => {
    const buildDate = new Date().toISOString();
    const lastCommit =
        process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;

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
