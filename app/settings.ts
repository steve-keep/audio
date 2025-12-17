
// app/settings.ts

export type ScanMode = 'manual' | 'on-launch' | 'periodic';
export type ScanInterval = 1 | 6 | 24; // in hours

export interface AppSettings {
  scanMode: ScanMode;
  scanIntervalHours: ScanInterval;
}

const SETTINGS_KEY = 'my-music-library-settings';

// Default settings for first-time users
const defaultSettings: AppSettings = {
  scanMode: 'on-launch',
  scanIntervalHours: 6,
};

/**
 * Loads the user's settings from localStorage.
 * If no settings are found, it returns the default settings.
 * @returns {AppSettings} The loaded or default application settings.
 */
export function loadSettings(): AppSettings {
  try {
    const settingsJson = localStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      // Basic validation to ensure the loaded settings have the expected keys
      const loaded = JSON.parse(settingsJson);
      if (loaded.scanMode && loaded.scanIntervalHours) {
        return loaded;
      }
    }
  } catch (error) {
    console.error("Failed to load settings from localStorage:", error);
  }
  // Return defaults if loading fails or settings are not present
  return defaultSettings;
}

/**
 * Saves the provided settings object to localStorage.
 * @param {AppSettings} settings The settings to save.
 */
export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings to localStorage:", error);
  }
}
