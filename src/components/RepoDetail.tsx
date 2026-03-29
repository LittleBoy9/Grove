import { useState, useEffect, useRef } from "react";
import { RepoStatus, FileChange } from "../types";
import { api } from "../api";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import DiffViewer from "./DiffViewer";
import LauncherMenu from "./LauncherMenu";
import BranchSwitcher from "./BranchSwitcher";
import CommitHistory from "./CommitHistory";
import StashPanel from "./StashPanel";
import TagsPanel from "./TagsPanel";
import RemotesPanel from "./RemotesPanel";
import FileHistory from "./FileHistory";
import GitignoreEditor from "./GitignoreEditor";
import FileTreePanel from "./FileTreePanel";
import BranchCompare from "./BranchCompare";
import { timeAgo } from "../lib/time";
import { notify } from "../lib/notify";
import { generateCommitMessage } from "../lib/ai";
import { loadSettings } from "../lib/settings";

type Tab = "changes" | "history" | "compare" | "stash" | "tags" | "remotes" | "tree";

interface Props {
  repo: RepoStatus;
  onRefresh: () => void;
}

function FileRow({
  file,
  selected,
  checked,
  onSelect,
  onCheck,
  onDiscard,
  onHistory,
}: {
  file: FileChange;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onCheck: (v: boolean) => void;
  onDiscard?: () => void;
  onHistory?: () => void;
}) {
  const colorMap: Record<string, string> = {
    modified: "text-yellow-400", added: "text-green-400", deleted: "text-red-400",
    renamed: "text-blue-400", conflict: "text-red-500", untracked: "text-zinc-400",
    changed: "text-yellow-400", copied: "text-blue-400",
  };
  const labelMap: Record<string, string> = {
    modified: "M", added: "A", deleted: "D", renamed: "R",
    conflict: "!", untracked: "?", changed: "~", copied: "C",
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md group/row transition-colors
        ${selected ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => { e.stopPropagation(); onCheck(e.target.checked); }}
        onClick={(e) => e.stopPropagation()}
        className="accent-green-500 shrink-0"
      />
      <span className={`text-[11px] font-bold w-4 shrink-0 ${colorMap[file.status] || "text-zinc-400"}`}>
        {labelMap[file.status] || "~"}
      </span>
      <span className="text-xs text-zinc-300 truncate flex-1 font-mono">{file.path}</span>
      {onHistory && (
        <button
          onClick={(e) => { e.stopPropagation(); onHistory(); }}
          className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0"
          title="File history"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 3" />
          </svg>
        </button>
      )}
      {onDiscard && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          title="Discard changes"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ConflictRow({
  filePath,
  resolving,
  onOurs,
  onTheirs,
  onSelect,
  selected,
}: {
  filePath: string;
  resolving: boolean;
  onOurs: () => void;
  onTheirs: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md transition-colors
        ${selected ? "bg-red-500/10" : "hover:bg-red-500/5"}`}
    >
      <span className="text-[11px] font-bold w-4 shrink-0 text-red-500">!</span>
      <span className="text-xs text-red-300 truncate flex-1 font-mono">{filePath}</span>
      {resolving ? (
        <span className="text-[10px] text-zinc-500 shrink-0">resolving…</span>
      ) : (
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onOurs}
            className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/20 rounded transition-colors"
            title="Use our version (git checkout --ours)"
          >
            Ours
          </button>
          <button
            onClick={onTheirs}
            className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/20 rounded transition-colors"
            title="Use their version (git checkout --theirs)"
          >
            Theirs
          </button>
        </div>
      )}
    </div>
  );
}

function remoteToWebUrl(url: string): string | null {
  url = url.trim();
  if (url.startsWith("https://") || url.startsWith("http://")) return url.replace(/\.git$/, "");
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) return `https://${sshMatch[1]}/${sshMatch[2]}`;
  const gitMatch = url.match(/^git:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (gitMatch) return `https://${gitMatch[1]}/${gitMatch[2]}`;
  return null;
}

const VALID_TABS: Tab[] = ["changes", "history", "compare", "stash", "tags", "remotes", "tree"];

function loadTab(repoPath: string): Tab {
  try {
    const saved = localStorage.getItem(`grove_tab_${repoPath}`);
    if (saved && VALID_TABS.includes(saved as Tab)) return saved as Tab;
  } catch { /* ignore */ }
  return "changes";
}

export default function RepoDetail({ repo, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>(() => loadTab(repo.path));
  const [commitMessage, setCommitMessage] = useState("");
  const [amending, setAmending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; staged: boolean } | null>(null);
  const [diff, setDiff] = useState("");
  const [checkedStaged, setCheckedStaged] = useState<Set<string>>(new Set());
  const [checkedUnstaged, setCheckedUnstaged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileHistoryPath, setFileHistoryPath] = useState<string | null>(null);
  const [forcePushOpen, setForcePushOpen] = useState(false);
  const [showGitignore, setShowGitignore] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const forcePushRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!forcePushOpen) return;
    const handler = (e: MouseEvent) => {
      if (forcePushRef.current && !forcePushRef.current.contains(e.target as Node)) {
        setForcePushOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [forcePushOpen]);

  // Restore tab when repo changes
  useEffect(() => {
    setTab(loadTab(repo.path));
    setSelectedFile(null);
    setDiff("");
    setCheckedStaged(new Set());
    setCheckedUnstaged(new Set());
    setError(null);
    setAmending(false);
  }, [repo.path]);

  // Persist tab on change
  useEffect(() => {
    try {
      localStorage.setItem(`grove_tab_${repo.path}`, tab);
    } catch { /* ignore */ }
  }, [tab, repo.path]);

  // Build PR URL from origin remote + current branch
  useEffect(() => {
    setPrUrl(null);
    const branch = repo.branch;
    if (!branch || branch === "HEAD") return;
    api.listRemotes(repo.path).then((remotes) => {
      const origin = remotes.find((r) => r.name === "origin") ?? remotes[0];
      if (!origin) return;
      const webUrl = remoteToWebUrl(origin.url);
      if (!webUrl) return;
      if (/github\.com/i.test(webUrl)) {
        setPrUrl(`${webUrl}/compare/${encodeURIComponent(branch)}?expand=1`);
      } else if (/gitlab\.com/i.test(webUrl)) {
        setPrUrl(`${webUrl}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(branch)}`);
      } else if (/bitbucket\.org/i.test(webUrl)) {
        setPrUrl(`${webUrl}/pull-requests/new?source=${encodeURIComponent(branch)}`);
      }
    }).catch(() => {});
  }, [repo.path, repo.branch]);

  // Keyboard shortcuts: 1-5 to switch tabs; Cmd+Shift+F/L/P for fetch/pull/push
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Cmd+Shift+F → fetch, Cmd+Shift+L → pull, Cmd+Shift+P → push
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (e.key === "F" || e.key === "f") { e.preventDefault(); handleFetch(); return; }
        if (e.key === "L" || e.key === "l") { e.preventDefault(); handlePull(); return; }
        if (e.key === "P" || e.key === "p") { e.preventDefault(); handlePush(); return; }
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tabMap: Record<string, Tab> = {
        "1": "changes",
        "2": "history",
        "3": "stash",
        "4": "tags",
        "5": "remotes",
      };
      if (tabMap[e.key]) {
        e.preventDefault();
        setTab(tabMap[e.key]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    api.getFileDiff(repo.path, selectedFile.path, selectedFile.staged)
      .then(setDiff)
      .catch(() => setDiff(""));
  }, [selectedFile]);

  // Prefill commit message when amending
  useEffect(() => {
    if (amending && repo.last_commit) {
      setCommitMessage(repo.last_commit.message);
    } else if (!amending) {
      setCommitMessage("");
    }
  }, [amending]);

  async function handleResolveOurs(filePath: string) {
    setLoading(`resolve-${filePath}`);
    try {
      await api.resolveConflictOurs(repo.path, filePath);
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleResolveTheirs(filePath: string) {
    setLoading(`resolve-${filePath}`);
    try {
      await api.resolveConflictTheirs(repo.path, filePath);
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleGenerateCommitMessage() {
    if (repo.staged.length === 0) return;
    const s = loadSettings();
    if (!s.aiProvider || !s.aiKey || !s.aiModel) {
      setAiError("__unconfigured__");
      setTimeout(() => setAiError(null), 4000);
      return;
    }
    setAiGenerating(true);
    setAiError(null);
    try {
      // Fetch all staged diffs in parallel and concatenate
      const diffs = await Promise.all(
        repo.staged.map((f) => api.getFileDiff(repo.path, f.path, true).catch(() => ""))
      );
      const combinedDiff = diffs.filter(Boolean).join("\n");
      if (!combinedDiff.trim()) throw new Error("No diff content to generate from");
      const message = await generateCommitMessage(combinedDiff, s);
      if (message) setCommitMessage(message);
    } catch (e) {
      setAiError(String(e));
      setTimeout(() => setAiError(null), 5000);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleStage() {
    if (checkedUnstaged.size === 0) return;
    setLoading("stage");
    try {
      await api.stageFiles(repo.path, [...checkedUnstaged]);
      setCheckedUnstaged(new Set());
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleUnstage() {
    if (checkedStaged.size === 0) return;
    setLoading("unstage");
    try {
      await api.unstageFiles(repo.path, [...checkedStaged]);
      setCheckedStaged(new Set());
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleStageAll() {
    const all = [...repo.unstaged.map(f => f.path), ...repo.untracked.map(f => f.path)];
    if (all.length === 0) return;
    setLoading("stageAll");
    try {
      await api.stageFiles(repo.path, all);
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleDiscard(filePath: string) {
    setLoading(`discard-${filePath}`);
    try {
      await api.discardFile(repo.path, filePath);
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleDiscardAll() {
    setLoading("discardAll");
    try {
      await api.discardAll(repo.path);
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleCommit() {
    if (!commitMessage.trim()) return;
    if (!amending && repo.staged.length === 0) return;
    setLoading("commit");
    try {
      if (amending) {
        await api.amendCommit(repo.path, commitMessage.trim());
        setAmending(false);
      } else {
        await api.commitChanges(repo.path, commitMessage.trim());
      }
      setCommitMessage("");
      onRefresh();
    } catch (e) { setError(String(e)); } finally { setLoading(null); }
  }

  async function handleFetch() {
    setLoading("fetch");
    setError(null);
    try {
      await api.fetchRepo(repo.path);
      onRefresh();
      await notify("Fetch complete", repo.name);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      await notify("Fetch failed", msg.slice(0, 80));
    } finally { setLoading(null); }
  }

  async function handlePush() {
    setLoading("push");
    setError(null);
    try {
      await api.pushRepo(repo.path);
      onRefresh();
      await notify("Push complete", repo.name);
    } catch (e) {
      const msg = String(e);
      // Auto-retry with set-upstream if no upstream configured
      if (msg.includes("set-upstream") || msg.includes("no upstream")) {
        try {
          await api.pushUpstream(repo.path, repo.branch);
          onRefresh();
          await notify("Push complete", `${repo.name} (set upstream)`);
          return;
        } catch (e2) {
          const msg2 = String(e2);
          setError(msg2);
          await notify("Push failed", msg2.slice(0, 80));
          return;
        }
      }
      setError(msg);
      await notify("Push failed", msg.slice(0, 80));
    } finally { setLoading(null); }
  }

  async function handleForcePush() {
    setForcePushOpen(false);
    setLoading("push");
    setError(null);
    try {
      await api.pushForce(repo.path);
      onRefresh();
      await notify("Force push complete", repo.name);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      await notify("Force push failed", msg.slice(0, 80));
    } finally { setLoading(null); }
  }

  async function handlePull() {
    setLoading("pull");
    setError(null);
    try {
      await api.pullRepo(repo.path);
      onRefresh();
      await notify("Pull complete", repo.name);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      await notify("Pull failed", msg.slice(0, 80));
    } finally { setLoading(null); }
  }

  const toggleChecked = (set: Set<string>, setFn: (s: Set<string>) => void, path: string, val: boolean) => {
    const next = new Set(set);
    if (val) next.add(path); else next.delete(path);
    setFn(next);
  };

  const totalChanges = repo.staged.length + repo.unstaged.length + repo.untracked.length;

  // Conflict files: deduped paths that have status "conflict" in staged or unstaged
  const conflictPaths = new Set<string>([
    ...repo.staged.filter((f) => f.status === "conflict").map((f) => f.path),
    ...repo.unstaged.filter((f) => f.status === "conflict").map((f) => f.path),
  ]);
  const nonConflictStaged = repo.staged.filter((f) => !conflictPaths.has(f.path));
  const nonConflictUnstaged = [
    ...repo.unstaged.filter((f) => !conflictPaths.has(f.path)),
    ...repo.untracked,
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-white/8 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">{repo.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <BranchSwitcher
                repoPath={repo.path}
                currentBranch={repo.branch}
                onBranchChange={onRefresh}
              />
              {repo.ahead > 0 && <span className="text-xs text-blue-400">↑{repo.ahead} ahead</span>}
              {repo.behind > 0 && <span className="text-xs text-orange-400">↓{repo.behind} behind</span>}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5 font-mono truncate">{repo.path}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LauncherMenu repoPath={repo.path} />
            <button
              onClick={() => setShowGitignore(true)}
              className="px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/8 border border-white/8 hover:border-white/15 transition-all font-mono"
              title="Edit .gitignore"
            >
              .gitignore
            </button>
            <div className="w-px h-5 bg-white/10" />
            <Button size="sm" variant="outline"
              className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              onClick={handleFetch} disabled={!!loading}>
              {loading === "fetch" ? "Fetching…" : "↺ Fetch"}
            </Button>
            <Button size="sm" variant="outline"
              className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              onClick={handlePull} disabled={!!loading}>
              {loading === "pull" ? "Pulling…" : "↓ Pull"}
            </Button>
            {prUrl && (
              <button
                onClick={() => api.openUrl(prUrl)}
                title="Open pull request in browser"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" />
                  <path strokeLinecap="round" d="M8 6h3a4 4 0 014 4v2M8 18h3" />
                </svg>
                Create PR
              </button>
            )}
            <div ref={forcePushRef} className="relative flex items-stretch">
              <Button size="sm" variant="outline"
                className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-r-none border-r-0"
                onClick={handlePush} disabled={!!loading}>
                {loading === "push" ? "Pushing…" : "↑ Push"}
              </Button>
              <button
                onClick={() => setForcePushOpen((o) => !o)}
                disabled={!!loading}
                className="px-1.5 text-zinc-400 border border-white/10 bg-white/5 hover:bg-white/10 rounded-r-md border-l-0 transition-colors disabled:opacity-40"
                title="Force push options"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {forcePushOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  <button
                    onClick={handleForcePush}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    ⚠ Force push (--force-with-lease)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Last commit */}
        {repo.last_commit && (
          <div className="mt-2.5 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
            <span className="font-mono text-[11px] text-zinc-500 shrink-0">{repo.last_commit.short_hash}</span>
            <span className="text-xs text-zinc-400 truncate flex-1">{repo.last_commit.message}</span>
            <span className="text-xs text-zinc-600 shrink-0">{repo.last_commit.author}</span>
            <span className="text-xs text-zinc-600 shrink-0">{timeAgo(repo.last_commit.timestamp)}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(["changes", "history", "compare", "stash", "tags", "remotes", "tree"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors
                ${tab === t
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
            >
              {t === "changes" && totalChanges > 0
                ? `Changes (${totalChanges})`
                : t === "tags"
                  ? "Tags"
                  : t === "remotes"
                    ? "Remotes"
                    : t === "tree"
                      ? "Tree"
                      : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 shrink-0">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {tab === "changes" && (
          totalChanges === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-600">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Working tree is clean</span>
            </div>
          ) : (
            <div className="flex h-full min-h-0">
              {/* File list */}
              <div className="w-72 shrink-0 border-r border-white/8 flex flex-col">
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-3 space-y-4">
                    {/* Conflicts */}
                    {conflictPaths.size > 0 && (
                      <div>
                        <div className="px-3 mb-1">
                          <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">
                            Conflicts ({conflictPaths.size})
                          </span>
                        </div>
                        {[...conflictPaths].map((filePath) => (
                          <ConflictRow
                            key={filePath}
                            filePath={filePath}
                            resolving={loading === `resolve-${filePath}`}
                            onOurs={() => handleResolveOurs(filePath)}
                            onTheirs={() => handleResolveTheirs(filePath)}
                            onSelect={() => setSelectedFile({ path: filePath, staged: false })}
                            selected={selectedFile?.path === filePath}
                          />
                        ))}
                      </div>
                    )}

                    {/* Staged */}
                    {nonConflictStaged.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-3 mb-1">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                            Staged ({nonConflictStaged.length})
                          </span>
                          <button onClick={handleUnstage} disabled={checkedStaged.size === 0 || !!loading}
                            className="text-[11px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30">
                            Unstage selected
                          </button>
                        </div>
                        {nonConflictStaged.map((f) => (
                          <FileRow key={f.path} file={f}
                            selected={selectedFile?.path === f.path && selectedFile?.staged}
                            checked={checkedStaged.has(f.path)}
                            onSelect={() => setSelectedFile({ path: f.path, staged: true })}
                            onCheck={(v) => toggleChecked(checkedStaged, setCheckedStaged, f.path, v)}
                            onHistory={() => setFileHistoryPath(f.path)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Unstaged + Untracked */}
                    {nonConflictUnstaged.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-3 mb-1">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                            Changes ({nonConflictUnstaged.length})
                          </span>
                          <div className="flex gap-2">
                            <button onClick={handleStage} disabled={checkedUnstaged.size === 0 || !!loading}
                              className="text-[11px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30">
                              Stage
                            </button>
                            <button onClick={handleStageAll} disabled={!!loading}
                              className="text-[11px] text-green-500 hover:text-green-400 disabled:opacity-30">
                              All
                            </button>
                            <button onClick={handleDiscardAll} disabled={!!loading}
                              className="text-[11px] text-red-500 hover:text-red-400 disabled:opacity-30">
                              Discard all
                            </button>
                          </div>
                        </div>
                        {nonConflictUnstaged.map((f) => (
                          <FileRow key={f.path} file={f}
                            selected={selectedFile?.path === f.path && !selectedFile?.staged}
                            checked={checkedUnstaged.has(f.path)}
                            onSelect={() => setSelectedFile({ path: f.path, staged: false })}
                            onCheck={(v) => toggleChecked(checkedUnstaged, setCheckedUnstaged, f.path, v)}
                            onHistory={() => setFileHistoryPath(f.path)}
                            onDiscard={() => handleDiscard(f.path)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Commit box */}
                <div className="p-3 border-t border-white/8 shrink-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      onClick={handleGenerateCommitMessage}
                      disabled={aiGenerating || repo.staged.length === 0}
                      title={repo.staged.length === 0 ? "Stage files first" : "Generate commit message with AI (requires API key in Settings)"}
                      className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border border-white/8 bg-white/5 text-zinc-500 hover:text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {aiGenerating ? (
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" d="M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                        </svg>
                      )}
                      {aiGenerating ? "Generating…" : "AI message"}
                    </button>
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        checked={amending}
                        onChange={(e) => setAmending(e.target.checked)}
                        className="accent-orange-500"
                      />
                      Amend last commit
                    </label>
                  </div>
                  {aiError && (
                    <div className="mb-1.5">
                      {aiError === "__unconfigured__" ? (
                        <span className="text-[10px] text-zinc-500">Set up AI in Settings ⚙︎</span>
                      ) : (
                        <span className="text-[10px] text-red-400" title={aiError}>
                          {aiError.length > 80 ? aiError.slice(0, 80) + "…" : aiError}
                        </span>
                      )}
                    </div>
                  )}
                  <Textarea
                    placeholder={amending ? "Edit commit message…" : "Commit message…"}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="text-xs bg-white/5 border-white/10 resize-none h-16 text-zinc-200 placeholder:text-zinc-600"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleCommit(); }}
                  />
                  <Button
                    className={`w-full mt-2 text-xs text-white ${amending ? "bg-orange-600 hover:bg-orange-500" : "bg-green-600 hover:bg-green-500"}`}
                    size="sm"
                    onClick={handleCommit}
                    disabled={!commitMessage.trim() || (!amending && repo.staged.length === 0) || !!loading}
                  >
                    {loading === "commit"
                      ? (amending ? "Amending…" : "Committing…")
                      : amending
                        ? "Amend Commit"
                        : `Commit${repo.staged.length > 0 ? ` (${repo.staged.length})` : ""}`
                    }
                  </Button>
                </div>
              </div>

              {/* Diff panel */}
              <div className="flex-1 min-w-0 bg-zinc-950/50 overflow-hidden flex flex-col">
                {selectedFile ? (
                  <>
                    <div className="px-4 py-2 border-b border-white/8 shrink-0">
                      <span className="text-xs font-mono text-zinc-400">{selectedFile.path}</span>
                      <span className="ml-2 text-xs text-zinc-600">
                        {selectedFile.staged ? "(staged)" : "(unstaged)"}
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <DiffViewer diff={diff} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-700 text-sm">
                    Select a file to view diff
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {tab === "history" && <CommitHistory repoPath={repo.path} onRefresh={onRefresh} />}

        {tab === "compare" && <BranchCompare repoPath={repo.path} currentBranch={repo.branch} />}

        {tab === "stash" && <StashPanel repoPath={repo.path} onRefresh={onRefresh} />}

        {tab === "tags" && <TagsPanel repoPath={repo.path} />}

        {tab === "remotes" && <RemotesPanel repoPath={repo.path} />}

        {tab === "tree" && <FileTreePanel repo={repo} onRefresh={onRefresh} />}
      </div>

      {fileHistoryPath && (
        <FileHistory
          repoPath={repo.path}
          filePath={fileHistoryPath}
          onClose={() => setFileHistoryPath(null)}
        />
      )}

      {showGitignore && (
        <GitignoreEditor
          repoPath={repo.path}
          repoName={repo.name}
          onClose={() => setShowGitignore(false)}
        />
      )}
    </div>
  );
}
