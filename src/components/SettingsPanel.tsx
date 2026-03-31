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

const THEMES = [
  { id: "grove",      name: "Grove",      bg: "#18181b", surface: "#27272a", accent: "#4ade80" },
  { id: "midnight",   name: "Midnight",   bg: "#0a0a0a", surface: "#141414", accent: "#3b82f6" },
  { id: "nord",       name: "Nord",       bg: "#2e3440", surface: "#3b4252", accent: "#88c0d0" },
  { id: "catppuccin", name: "Catppuccin", bg: "#1e1e2e", surface: "#313244", accent: "#cba6f7" },
];

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-zinc-500">{icon}</span>
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-200">{label}</p>
        {description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors ${value ? "bg-blue-500" : "bg-zinc-700"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-4.5" : "left-0.5"}`} />
    </button>
  );
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
        className="w-115 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Settings</h2>
            <p className="text-[11px] text-zinc-600 mt-0.5">Customize Grove to your workflow</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/8 shrink-0" />

        {/* Body */}
        <div className="px-5 py-4 space-y-6 overflow-y-auto flex-1">

          {/* ── Appearance ── */}
          <div>
            <SectionLabel
              label="Appearance"
              icon={
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
                </svg>
              }
            />
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDraft((d) => ({ ...d, theme: t.id }))}
                  className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all
                    ${draft.theme === t.id
                      ? "border-white/25 shadow-lg"
                      : "border-white/6 hover:border-white/12"
                    }`}
                  style={{ backgroundColor: t.surface }}
                >
                  <div className="w-full h-10 rounded-lg overflow-hidden" style={{ backgroundColor: t.bg }}>
                    <div className="flex h-full">
                      {/* Sidebar strip */}
                      <div className="w-5 h-full shrink-0 flex flex-col gap-1 p-1" style={{ backgroundColor: t.surface }}>
                        {[1,2,3].map(i => (
                          <div key={i} className="w-full h-1.5 rounded-sm" style={{ backgroundColor: t.accent, opacity: i === 1 ? 0.9 : 0.3 }} />
                        ))}
                      </div>
                      {/* Main area */}
                      <div className="flex-1 p-1.5 flex flex-col gap-1">
                        <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: t.accent, opacity: 0.7 }} />
                        <div className="h-1 rounded-full w-1/2" style={{ backgroundColor: t.accent, opacity: 0.3 }} />
                        <div className="h-1 rounded-full w-2/3" style={{ backgroundColor: t.accent, opacity: 0.2 }} />
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: draft.theme === t.id ? "#e4e4e7" : "#71717a" }}>
                    {t.name}
                  </span>
                  {draft.theme === t.id && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white/70 shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── General ── */}
          <div>
            <SectionLabel
              label="General"
              icon={
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              }
            />
            <div className="space-y-2">
              {/* Auto-refresh */}
              <div className="px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-zinc-200">Auto-refresh</p>
                  <span className="text-[11px] text-zinc-500">
                    {draft.refreshInterval === 0 ? "Disabled" : `Every ${draft.refreshInterval}s`}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[0, 5, 10, 30, 60].map((s) => (
                    <button
                      key={s}
                      onClick={() => setDraft((d) => ({ ...d, refreshInterval: s }))}
                      className={`flex-1 py-1 text-[11px] rounded-md border transition-colors
                        ${draft.refreshInterval === s
                          ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                          : "bg-white/4 border-white/6 text-zinc-500 hover:bg-white/8 hover:text-zinc-300"
                        }`}
                    >
                      {s === 0 ? "Off" : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan depth */}
              <div className="px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-zinc-200">Scan depth</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/8 text-zinc-300 tabular-nums">{draft.scanDepth}</span>
                </div>
                <input
                  type="range" min={2} max={6}
                  value={draft.scanDepth}
                  onChange={(e) => setDraft((d) => ({ ...d, scanDepth: Number(e.target.value) }))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-700 mt-0.5">
                  <span>Shallow</span><span>Deep</span>
                </div>
              </div>

              {/* Notifications */}
              <SettingRow label="macOS Notifications" description="Alert on push, pull, fetch, and clone">
                <Toggle value={draft.notifications} onChange={(v) => setDraft((d) => ({ ...d, notifications: v }))} />
              </SettingRow>
            </div>
          </div>

          {/* ── Tools ── */}
          <div>
            <SectionLabel
              label="Tools"
              icon={
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] text-zinc-500 mb-1.5 pl-0.5">Editor</p>
                <select
                  value={draft.defaultEditor}
                  onChange={(e) => setDraft((d) => ({ ...d, defaultEditor: e.target.value }))}
                  className="w-full bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/15 transition-colors"
                >
                  <option value="">None</option>
                  {editors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 mb-1.5 pl-0.5">Terminal</p>
                <select
                  value={draft.defaultTerminal}
                  onChange={(e) => setDraft((d) => ({ ...d, defaultTerminal: e.target.value }))}
                  className="w-full bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/15 transition-colors"
                >
                  <option value="">None</option>
                  {terminals.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── AI ── */}
          <div>
            <SectionLabel
              label="AI Integration"
              icon={
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              }
            />

            {/* Provider */}
            <div className="flex gap-1.5 mb-3">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDraft((d) => ({ ...d, aiProvider: p.id, aiModel: AI_MODELS[p.id]?.[0]?.id ?? "" }))}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors
                    ${draft.aiProvider === p.id
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : "bg-white/3 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/8"
                    }`}
                >
                  {p.id === "anthropic" ? "Anthropic" : p.id === "openai" ? "OpenAI" : "Gemini"}
                </button>
              ))}
              {draft.aiProvider && (
                <button
                  onClick={() => setDraft((d) => ({ ...d, aiProvider: "", aiModel: "", aiKey: "" }))}
                  className="px-2.5 text-zinc-600 hover:text-zinc-400 border border-white/5 rounded-lg bg-white/3 transition-colors"
                  title="Clear"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {draft.aiProvider && (
              <div className="space-y-2">
                {/* Model */}
                <div>
                  <p className="text-[11px] text-zinc-500 mb-1.5 pl-0.5">Model</p>
                  <select
                    value={(AI_MODELS[draft.aiProvider] ?? []).some((m) => m.id === draft.aiModel) ? draft.aiModel : "__custom__"}
                    onChange={(e) => {
                      if (e.target.value !== "__custom__") setDraft((d) => ({ ...d, aiModel: e.target.value }));
                      else setDraft((d) => ({ ...d, aiModel: "" }));
                    }}
                    className="w-full bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/15 transition-colors"
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
                      placeholder="e.g. gemini-2.5-pro-exp"
                      className="mt-1.5 w-full bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/15 font-mono"
                      autoFocus
                    />
                  )}
                </div>

                {/* API Key */}
                <div>
                  <p className="text-[11px] text-zinc-500 mb-1.5 pl-0.5">API Key</p>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={draft.aiKey}
                      onChange={(e) => setDraft((d) => ({ ...d, aiKey: e.target.value }))}
                      placeholder={draft.aiProvider === "anthropic" ? "sk-ant-…" : draft.aiProvider === "openai" ? "sk-…" : "AI…"}
                      className="w-full bg-white/3 border border-white/5 rounded-lg px-3 py-2 pr-9 text-xs text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-white/15 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
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
                  <p className="text-[10px] text-zinc-700 mt-1.5 pl-0.5">Stored locally — never sent outside the selected provider.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-px bg-white/8 shrink-0" />
        <div className="flex gap-2 px-5 py-4 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-white/3 hover:bg-white/8 border border-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
