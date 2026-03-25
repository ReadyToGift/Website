import { getLimits, getProProduct } from "@/server/billing";

export const prerender = true;

export const GET = async () => {
    const freeLimits = getLimits([]);

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