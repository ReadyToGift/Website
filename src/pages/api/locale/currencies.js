import { createAdminClient } from "@/server/appwrite";

// These shouldn't change often, so we can prerender this endpoint
export const prerender = true;

export const getCurrencies = async () => {
    const { locale } = createAdminClient();
    const currencies = await locale.listCurrencies();
    return currencies.currencies;
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