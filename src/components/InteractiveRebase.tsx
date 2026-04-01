import { useState, useRef } from "react";
import { CommitInfo } from "../types";
import { api } from "../api";
import { timeAgo } from "../lib/time";

type Action = "pick" | "squash" | "fixup" | "drop" | "reword";

interface RebaseEntry {
  action: Action;
  commit: CommitInfo;
}

interface Props {
  repoPath: string;
  commits: CommitInfo[]; // commits to rebase (newest first)
  onClose: () => void;
  onDone: () => void;
}

const ACTION_COLORS: Record<Action, string> = {
  pick:   "bg-blue-500/15 text-blue-300 border-blue-500/20",
  squash: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  fixup:  "bg-purple-500/10 text-purple-400 border-purple-500/15",
  drop:   "bg-red-500/15 text-red-400 border-red-500/20",
  reword: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
};

const ACTION_LABELS: Record<Action, string> = {
  pick:   "pick",
  squash: "squash",
  fixup:  "fixup",
  drop:   "drop",
  reword: "reword",
};

export default function InteractiveRebase({ repoPath, commits, onClose, onDone }: Props) {
  const [entries, setEntries] = useState<RebaseEntry[]>(
    // Reverse so oldest is first (as git rebase presents them)
    [...commits].reverse().map((c) => ({ action: "pick" as Action, commit: c }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  function setAction(index: number, action: Action) {
    setEntries((prev) => prev.map((e, i) => i === index ? { ...e, action } : e));
  }

  function handleDragStart(index: number) {
    dragRef.current = index;
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(targetIndex: number) {
    const fromIndex = dragRef.current;
    if (fromIndex === null || fromIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setEntries((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;
  }

  function buildInstructions(): string {
    return entries
      .map((e) => `${e.action} ${e.commit.hash} ${e.commit.message}`)
      .join("\n");
  }

  async function handleRebase() {
    if (entries.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      // Base is the parent of the oldest commit in our list
      const base = entries[0].commit.hash + "^";
      const instructions = buildInstructions();
      await api.interactiveRebase(repoPath, base, instructions);
      onDone();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const droppedCount = entries.filter((e) => e.action === "drop").length;
  const squashedCount = entries.filter((e) => e.action === "squash" || e.action === "fixup").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[680px] max-h-[80vh] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Interactive Rebase</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Reordering {entries.length} commits — drag to reorder, pick an action per commit
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Legend */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {(["pick", "reword", "squash", "fixup", "drop"] as Action[]).map((a) => (
              <span key={a} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${ACTION_COLORS[a]}`}>
                {a}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 shrink-0">
            {error}
            <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
          </div>
        )}

        {/* Commit list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {entries.map((entry, i) => (
            <div
              key={entry.commit.hash}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing
                ${dragIndex === i ? "opacity-40" : ""}
                ${dragOverIndex === i && dragIndex !== i ? "border-blue-500/40 bg-blue-500/5" : "border-white/6 bg-white/3"}
                ${entry.action === "drop" ? "opacity-50" : ""}
              `}
            >
              {/* Drag handle */}
              <svg className="w-3 h-3 text-zinc-700 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
              </svg>

              {/* Action selector */}
              <select
                value={entry.action}
                onChange={(e) => setAction(i, e.target.value as Action)}
                className={`text-[11px] px-2 py-1 rounded border font-medium outline-none bg-transparent cursor-pointer ${ACTION_COLORS[entry.action]}`}
              >
                {(["pick", "reword", "squash", "fixup", "drop"] as Action[]).map((a) => (
                  <option key={a} value={a} className="bg-zinc-800 text-zinc-200">
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>

              {/* Commit info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${entry.action === "drop" ? "line-through text-zinc-600" : "text-zinc-200"}`}>
                  {entry.commit.message}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-zinc-600">{entry.commit.short_hash}</span>
                  <span className="text-[10px] text-zinc-600">{entry.commit.author}</span>
                  <span className="text-[10px] text-zinc-700 ml-auto">{timeAgo(entry.commit.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-4 shrink-0">
          {(droppedCount > 0 || squashedCount > 0) && (
            <p className="text-[11px] text-zinc-500 mb-3">
              {droppedCount > 0 && <span className="text-red-400">{droppedCount} commit{droppedCount > 1 ? "s" : ""} will be dropped. </span>}
              {squashedCount > 0 && <span className="text-purple-400">{squashedCount} commit{squashedCount > 1 ? "s" : ""} will be squashed/fixedup. </span>}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-white/3 hover:bg-white/8 border border-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRebase}
              disabled={loading || entries.every((e) => e.action === "drop")}
              className="flex-1 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors disabled:opacity-40"
            >
              {loading ? "Rebasing…" : "Start Rebase"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
