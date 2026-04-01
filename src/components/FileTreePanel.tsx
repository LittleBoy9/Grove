import { useState, useEffect, useMemo, useCallback } from "react";
import { RepoStatus } from "../types";
import { api } from "../api";
import { buildTree, TreeNode, DirNode, FileNode, FileStatus } from "../lib/fileTree";
import DiffViewer from "./DiffViewer";

interface Props {
  repo: RepoStatus;
  onRefresh: () => void;
}

interface SelectedFile {
  path: string;
  status: FileStatus;
}

export default function FileTreePanel({ repo, onRefresh }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [diff, setDiff] = useState("");
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load file tree when repo changes
  useEffect(() => {
    setPaths([]);
    setSelected(null);
    setDiff("");
    api.readFileTree(repo.path).then(setPaths).catch(() => {});
  }, [repo.path]);

  // Rebuild tree when paths or repo status changes
  const tree = useMemo(() => buildTree(paths, repo), [paths, repo]);

  // Load diff when selection changes
  useEffect(() => {
    if (!selected || selected.status === "clean" || selected.status === "untracked") {
      setDiff("");
      return;
    }
    setLoadingDiff(true);
    const staged = selected.status === "staged";
    api
      .getFileDiff(repo.path, selected.path, staged)
      .then(setDiff)
      .catch(() => setDiff(""))
      .finally(() => setLoadingDiff(false));
  }, [selected, repo.path]);

  // Re-select same file with updated status when repo refreshes
  useEffect(() => {
    if (!selected) return;
    const allChanged = [
      ...repo.staged.map((f) => f.path),
      ...repo.unstaged.map((f) => f.path),
      ...repo.untracked.map((f) => f.path),
    ];
    const newStatus = allChanged.includes(selected.path)
      ? getStatusFromRepo(selected.path, repo)
      : "clean";
    setSelected((s) => (s ? { ...s, status: newStatus } : null));
  }, [repo]);

  const toggleCollapse = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  async function handleStage(path: string) {
    setActionLoading(path);
    setActionError(null);
    try {
      await api.stageFiles(repo.path, [path]);
      onRefresh();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnstage(path: string) {
    setActionLoading(path);
    setActionError(null);
    try {
      await api.unstageFiles(repo.path, [path]);
      onRefresh();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  const totalChanged =
    repo.staged.length + repo.unstaged.length + repo.untracked.length;

  return (
    <div className="flex h-full min-h-0">
      {/* Tree column */}
      <div className="w-72 shrink-0 border-r border-white/8 flex flex-col min-h-0">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/8 shrink-0 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Files</span>
          <div className="flex items-center gap-2">
            {repo.staged.length > 0 && (
              <span className="text-[10px] text-emerald-400 font-medium">
                {repo.staged.length} staged
              </span>
            )}
            {repo.unstaged.length > 0 && (
              <span className="text-[10px] text-amber-400 font-medium">
                {repo.unstaged.length} modified
              </span>
            )}
            {repo.untracked.length > 0 && (
              <span className="text-[10px] text-blue-400 font-medium">
                {repo.untracked.length} new
              </span>
            )}
            {totalChanged === 0 && (
              <span className="text-[10px] text-zinc-600">Clean</span>
            )}
          </div>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="mx-2 my-1 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400 flex items-center gap-2 shrink-0">
            <span className="flex-1 truncate">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-300 shrink-0">✕</button>
          </div>
        )}

        {/* Tree scroll area */}
        <div className="flex-1 overflow-y-auto py-1">
          {tree.children.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-zinc-700 text-xs">
              Loading…
            </div>
          ) : (
            tree.children.map((node) => (
              <TreeRow
                key={node.path}
                node={node}
                depth={0}
                collapsed={collapsed}
                selected={selected?.path ?? null}
                actionLoading={actionLoading}
                onToggle={toggleCollapse}
                onSelect={setSelected}
                onStage={handleStage}
                onUnstage={handleUnstage}
              />
            ))
          )}
        </div>
      </div>

      {/* Diff / detail column */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* File header */}
            <div className="px-4 py-2.5 border-b border-white/8 shrink-0 flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono truncate flex-1">
                {selected.path}
              </span>
              <StatusBadge status={selected.status} />
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto">
              {selected.status === "clean" ? (
                <div className="flex items-center justify-center h-full text-zinc-700 text-xs">
                  No changes — file is clean
                </div>
              ) : selected.status === "untracked" ? (
                <div className="flex items-center justify-center h-full text-zinc-700 text-xs">
                  Untracked file — stage it to see a diff
                </div>
              ) : loadingDiff ? (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs animate-pulse">
                  Loading diff…
                </div>
              ) : diff ? (
                <DiffViewer diff={diff} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-700 text-xs">
                  No diff available
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-700">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <span className="text-sm">Select a file to view diff</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tree row (recursive) ──────────────────────────────────────────────────────

function TreeRow({
  node,
  depth,
  collapsed,
  selected,
  actionLoading,
  onToggle,
  onSelect,
  onStage,
  onUnstage,
}: {
  node: TreeNode;
  depth: number;
  collapsed: Set<string>;
  selected: string | null;
  actionLoading: string | null;
  onToggle: (path: string) => void;
  onSelect: (f: SelectedFile) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
}) {
  if (node.isDir) {
    return (
      <DirRow
        node={node}
        depth={depth}
        collapsed={collapsed}
        selected={selected}
        actionLoading={actionLoading}
        onToggle={onToggle}
        onSelect={onSelect}
        onStage={onStage}
        onUnstage={onUnstage}
      />
    );
  }
  return (
    <FileRow
      node={node}
      depth={depth}
      selected={selected === node.path}
      actionLoading={actionLoading}
      onSelect={onSelect}
      onStage={onStage}
      onUnstage={onUnstage}
    />
  );
}

function DirRow({
  node,
  depth,
  collapsed,
  selected,
  actionLoading,
  onToggle,
  onSelect,
  onStage,
  onUnstage,
}: {
  node: DirNode;
  depth: number;
  collapsed: Set<string>;
  selected: string | null;
  actionLoading: string | null;
  onToggle: (path: string) => void;
  onSelect: (f: SelectedFile) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
}) {
  const isCollapsed = collapsed.has(node.path);
  const indent = depth * 12 + 8;

  return (
    <>
      <button
        onClick={() => onToggle(node.path)}
        className="w-full flex items-center gap-1.5 py-0.5 hover:bg-white/5 transition-colors group"
        style={{ paddingLeft: indent }}
      >
        {/* Chevron */}
        <svg
          className={`w-3 h-3 text-zinc-600 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>

        {/* Folder icon */}
        <svg
          className={`w-3.5 h-3.5 shrink-0 ${node.hasChanges ? "text-amber-400/70" : "text-zinc-600"}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
        </svg>

        {/* Name */}
        <span
          className={`text-xs truncate flex-1 text-left ${
            node.hasChanges ? "text-zinc-300" : "text-zinc-500"
          }`}
        >
          {node.name}
        </span>

        {/* Change count badge */}
        {node.hasChanges && node.changeCount > 0 && (
          <span className="text-[9px] text-zinc-600 mr-2 shrink-0">
            {node.changeCount}
          </span>
        )}
      </button>

      {/* Children */}
      {!isCollapsed &&
        node.children.map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            collapsed={collapsed}
            selected={selected}
            actionLoading={actionLoading}
            onToggle={onToggle}
            onSelect={onSelect}
            onStage={onStage}
            onUnstage={onUnstage}
          />
        ))}
    </>
  );
}

function FileRow({
  node,
  depth,
  selected,
  actionLoading,
  onSelect,
  onStage,
  onUnstage,
}: {
  node: FileNode;
  depth: number;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (f: SelectedFile) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
}) {
  const indent = depth * 12 + 8 + 12; // extra 12 aligns with dir content (chevron width)
  const isActing = actionLoading === node.path;

  return (
    <div
      onClick={() => onSelect({ path: node.path, status: node.status })}
      className={`flex items-center gap-1.5 py-0.5 cursor-pointer group transition-colors ${
        selected ? "bg-white/10" : "hover:bg-white/5"
      }`}
      style={{ paddingLeft: indent }}
    >
      {/* File icon */}
      <FileIcon name={node.name} status={node.status} />

      {/* Filename */}
      <span
        className={`text-xs truncate flex-1 ${
          node.status === "clean" ? "text-zinc-600" : "text-zinc-300"
        }`}
      >
        {node.name}
      </span>

      {/* Action or status indicator */}
      <div className="shrink-0 mr-2 flex items-center" onClick={(e) => e.stopPropagation()}>
        {isActing ? (
          <span className="text-[9px] text-zinc-600">…</span>
        ) : node.status === "staged" ? (
          <button
            onClick={() => onUnstage(node.path)}
            className="opacity-0 group-hover:opacity-100 text-[9px] px-1 py-px rounded border border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20 transition-all"
            title="Unstage"
          >
            unstage
          </button>
        ) : node.status === "modified" || node.status === "untracked" ? (
          <button
            onClick={() => onStage(node.path)}
            className="opacity-0 group-hover:opacity-100 text-[9px] px-1 py-px rounded border border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20 transition-all"
            title="Stage"
          >
            stage
          </button>
        ) : null}
        {/* Always-visible status dot (behind the hover action) */}
        {node.status !== "clean" && (
          <StatusDot status={node.status} className="group-hover:opacity-0 transition-opacity" />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FileIcon({ name, status }: { name: string; status: FileStatus }) {
  const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() : "";

  const colorClass =
    status === "clean"
      ? "text-zinc-700"
      : status === "staged"
      ? "text-emerald-500/70"
      : status === "modified"
      ? "text-amber-500/70"
      : status === "untracked"
      ? "text-blue-500/70"
      : "text-red-500/70"; // conflict

  // Pick icon shape based on extension group
  const isConfig = ["json", "toml", "yaml", "yml", "env", "ini", "cfg"].includes(ext ?? "");
  const isStyle = ["css", "scss", "sass", "less"].includes(ext ?? "");
  const isMarkup = ["html", "htm", "xml", "svg", "md", "mdx"].includes(ext ?? "");

  if (isConfig) {
    return (
      <svg className={`w-3 h-3 shrink-0 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    );
  }
  if (isStyle || isMarkup) {
    return (
      <svg className={`w-3 h-3 shrink-0 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    );
  }
  // Default file icon
  return (
    <svg className={`w-3 h-3 shrink-0 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

const STATUS_DOT_COLORS: Record<FileStatus, string> = {
  staged:    "bg-emerald-400",
  modified:  "bg-amber-400",
  untracked: "bg-blue-400",
  conflict:  "bg-red-400",
  clean:     "bg-transparent",
};

const STATUS_LABELS: Record<FileStatus, string> = {
  staged:    "Staged",
  modified:  "Modified",
  untracked: "Untracked",
  conflict:  "Conflict",
  clean:     "Clean",
};

function StatusDot({ status, className = "" }: { status: FileStatus; className?: string }) {
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[status]} ${className}`}
      title={STATUS_LABELS[status]}
    />
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  const styles: Record<FileStatus, string> = {
    staged:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    modified:  "bg-amber-500/15 text-amber-400 border-amber-500/25",
    untracked: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    conflict:  "bg-red-500/15 text-red-400 border-red-500/25",
    clean:     "bg-white/5 text-zinc-500 border-white/10",
  };
  return (
    <span className={`text-[10px] px-1.5 py-px rounded border font-medium ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// Helper used in useEffect to derive status from repo
function getStatusFromRepo(path: string, repo: RepoStatus): FileStatus {
  if (repo.unstaged.some((f) => f.path === path && f.status === "conflict")) return "conflict";
  if (repo.staged.some((f) => f.path === path)) return "staged";
  if (repo.unstaged.some((f) => f.path === path)) return "modified";
  if (repo.untracked.some((f) => f.path === path)) return "untracked";
  return "clean";
}
