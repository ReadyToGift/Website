import { auth, requireAuth } from "@/auth";

export const prerender = false;

export const POST = async (context) => {
    const { unauthorizedResponse, user } = requireAuth(context);
    if (unauthorizedResponse) return unauthorizedResponse;

    try {
        const result = await auth.api.viewBackupCodes({
            body: { userId: user.id },
            headers: context.request.headers,
        });

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ message: "Unable to retrieve recovery codes" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};
