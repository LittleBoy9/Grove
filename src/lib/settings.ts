export type AIProvider = "anthropic" | "openai" | "gemini" | "";

export interface GroveSettings {
  refreshInterval: number;   // seconds: 0 | 5 | 10 | 30 | 60
  scanDepth: number;         // 2–6
  defaultEditor: string;     // editor id or ""
  defaultTerminal: string;   // terminal id or ""
  notifications: boolean;
  aiProvider: AIProvider;
  aiModel: string;
  aiKey: string;
}

const DEFAULTS: GroveSettings = {
  refreshInterval: 10,
  scanDepth: 4,
  defaultEditor: "",
  defaultTerminal: "",
  notifications: true,
  aiProvider: "",
  aiModel: "",
  aiKey: "",
};

const KEY = "grove_settings";

export function loadSettings(): GroveSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: GroveSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
