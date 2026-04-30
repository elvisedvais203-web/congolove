"use client";

import { useEffect } from "react";
import {
  PREFERENCES_UPDATED_EVENT,
  applyPreferencesToDocument,
  getStoredPreferences,
  type UserPreferences
} from "../lib/nextalkpreferences";

export function UserPreferencesBoot() {
  useEffect(() => {
    const sync = () => {
      applyPreferencesToDocument(getStoredPreferences());
    };

    const onPreferencesUpdated = (event: Event) => {
      const custom = event as CustomEvent<UserPreferences>;
      if (custom.detail) {
        applyPreferencesToDocument(custom.detail);
        return;
      }
      sync();
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(PREFERENCES_UPDATED_EVENT, onPreferencesUpdated);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PREFERENCES_UPDATED_EVENT, onPreferencesUpdated);
    };
  }, []);

  return null;
}
