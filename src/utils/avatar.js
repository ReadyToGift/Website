import { toPng } from "@dicebear/converter";
import { Avatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/initials.json" with { type: "json" };

const style = new Style(definition);

export const getAvatar = ({ name, type = "png" }) => {
    const avatar = new Avatar(style, {
        seed: name,
    });

    switch (type) {
        case "svg":
            return avatar.toDataUri();
        default:
            return toPng(avatar).toDataUri();
    }
};
