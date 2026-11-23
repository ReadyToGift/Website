import { bucket } from "@/storage";

export const prerender = false;

export const GET = async ({ params }) => {
    if (!params.id) return new Response(null, { status: 404 });

    const file = await bucket.get(params.id);
    if (!file) return new Response(null, { status: 404 });

    return new Response(file.body, {
        headers: {
            "Content-Type":
                file.httpMetadata?.contentType ?? "application/octet-stream",
            "Content-Length": String(file.size),
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "X-Content-Type-Options": "nosniff",
        },
    });
};
