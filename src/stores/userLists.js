import { map } from "nanostores";

export const userLists = map({
    listCount: {
        public: 0,
        private: 0
    }
});

export const setCount = ({ public: publicCount, private: privateCount }) => {
    const current = userLists.get();
    userLists.set({
        ...current,
        listCount: {
            public: publicCount,
            private: privateCount
        }
    });
};

export const adjustCount = (isPrivate, delta) => {
    const current = userLists.get();
    const { listCount } = current;
    const updatedListCount = {
        ...listCount,
        [isPrivate ? "private" : "public"]:
            (isPrivate ? listCount.private : listCount.public) + delta
    };

    userLists.set({
        ...current,
        listCount: updatedListCount
    });
};

export default {
    userLists,
    setCount,
    adjustCount
};
