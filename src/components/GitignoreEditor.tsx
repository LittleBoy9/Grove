import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";

const QUICK_ADD: { category: string; items: { label: string; patterns: string[] }[] }[] = [
  {
    category: "Languages",
    items: [
      { label: "Node", patterns: ["node_modules/", "npm-debug.log*", "yarn-error.log"] },
      { label: "Python", patterns: ["__pycache__/", "*.pyc", "*.pyo", ".venv/", "*.egg-info/"] },
      { label: "Rust", patterns: ["target/"] },
      { label: "Go", patterns: ["vendor/", "*.test"] },
      { label: "Java", patterns: ["*.class", "*.jar", "*.war", "target/"] },
      { label: "Swift", patterns: [".build/", "*.xcuserstate", "DerivedData/"] },
    ],
  },
  {
    category: "Build",
    items: [
      { label: "dist/", patterns: ["dist/"] },
      { label: "build/", patterns: ["build/"] },
      { label: "out/", patterns: ["out/"] },
      { label: ".next/", patterns: [".next/"] },
      { label: ".nuxt/", patterns: [".nuxt/"] },
      { label: "coverage/", patterns: ["coverage/"] },
    ],
  },
  {
    category: "Env & Secrets",
    items: [
      { label: ".env", patterns: [".env", ".env.local", ".env.*.local"] },
      { label: "secrets", patterns: ["*.pem", "*.key", "*.p12", "*.pfx"] },
    ],
  },
  {
    category: "OS",
    items: [
      { label: ".DS_Store", patterns: [".DS_Store", ".AppleDouble", ".LSOverride"] },
      { label: "Thumbs.db", patterns: ["Thumbs.db", "ehthumbs.db"] },
    ],
  },
  {
    category: "IDE",
    items: [
      { label: "VS Code", patterns: [".vscode/"] },
      { label: "JetBrains", patterns: [".idea/"] },
      { label: "Xcode", patterns: ["*.xcworkspace/", "xcuserdata/"] },
    ],
  },
  {
    category: "Misc",
    items: [
      { label: "Logs", patterns: ["*.log", "logs/"] },
      { label: "Temp", patterns: ["*.tmp", "*.temp", ".cache/"] },
      { label: "Lock files", patterns: ["package-lock.json", "yarn.lock"] },
    ],
  },
];

