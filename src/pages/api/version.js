import { execSync } from "child_process";

export const prerender = true;
export const GET = async () => {
    const lastCommit = execSync("git rev-parse HEAD").toString().trim();

    return new Response(JSON.stringify({
        commit: lastCommit
    }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
};