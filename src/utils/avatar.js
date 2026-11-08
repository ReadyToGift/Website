import { toPng } from "@dicebear/converter";
import { Avatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/initials.json" with { type: "json" };

const style = new Style(definition);

export const createAvatar = async ({ name }) => {
    const avatar = new Avatar(style, {
        seed: name,
    });

    const png = toPng(avatar);
    return await png.toDataUri();
};
