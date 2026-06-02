import { mdiEmoticon, mdiEmoticonConfused, mdiHeart } from "@mdi/js";

export const priorityMap = {
    none: {
        text: "None",
        icon: false
    },
    low: {
        text: "Unsure",
        variant: "warning",
        icon: mdiEmoticonConfused,
        iconId: "mdi:emoticon-confused"
    },
    medium: {
        text: "Nice to have",
        variant: "default",
        icon: mdiEmoticon,
        iconId: "mdi:emoticon"
    },
    high: {
        text: "Would love it",
        variant: "info",
        icon: mdiHeart,
        iconId: "mdi:heart"
    }
};

export const convertPriority = (priority) => {
    return priorityMap[priority];
};
