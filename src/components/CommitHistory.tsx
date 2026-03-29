import { useState, useEffect, useRef } from "react";
import { CommitInfo } from "../types";
import { api } from "../api";
import DiffViewer from "./DiffViewer";
import { timeAgo } from "../lib/time";

interface Props {
  repoPath: string;
  onRefresh?: () => void;
}

export default function CommitHistory({ repoPath, onRefresh }: Props) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [selected, setSelected] = useState<CommitInfo | null>(null);
  const [diff, setDiff] = useState("");
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [limit, setLimit] = useState(50);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCommits([]);
    setSelected(null);
    setDiff("");
    api.getLog(repoPath, limit).then(setCommits).catch(() => {});
  }, [repoPath, limit]);

  async function handleSelect(commit: CommitInfo) {
    setSelected(commit);
    setLoadingDiff(true);
    try {
      const d = await api.getCommitDiff(repoPath, commit.hash);
      setDiff(d);
    } catch {
      setDiff("");
    } finally {
      setLoadingDiff(false);
    }
  }

  async function handleRevert(hash: string) {
    setActionLoading(`revert-${hash}`);
    setError(null);
    try {
      await api.revertCommit(repoPath, hash);
      const updated = await api.getLog(repoPath, limit);
      setCommits(updated);
      onRefresh?.();
    } catch (e) { setError(String(e)); } finally { setActionLoading(null); }
  }

  async function handleCherryPick(hash: string) {
    setActionLoading(`pick-${hash}`);
    setError(null);
    try {
      await api.cherryPick(repoPath, hash);
      const updated = await api.getLog(repoPath, limit);
      setCommits(updated);
      onRefresh?.();
    } catch (e) { setError(String(e)); } finally { setActionLoading(null); }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 shrink-0 flex items-center gap-2">
          {error}
          <button className="underline ml-auto" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* Commit list */}
        <div className="w-80 shrink-0 border-r border-white/8 flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-white/8 shrink-0 flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">{commits.length} commits</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-zinc-400 outline-none"
            >
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {commits.map((commit, i) => (
              <CommitRow
                key={commit.hash}
                commit={commit}
                index={i}
                total={commits.length}
                selected={selected?.hash === commit.hash}
                actionLoading={actionLoading}
                onSelect={handleSelect}
                onRevert={handleRevert}
                onCherryPick={handleCherryPick}
              />
            ))}
            {commits.length === 0 && (
              <div className="flex items-center justify-center h-32 text-zinc-600 text-xs">No commits found</div>
            )}
          </div>
        </div>

        {/* Diff panel */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {selected ? (
            <>
              <div className="px-4 py-2.5 border-b border-white/8 shrink-0">
                <p className="text-xs text-zinc-300 font-medium">{selected.message}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[11px] text-zinc-500">{selected.hash}</span>
                  <span className="text-[11px] text-zinc-500">{selected.author}</span>
                  <span className="text-[11px] text-zinc-600">{timeAgo(selected.timestamp)}</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {loadingDiff ? (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-xs animate-pulse">Loading diff…</div>
                ) : (
                  <DiffViewer diff={diff} />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-700 text-sm">Select a commit to view diff</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommitRow({
  commit,
  index,
  total,
  selected,
  actionLoading,
  onSelect,
  onRevert,
  onCherryPick,
}: {
  commit: CommitInfo;
  index: number;
  total: number;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (c: CommitInfo) => void;
  onRevert: (hash: string) => void;
  onCherryPick: (hash: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActing = actionLoading === `revert-${commit.hash}` || actionLoading === `pick-${commit.hash}`;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      onClick={() => !menuOpen && onSelect(commit)}
      className={`px-4 py-3 cursor-pointer border-b border-white/4 transition-colors group relative
        ${selected ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center shrink-0 mt-1">
          <div className={`w-2 h-2 rounded-full border-2 ${index === 0 ? "border-blue-400 bg-blue-400/30" : "border-zinc-600 bg-transparent"}`} />
          {index < total - 1 && <div className="w-px flex-1 bg-zinc-700 mt-1" style={{ minHeight: 12 }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-200 leading-snug line-clamp-2 pr-6">{commit.message}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[10px] text-zinc-600">{commit.short_hash}</span>
            <span className="text-[10px] text-zinc-600 truncate">{commit.author}</span>
            <span className="text-[10px] text-zinc-600 ml-auto shrink-0">{timeAgo(commit.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Context menu button */}
      <div
        ref={menuRef}
        className="absolute right-3 top-3"
        onClick={(e) => e.stopPropagation()}
      >
        {isActing ? (
          <span className="text-[10px] text-zinc-500">working…</span>
        ) : (
          <>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all"
              title="More actions"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-zinc-800 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1">
                <button
                  onClick={() => { setMenuOpen(false); onRevert(commit.hash); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors"
                >
                  Revert commit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onCherryPick(commit.hash); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors"
                >
                  Cherry-pick
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
