import { useState, useEffect, useRef } from "react";
import { GroveSettings, saveSettings } from "../lib/settings";
import { AI_PROVIDERS, AI_MODELS } from "../lib/ai";
import { api } from "../api";

interface Props {
  settings: GroveSettings;
  onSave: (s: GroveSettings) => void;
  onClose: () => void;
}

interface AppEntry {
  id: string;
  name: string;
  kind: string;
  installed: boolean;
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<GroveSettings>(settings);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [showKey, setShowKey] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.detectApps().then(setApps).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function handleSave() {
    saveSettings(draft);
    onSave(draft);
    onClose();
  }

  const editors = apps.filter((a) => a.kind === "editor" && a.installed);
  const terminals = apps.filter((a) => a.kind === "terminal" && a.installed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={ref}
        className="w-110 bg-zinc-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Refresh interval */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Auto-refresh interval
            </label>
            <div className="flex gap-2">
              {[0, 5, 10, 30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => setDraft((d) => ({ ...d, refreshInterval: s }))}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors
                    ${draft.refreshInterval === s
                      ? "bg-white/15 border-white/20 text-white"
                      : "bg-white/5 border-white/8 text-zinc-400 hover:bg-white/8"
                    }`}
                >
                  {s === 0 ? "Off" : `${s}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Scan depth */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Scan depth — how deep Grove looks for repos inside a folder
              <span className="ml-2 text-zinc-600 font-normal">(current: {draft.scanDepth})</span>
            </label>
            <input
              type="range"
              min={2}
              max={6}
              value={draft.scanDepth}
              onChange={(e) => setDraft((d) => ({ ...d, scanDepth: Number(e.target.value) }))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
              <span>2 (shallow)</span>
              <span>6 (deep)</span>
            </div>
          </div>

          {/* Default editor */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Default editor <span className="text-zinc-600 font-normal">(used for notifications shortcut)</span>
            </label>
            <select
              value={draft.defaultEditor}
              onChange={(e) => setDraft((d) => ({ ...d, defaultEditor: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/20"
            >
              <option value="">None</option>
              {editors.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Default terminal */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Default terminal
            </label>
            <select
              value={draft.defaultTerminal}
              onChange={(e) => setDraft((d) => ({ ...d, defaultTerminal: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/20"
            >
              <option value="">None</option>
              {terminals.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* AI Integration */}
          <div className="pt-1 border-t border-white/8">
            <p className="text-xs font-semibold text-zinc-300 mb-3">AI Integration</p>

            {/* Provider */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-400 mb-2">Provider</label>
              <div className="flex gap-2">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDraft((d) => ({ ...d, aiProvider: p.id, aiModel: AI_MODELS[p.id]?.[0]?.id ?? "" }))}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors
                      ${draft.aiProvider === p.id
                        ? "bg-white/15 border-white/20 text-white"
                        : "bg-white/5 border-white/8 text-zinc-400 hover:bg-white/8"
                      }`}
                  >
                    {p.id === "anthropic" ? "Anthropic" : p.id === "openai" ? "OpenAI" : "Gemini"}
                  </button>
                ))}
                {draft.aiProvider && (
                  <button
                    onClick={() => setDraft((d) => ({ ...d, aiProvider: "", aiModel: "", aiKey: "" }))}
                    className="px-2 text-xs text-zinc-600 hover:text-zinc-400 border border-white/8 rounded-lg bg-white/5 transition-colors"
                    title="Clear AI provider"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {draft.aiProvider && (
              <>
                {/* Model */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Model</label>
                  <select
                    value={(AI_MODELS[draft.aiProvider] ?? []).some((m) => m.id === draft.aiModel) ? draft.aiModel : "__custom__"}
                    onChange={(e) => {
                      if (e.target.value !== "__custom__") {
                        setDraft((d) => ({ ...d, aiModel: e.target.value }));
                      } else {
                        setDraft((d) => ({ ...d, aiModel: "" }));
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/20"
                  >
                    {(AI_MODELS[draft.aiProvider] ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    <option value="__custom__">Custom model ID…</option>
                  </select>
                  {!(AI_MODELS[draft.aiProvider] ?? []).some((m) => m.id === draft.aiModel) && (
                    <input
                      type="text"
                      value={draft.aiModel}
                      onChange={(e) => setDraft((d) => ({ ...d, aiModel: e.target.value }))}
                      placeholder="Enter model ID (e.g. gemini-2.5-pro-exp)"
                      className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 font-mono"
                      autoFocus
                    />
                  )}
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={draft.aiKey}
                      onChange={(e) => setDraft((d) => ({ ...d, aiKey: e.target.value }))}
                      placeholder={
                        draft.aiProvider === "anthropic" ? "sk-ant-…" :
                        draft.aiProvider === "openai" ? "sk-…" : "AI…"
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 pr-9 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-700 mt-1">Stored locally in app settings — never sent anywhere except the selected provider.</p>
                </div>
              </>
            )}
          </div>

          {/* Notifications toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400">macOS Notifications</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">Alert on push, pull, fetch, and clone</p>
            </div>
            <button
              onClick={() => setDraft((d) => ({ ...d, notifications: !d.notifications }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${draft.notifications ? "bg-blue-500" : "bg-zinc-600"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${draft.notifications ? "left-5.5" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/8 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
