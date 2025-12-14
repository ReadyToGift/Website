import { map } from "nanostores";
import { v7 as uuidv7 } from "uuid";

export const dialogs = map({});

export const create = (dialog) => {
    let resolvePromise;
    let promise;

    if (dialog.async) {
        promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
    }

    const id = uuidv7();
    dialogs.setKey(id, { open: true, resolvePromise, id, ...dialog });

    return dialog.async ? promise : null;
};

export const close = (id, actionText, data = null) => {
    const dialog = dialogs.get()[id];
    if (!dialog) return;
    
    if (dialog.async) {
        dialog.resolvePromise({ action: actionText, data });
    }

    // Update the dialog's open state immutably
    dialogs.setKey(id, { ...dialog, open: false });

    setTimeout(() => {
        dialogs.setKey(id, undefined);
    }, 500);
};