function colorLine(line: string): React.ReactNode {
  if (line === "") return <br />;
  if (line.trimStart().startsWith("#")) {
    return <span className="text-zinc-600 italic">{line}</span>;
  }
  if (line.startsWith("!")) {
    return <span className="text-orange-400">{line}</span>;
  }
  // tokenize for glob highlights
  const parts: React.ReactNode[] = [];
  let i = 0;
  const raw = line;
  // highlight leading negation already handled above
  // color ** and * differently, / at end = directory
  const endsWithSlash = raw.endsWith("/");
  const tokens = raw.match(/(\*\*|\*|\?|\[.*?\]|[^*?[\]]+)/g) ?? [raw];
  tokens.forEach((tok, idx) => {
    if (tok === "**") {
      parts.push(<span key={idx} className="text-yellow-400">{tok}</span>);
    } else if (tok === "*" || tok === "?") {
      parts.push(<span key={idx} className="text-yellow-300">{tok}</span>);
    } else if (tok.startsWith("[")) {
      parts.push(<span key={idx} className="text-yellow-200">{tok}</span>);
    } else if (endsWithSlash && idx === tokens.length - 1) {
      // last token contains the trailing slash
      const withoutSlash = tok.slice(0, -1);
      parts.push(<span key={idx} className="text-blue-300">{withoutSlash}<span className="text-blue-500">/</span></span>);
    } else {
      parts.push(<span key={idx} className="text-zinc-200">{tok}</span>);
    }
    i += tok.length;
  });
  return <>{parts}</>;
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.readGitignore(repoPath)
      .then((c) => { setContent(c); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [repoPath]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        toggleComment();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

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

  function toggleComment() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selStart = textarea.selectionStart;
    const selEnd = textarea.selectionEnd;
    const lines = content.split("\n");

    // Determine affected line range
    const startLine = content.substring(0, selStart).split("\n").length - 1;
    const endLine = content.substring(0, selEnd).split("\n").length - 1;

    const affected = lines.slice(startLine, endLine + 1).filter((l) => l.trim());
    const allCommented = affected.length > 0 && affected.every((l) => l.trimStart().startsWith("#"));

    const newLines = lines.map((line, i) => {
      if (i < startLine || i > endLine || !line.trim()) return line;
      if (allCommented) {
        return line.replace(/^(\s*)#\s?/, "$1");
      } else {
        return line.startsWith("#") ? line : "# " + line;
      }
    });

    const newContent = newLines.join("\n");
    setContent(newContent);

    // Restore cursor roughly to same position
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const delta = allCommented ? -2 : 2;
      const newPos = Math.max(0, selStart + delta);
      textareaRef.current.selectionStart = newPos;
      textareaRef.current.selectionEnd = Math.max(newPos, selEnd + delta * (endLine - startLine + 1));
      textareaRef.current.focus();
    });
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

  const lines = content.split("\n");
  const activeRules = lines.filter((l) => l.trim() && !l.trim().startsWith("#")).length;
  const commentLines = lines.filter((l) => l.trim().startsWith("#")).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-180 h-145 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center">
              <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">.gitignore</h2>
              <p className="text-[11px] text-zinc-600 mt-0.5">{repoName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/15 text-blue-400">
                {activeRules} rule{activeRules !== 1 ? "s" : ""}
              </span>
              {commentLines > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-white/4 border border-white/8 text-zinc-600">
                  {commentLines} comment{commentLines !== 1 ? "s" : ""}
                </span>
              )}
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
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: editor */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 border-r border-white/8">
            {/* Editor area */}
            <div className="flex-1 min-h-0 flex overflow-hidden" ref={scrollRef}>
              {/* Line numbers */}
              <div className="shrink-0 select-none pt-3 pb-3 text-right border-r border-white/5 bg-black/20">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    className="text-zinc-700 font-mono text-[11px] leading-5 px-3"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Syntax highlight + textarea mirror */}
              <div className="flex-1 relative overflow-hidden">
                {/* Highlight layer */}
                <pre
                  ref={highlightRef}
                  aria-hidden="true"
                  className="absolute inset-0 font-mono text-[11px] leading-5 px-3 pt-3 pb-3 pointer-events-none overflow-hidden whitespace-pre-wrap wrap-break-word"
                >
                  {lines.map((line, i) => (
                    <div key={i}>{colorLine(line)}{i < lines.length - 1 ? "" : ""}</div>
                  ))}
                </pre>
                {/* Actual textarea */}
                {loading ? (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-xs animate-pulse">Loading…</div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onScroll={syncScroll}
                    className="absolute inset-0 w-full h-full font-mono text-[11px] leading-5 px-3 pt-3 pb-3 bg-transparent text-transparent caret-white resize-none outline-none"
                    placeholder=""
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right: quick-add panel */}
          <div className="w-48 shrink-0 flex flex-col min-h-0 overflow-y-auto bg-black/10">
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Quick Add</p>
            </div>
            {QUICK_ADD.map(({ category, items }) => (
              <div key={category} className="px-3 py-2">
                <p className="text-[10px] text-zinc-600 font-medium mb-1.5">{category}</p>
                <div className="flex flex-col gap-1">
                  {items.map(({ label, patterns }) => {
                    const alreadyAdded = patterns.every((p) => content.split("\n").includes(p));
                    return (
                      <button
                        key={label}
                        onClick={() => addPattern(patterns)}
                        disabled={alreadyAdded}
                        className={`w-full text-left px-2 py-1 text-[11px] rounded-md border transition-all
                          ${alreadyAdded
                            ? "border-white/4 text-zinc-700 cursor-default bg-transparent"
                            : "border-white/6 text-zinc-400 hover:text-zinc-200 hover:bg-white/6 hover:border-white/12 bg-white/3"
                          }`}
                      >
                        {alreadyAdded ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-2.5 h-2.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            {label}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span className="text-zinc-600">+</span>
                            {label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/8 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-700">
                <span className="text-blue-400">●</span> comment
                <span className="ml-2 text-orange-400">●</span> negation
                <span className="ml-2 text-blue-300">●</span> dir/
                <span className="ml-2 text-yellow-300">●</span> glob
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleComment}
              title="Toggle comment (⌘/)"
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 border border-white/8 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <span className="font-mono text-zinc-600">#</span> Toggle comment
              <span className="text-[10px] text-zinc-700 ml-0.5">⌘/</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40
                ${saved
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
