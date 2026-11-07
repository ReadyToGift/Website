import { mdiEmoticon, mdiEmoticonConfused, mdiHeart } from "@mdi/js";

export const priorityMap = {
    none: {
        text: "None",
        icon: false,
    },
    low: {
        text: "Unsure",
        icon: mdiEmoticonConfused,
    },
    medium: {
        text: "Nice to have",
        icon: mdiEmoticon,
    },
    high: {
        text: "Would love it",
        icon: mdiHeart,
    },
};

export const convertPriority = (priority) => {
    return priorityMap[priority];
};
