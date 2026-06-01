import { mdiEmoticon, mdiEmoticonConfused, mdiHeart } from "@mdi/js";

export const priorityMap = {
    none: {
        text: "None",
        icon: false
    },
    low: {
        text: "Unsure",
        badgeClassName: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        icon: mdiEmoticonConfused,
        iconId: "mdi:emoticon-confused"
    },
    medium: {
        text: "Nice to have",
        badgeClassName: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
        icon: mdiEmoticon,
        iconId: "mdi:emoticon"
    },
    high: {
        text: "Would love it",
        badgeClassName: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
        icon: mdiHeart,
        iconId: "mdi:heart"
    }
};

export const convertPriority = (priority) => {
    return priorityMap[priority];
};
