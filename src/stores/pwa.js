import { atom } from "nanostores";
import { persistentBoolean } from "@nanostores/persistent";

export const deferredPrompt = atom(null);
export const appInstalled = atom(null);
export const locallyDismissed = persistentBoolean("pwaLocallyDismissed", false);