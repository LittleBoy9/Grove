import { useState, useEffect } from "react";
import { WorktreeInfo } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
}

export default function WorktreesPanel({ repoPath }: Props) {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [createBranch, setCreateBranch] = useState(false);

  useEffect(() => {
    load();
  }, [repoPath]);

  function load() {
    setLoading(true);
    api.listWorktrees(repoPath)
      .then(setWorktrees)
      .catch(() => setWorktrees([]))
      .finally(() => setLoading(false));
  }

  async function handleAdd() {
    if (!newPath.trim() || !newBranch.trim()) return;
    setActionLoading("add");
    setError(null);
    try {
      await api.addWorktree(repoPath, newPath.trim(), newBranch.trim(), createBranch);
      setNewPath("");
      setNewBranch("");
      setCreateBranch(false);
      setShowAdd(false);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(wtPath: string) {
    setActionLoading(`remove-${wtPath}`);
    setError(null);
    try {
      await api.removeWorktree(repoPath, wtPath);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePickPath() {
    const picked = await api.pickFolder();
    if (picked) setNewPath(picked);
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-14 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          Worktrees ({worktrees.length})
        </p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="text-xs px-3 py-1.5 bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 border border-white/8 rounded-lg transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add worktree"}
        </button>
      </div>

      {/* Add worktree form */}
      {showAdd && (
        <div className="shrink-0 bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-300">New worktree</p>
          <div className="flex gap-2">
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="Path (e.g. ../my-feature)"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20"
            />
            <button
              onClick={handlePickPath}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 border border-white/8 rounded-lg transition-colors"
              title="Browse"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </button>
          </div>
          <input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Branch name"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={createBranch}
                onChange={(e) => setCreateBranch(e.target.checked)}
                className="accent-blue-500"
              />
              Create new branch (-b)
            </label>
            <button
              onClick={handleAdd}
              disabled={!newPath.trim() || !newBranch.trim() || !!actionLoading}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40 transition-colors"
            >
              {actionLoading === "add" ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 shrink-0">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {/* Worktree list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {worktrees.map((wt) => (
          <div
            key={wt.path}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
              wt.is_main
                ? "bg-blue-500/8 border-blue-500/15"
                : "bg-white/5 border-white/5"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {wt.is_main ? (
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium truncate ${wt.is_main ? "text-blue-300" : "text-zinc-200"}`}>
                  {wt.branch || "(detached)"}
                </span>
                {wt.is_main && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    main
                  </span>
                )}
                {wt.is_locked && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">
                    locked
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 font-mono truncate mt-0.5">{wt.path}</p>
              {wt.commit && (
                <p className="text-[10px] text-zinc-700 font-mono mt-0.5">{wt.commit}</p>
              )}
            </div>
            {!wt.is_main && (
              <button
                onClick={() => handleRemove(wt.path)}
                disabled={!!actionLoading || wt.is_locked}
                className="shrink-0 p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                title="Remove worktree"
              >
                {actionLoading === `remove-${wt.path}` ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
