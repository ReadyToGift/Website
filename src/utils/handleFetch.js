import { create as createDialog } from "@/stores/dialogs";

export const handleFetch = async (...args) => {
    try {
        const response = await fetch(...args);

        if (!response.ok) {
            if (response.status === 502) {
                // Show global Appwrite/backend-down dialog
                try {
                    createDialog({
                        title: "Service Unavailable",
                        text: "The backend service is currently unavailable. Please try again later.",
                        actions: [
                            { text: "Retry", action: () => window.location.reload(), color: "primary", closeAfterAction: true },
                            { text: "Close", action: "close" }
                        ]
                    });
                } catch (e) {
                    // ignore dialog errors
                }

                return [null, { message: "Backend unavailable. Please try again later.", status: 502 }];
            }
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

            error.status = response.status;

            return [null, error];
        }

        return [await response.json(), null];
    } catch (error) {
        console.error("Fetch error:", error);
        return [null, { message: error.message || "An unknown error occurred." }];
    }
};