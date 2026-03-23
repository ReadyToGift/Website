import { createAdminClient } from "@/server/appwrite";

export const prerender = true;

export const getCurrencies = async () => {
    try {
        const { locale } = createAdminClient();
        const currencies = await locale.listCurrencies();
        return currencies.currencies;
    } catch (error) {
        console.error("Failed to fetch currencies from Appwrite:", error);

        return [];
    }
};

export async function GET() {
    return new Response(
        JSON.stringify({
            currencies: await getCurrencies()
        }),
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}
