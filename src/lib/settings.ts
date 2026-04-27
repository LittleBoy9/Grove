export type AIProvider = "anthropic" | "openai" | "gemini" | "";

export type ColorMode = "dark";

export interface GroveSettings {
  refreshInterval: number;   // seconds: 0 | 5 | 10 | 30 | 60
  scanDepth: number;         // 2–6
  defaultEditor: string;     // editor id or ""
  defaultTerminal: string;   // terminal id or ""
  notifications: boolean;
  aiProvider: AIProvider;
  aiModel: string;
  theme: string;
  colorMode: ColorMode;
}

const DEFAULTS: GroveSettings = {
  refreshInterval: 10,
  scanDepth: 4,
  defaultEditor: "",
  defaultTerminal: "",
  notifications: true,
  aiProvider: "",
  aiModel: "",
  theme: "grove",
  colorMode: "dark",
};

const KEY = "grove_settings";

export function loadSettings(): GroveSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GroveSettings> & { aiKey?: string };
    // Migration: if legacy aiKey exists in localStorage, strip it (it's moving to Keychain)
    if ("aiKey" in parsed) {
      delete parsed.aiKey;
      localStorage.setItem(KEY, JSON.stringify(parsed));
    }
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: GroveSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
