import { execSync } from "child_process";

export const prerender = true;
const buildDate = new Date().toISOString();

export const GET = async () => {
    let lastCommit = "unknown";
    
    try {
        lastCommit = execSync("git rev-parse HEAD", { 
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
        }).trim();
    } catch {
        // Git not available or not a git repository
        // Use environment variable as fallback (Vercel provides VERCEL_GIT_COMMIT_SHA)
        lastCommit = process.env.VERCEL_GIT_COMMIT_SHA || 
                    process.env.GITHUB_SHA || 
                    "unknown";
    }

    return new Response(JSON.stringify({
        commit: lastCommit, 
        buildDate
    }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
};