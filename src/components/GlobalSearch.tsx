import { useState, useEffect, useRef } from "react";
import { RepoStatus } from "../types";

interface Props {
  statuses: Map<string, RepoStatus>;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export default function GlobalSearch({ statuses, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const all = [...statuses.entries()];
  const q = query.toLowerCase().trim();

  const results = q
    ? all.filter(
        ([, s]) =>
          s.name.toLowerCase().includes(q) ||
          s.branch.toLowerCase().includes(q) ||
          s.last_commit?.message.toLowerCase().includes(q)
      )
    : all;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[highlightIndex]) {
      onSelect(results[highlightIndex][0]);
      onClose();
    }
  }

  const isDirty = (s: RepoStatus) =>
    s.staged.length + s.unstaged.length + s.untracked.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        ref={ref}
        className="w-[560px] max-w-[90vw] bg-zinc-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <svg
            className="w-4 h-4 text-zinc-500 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search repositories…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
          <kbd className="text-[10px] text-zinc-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-600">
              No repositories found
            </div>
          ) : (
            results.map(([path, status], i) => (
              <button
                key={path}
                onClick={() => {
                  onSelect(path);
                  onClose();
                }}
                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors
                  ${i === highlightIndex ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${isDirty(status) ? "bg-yellow-400" : "bg-green-500"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {status.name}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {status.branch}
                    </span>
                  </div>
                  {status.last_commit && (
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {status.last_commit.message}
                    </p>
                  )}
                </div>
                {isDirty(status) && (
                  <span className="text-[10px] text-yellow-500 shrink-0">
                    {status.staged.length +
                      status.unstaged.length +
                      status.untracked.length}{" "}
                    changes
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3 text-[10px] text-zinc-600">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
        )}
      </div>
    </div>
  );
}
