import { APPWRITE_PROJECT } from "astro:env/client";

export async function authenticatedFetch(url, options = {}) {
    // Get session from localStorage
    const sessionKey = `appwrite_session_${APPWRITE_PROJECT}`;
    const sessionSecret = localStorage.getItem(sessionKey);

    if (!sessionSecret) {
        return fetch(url, options);
    }

    // Merge headers, adding Authorization
    const headers = {
        ...options.headers,
        "Authorization": `Bearer ${sessionSecret}`
    };

    return fetch(url, {
        ...options,
        headers
    });
}
export async function authenticatedJsonFetch(url, data, method = "POST") {
    const response = await authenticatedFetch(url, {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
}