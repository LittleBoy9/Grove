import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CommitInfo, GraphCommitInfo } from "../types";
import { api } from "../api";
import DiffViewer from "./DiffViewer";
import GitGraph from "./GitGraph";
import { timeAgo } from "../lib/time";

type ViewMode = "list" | "graph";

interface Props {
  repoPath: string;
  onRefresh?: () => void;
}

export default function CommitHistory({ repoPath, onRefresh }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [graphCommits, setGraphCommits] = useState<GraphCommitInfo[]>([]);
  const [selected, setSelected] = useState<CommitInfo | GraphCommitInfo | null>(null);
  const [diff, setDiff] = useState("");
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(320);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.max(200, Math.min(600, dragStartWidth.current + ev.clientX - dragStartX.current));
      setPanelWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  useEffect(() => {
    setCommits([]);
    setGraphCommits([]);
    setSelected(null);
    setDiff("");
    const effectiveLimit = limit === 0 ? 999999 : limit;
    if (viewMode === "list") {
      api.getLog(repoPath, effectiveLimit).then(setCommits).catch(() => {});
    } else {
      api.getLogGraph(repoPath, effectiveLimit).then(setGraphCommits).catch(() => {});
    }
  }, [repoPath, limit, viewMode]);

  async function handleSelect(commit: CommitInfo | GraphCommitInfo) {
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
      if (viewMode === "list") {
        setCommits(await api.getLog(repoPath, limit));
      } else {
        setGraphCommits(await api.getLogGraph(repoPath, limit));
      }
      onRefresh?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCherryPick(hash: string) {
    setActionLoading(`pick-${hash}`);
    setError(null);
    try {
      await api.cherryPick(repoPath, hash);
      if (viewMode === "list") {
        setCommits(await api.getLog(repoPath, limit));
      } else {
        setGraphCommits(await api.getLogGraph(repoPath, limit));
      }
      onRefresh?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  const filteredCommits = useMemo(() => {
    if (!search.trim()) return commits;
    const q = search.toLowerCase();
    return commits.filter(
      (c) => c.message.toLowerCase().includes(q) || c.author.toLowerCase().includes(q) || c.short_hash.includes(q)
    );
  }, [commits, search]);

  const filteredGraphCommits = useMemo(() => {
    if (!search.trim()) return graphCommits;
    const q = search.toLowerCase();
    return graphCommits.filter(
      (c) => c.message.toLowerCase().includes(q) || c.author.toLowerCase().includes(q) || c.short_hash.includes(q)
    );
  }, [graphCommits, search]);

  const count = viewMode === "list" ? commits.length : graphCommits.length;
  const filteredCount = viewMode === "list" ? filteredCommits.length : filteredGraphCommits.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 shrink-0 flex items-center gap-2">
          {error}
          <button className="underline ml-auto" onClick={() => setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="shrink-0 border-r border-white/8 flex flex-col min-h-0" style={{ width: panelWidth }}>
          {/* Toolbar */}
          <div className="px-3 py-2 border-b border-white/8 shrink-0 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {/* List / Graph toggle */}
              <div className="flex items-center rounded-lg border border-white/8 overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode("list")}
                  title="List view"
                  className={`px-2 py-1.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-white/15 text-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/8"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
                    <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
                    <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("graph")}
                  title="Graph view"
                  className={`px-2 py-1.5 transition-colors ${
                    viewMode === "graph"
                      ? "bg-white/15 text-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/8"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="5" cy="5" r="2" />
                    <circle cx="19" cy="5" r="2" />
                    <circle cx="12" cy="19" r="2" />
                    <path d="M5 7 C5 13 12 13 12 17" strokeLinecap="round" />
                    <path d="M19 7 C19 13 12 13 12 17" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <span className="text-xs text-zinc-500 font-medium">
                {search.trim() ? `${filteredCount}/${count}` : `${count} commits`}
              </span>

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="ml-auto text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-zinc-400 outline-none"
              >
                <option value={25}>Last 25</option>
                <option value={50}>Last 50</option>
                <option value={100}>Last 100</option>
                <option value={200}>Last 200</option>
                <option value={0}>All</option>
              </select>
            </div>
            {/* Search input */}
            <div className="relative">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commits…"
                className="w-full pl-7 pr-7 py-1 text-xs bg-white/5 border border-white/8 rounded-lg text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/20"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {viewMode === "list" ? (
            <div className="flex-1 overflow-y-auto">
              {filteredCommits.map((commit, i) => (
                <CommitRow
                  key={commit.hash}
                  commit={commit}
                  index={i}
                  total={filteredCommits.length}
                  selected={selected?.hash === commit.hash}
                  actionLoading={actionLoading}
                  onSelect={handleSelect}
                  onRevert={handleRevert}
                  onCherryPick={handleCherryPick}
                />
              ))}
              {filteredCommits.length === 0 && (
                <div className="flex items-center justify-center h-32 text-zinc-600 text-xs">
                  {search.trim() ? "No matching commits" : "No commits found"}
                </div>
              )}
            </div>
          ) : (
            <GitGraph
              commits={filteredGraphCommits}
              selectedHash={selected?.hash ?? null}
              actionLoading={actionLoading}
              onSelect={handleSelect}
              onRevert={handleRevert}
              onCherryPick={handleCherryPick}
            />
          )}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={onDragStart}
          className="w-1 shrink-0 cursor-col-resize hover:bg-blue-500/40 active:bg-blue-500/60 transition-colors group relative"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Right panel: diff */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {selected ? (
            <>
              <div className="px-4 py-2.5 border-b border-white/8 shrink-0">
                <p className="text-xs text-zinc-300 font-medium">
                  {selected.message}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[11px] text-zinc-500">
                    {selected.hash}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {selected.author}
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {timeAgo(selected.timestamp)}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {loadingDiff ? (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-xs animate-pulse">
                    Loading diff…
                  </div>
                ) : (
                  <DiffViewer diff={diff} />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-700 text-sm">
              Select a commit to view diff
            </div>
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
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActing =
    actionLoading === `revert-${commit.hash}` ||
    actionLoading === `pick-${commit.hash}`;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
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
          <div
            className={`w-2 h-2 rounded-full border-2 ${
              index === 0
                ? "border-blue-400 bg-blue-400/30"
                : "border-zinc-600 bg-transparent"
            }`}
          />
          {index < total - 1 && (
            <div
              className="w-px flex-1 bg-zinc-700 mt-1"
              style={{ minHeight: 12 }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-200 leading-snug line-clamp-2 pr-6">
            {commit.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(commit.hash);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              title="Copy full hash"
              className="font-mono text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
            >
              {copied ? "✓ copied" : commit.short_hash}
            </button>
            <span className="text-[10px] text-zinc-600 truncate">
              {commit.author}
            </span>
            <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
              {timeAgo(commit.timestamp)}
            </span>
          </div>
        </div>
      </div>

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
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-zinc-800 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRevert(commit.hash);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors"
                >
                  Revert commit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onCherryPick(commit.hash);
                  }}
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
