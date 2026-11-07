import { persistentBoolean } from "@nanostores/persistent";
import { atom } from "nanostores";

export const deferredPrompt = atom(null);
export const appInstalled = atom(null);
export const locallyDismissed = persistentBoolean("pwaLocallyDismissed", false);
