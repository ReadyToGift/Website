import { getLimits, getProProduct } from "@/server/billing";
import { ENABLE_BILLING } from "astro:env/client";

export const prerender = true;

export const GET = async () => {
    const freeLimits = getLimits([]);

    if (!ENABLE_BILLING) return new Response(
        JSON.stringify({
            free: freeLimits
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    const proProduct = await getProProduct();

    const benefitNames = proProduct.benefits.map((b) => b.description);

    const proLimits = getLimits(benefitNames);

    return new Response(
        JSON.stringify({
            free: freeLimits,
            pro: proLimits
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
};