import { useState, useEffect } from "react";
import { api } from "../api";

const COMMON_PATTERNS: { label: string; patterns: string[] }[] = [
  { label: "node_modules", patterns: ["node_modules/"] },
  { label: ".DS_Store", patterns: [".DS_Store"] },
  { label: "dist / build", patterns: ["dist/", "build/"] },
  { label: ".env files", patterns: [".env", ".env.local", ".env.*.local"] },
  { label: "IDE (VSCode)", patterns: [".vscode/"] },
  { label: "IDE (JetBrains)", patterns: [".idea/"] },
  { label: "Logs", patterns: ["*.log", "logs/"] },
  { label: "Rust target", patterns: ["target/"] },
  { label: "Python cache", patterns: ["__pycache__/", "*.pyc", "*.pyo"] },
];

interface Props {
  repoPath: string;
  repoName: string;
  onClose: () => void;
}

export default function GitignoreEditor({ repoPath, repoName, onClose }: Props) {
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.readGitignore(repoPath)
      .then((c) => { setContent(c); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [repoPath]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.writeGitignore(repoPath, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function addPattern(patterns: string[]) {
    setContent((prev) => {
      const lines = prev ? prev.split("\n") : [];
      const toAdd = patterns.filter((p) => !lines.includes(p));
      if (toAdd.length === 0) return prev;
      const trimmed = prev.trimEnd();
      return trimmed ? trimmed + "\n" + toAdd.join("\n") + "\n" : toAdd.join("\n") + "\n";
    });
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-170 h-145 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">.gitignore</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{repoName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick-add patterns */}
        <div className="px-5 py-3 border-b border-white/8 shrink-0">
          <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_PATTERNS.map(({ label, patterns }) => (
              <button
                key={label}
                onClick={() => addPattern(patterns)}
                className="px-2 py-0.5 text-[11px] bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-md text-zinc-400 hover:text-zinc-200 transition-all"
              >
                + {label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-xs animate-pulse">Loading…</div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full bg-zinc-950/60 border border-white/8 rounded-lg p-3 text-xs font-mono text-zinc-300 resize-none outline-none focus:border-white/20 placeholder:text-zinc-700"
              placeholder="# Add patterns to ignore, one per line&#10;node_modules/&#10;.DS_Store&#10;*.log"
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/8 shrink-0 flex items-center justify-between">
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            <p className="text-xs text-zinc-600">
              {content.split("\n").filter((l) => l.trim() && !l.startsWith("#")).length} active rules
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
