import { createLocalStore } from "@/lib/local-store";

export const SETTINGS_KEY = "tane:settings:v1";

export interface Settings {
  readonly se: boolean;
  readonly bgm: boolean;
}

export const DEFAULT_SETTINGS: Settings = { se: true, bgm: true };

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return DEFAULT_SETTINGS;
    const record = data as Record<string, unknown>;
    return {
      se: typeof record.se === "boolean" ? record.se : DEFAULT_SETTINGS.se,
      bgm: typeof record.bgm === "boolean" ? record.bgm : DEFAULT_SETTINGS.bgm,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const store = createLocalStore(SETTINGS_KEY, parseSettings, DEFAULT_SETTINGS);

export const readSettings = store.read;
export const useSettings = store.useValue;

export function updateSettings(patch: Partial<Settings>): void {
  store.write({ ...store.read(), ...patch });
}
