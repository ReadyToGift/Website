export const handleFetch = async (...args) => {
    try {
        const response = await fetch(...args);

        if (!response.ok) {
            let error;
            if (response.headers.get("Content-Type")?.includes("application/json")) {
                try {
                    error = await response.json();
                } catch {
                    error = { message: response.status + " " + response.statusText || "An unknown error occurred." };
                }
            } else {
                let textError = await response.text();
                if (textError.startsWith("<!DOCTYPE html>")) {
                    textError = response.status + " " + response.statusText;
                }
                error = { message: textError || "An unknown error occurred." };
            }                

            return [null, error];
        }

        return [await response.json(), null];
    } catch (error) {
        console.error("Fetch error:", error);
        return [null, { message: error.message || "An unknown error occurred." }];
    }
};