import { Resvg } from "@cf-wasm/resvg";
import { Avatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/moods.json" with { type: "json" };

const style = new Style(definition);

export const getAvatarSvg = ({ name }) => {
    const avatar = new Avatar(style, {
        seed: name,
    });
    return avatar.toString();
};

export const renderAvatarPng = async (svg) => {
    const renderer = await Resvg.async(svg, {
        fitTo: { mode: "width", value: 256 },
    });
    try {
        const image = renderer.render();
        try {
            return image.asPng();
        } finally {
            image.free();
        }
    } finally {
        renderer.free();
    }
};
