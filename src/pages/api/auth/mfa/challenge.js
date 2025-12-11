export const prerender = false;

export async function POST(req, { locals }) {
    const { request } = req;
    console.log(locals);

    const body = await request.json();
    console.log({ body });

    console.log({ locals });

    return new Response(200);
}