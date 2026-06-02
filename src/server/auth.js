export const JWT_COOKIE = "appwrite";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const extractJwt = ({ request }) => {
    let jwt;
    if (request) {
        // Try to get jwt from Authorization header first (for API routes)
        const authHeader = request.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7); // Remove "Bearer " prefix
        } else {
            // Fallback to cookie (for SSR pages)
            const cookies = parseCookies(request.headers.get("cookie") ?? "");
            jwt = cookies.get(JWT_COOKIE);
        }
    }

    return jwt;
};

const parseCookies = (cookies) => {
    const map = new Map();
    for (const cookie of cookies.split(";")) {
        const [name, value] = cookie.split("=");
        map.set(name.trim(), value ?? null);
    }
    return map;
};
