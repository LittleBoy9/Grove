import { useState, useEffect, useRef } from "react";
import { BranchInfo } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
  currentBranch: string;
  onBranchChange: () => void;
}

export default function BranchSwitcher({ repoPath, currentBranch, onBranchChange }: Props) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setError(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    if (!open) {
      api.listBranches(repoPath).then(setBranches).catch(() => {});
    }
    setOpen((v) => !v);
    setCreating(false);
    setError(null);
  }

  async function handleCheckout(branch: BranchInfo) {
    setLoading(branch.name);
    setError(null);
    try {
      await api.checkoutBranch(repoPath, branch.name);
      setOpen(false);
      onBranchChange();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleCreate() {
    if (!newBranchName.trim()) return;
    setLoading("create");
    setError(null);
    try {
      await api.createBranch(repoPath, newBranchName.trim());
      setNewBranchName("");
      setCreating(false);
      setOpen(false);
      onBranchChange();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(branch: BranchInfo, e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(`del-${branch.name}`);
    setError(null);
    try {
      await api.deleteBranch(repoPath, branch.name);
      setBranches((prev) => prev.filter((b) => b.name !== branch.name));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleForceDelete(branch: BranchInfo) {
    setLoading(`del-${branch.name}`);
    setError(null);
    try {
      await api.forceDeleteBranch(repoPath, branch.name);
      setBranches((prev) => prev.filter((b) => b.name !== branch.name));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleMerge(branch: BranchInfo) {
    setLoading(`merge-${branch.name}`);
    setError(null);
    try {
      await api.mergeBranch(repoPath, branch.name);
      setOpen(false);
      onBranchChange();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleRebase(branch: BranchInfo) {
    setLoading(`rebase-${branch.name}`);
    setError(null);
    try {
      await api.rebaseBranch(repoPath, branch.name);
      setOpen(false);
      onBranchChange();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/8 transition-colors group"
      >
        <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM4.25 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z" />
        </svg>
        <span>{currentBranch}</span>
        <svg className="w-3 h-3 opacity-40 group-hover:opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {creating ? (
            <div className="p-2 border-b border-white/8">
              <input
                autoFocus
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="branch-name"
                className="w-full bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-white/20"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={handleCreate}
                  disabled={!newBranchName.trim() || loading === "create"}
                  className="flex-1 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md disabled:opacity-40"
                >
                  {loading === "create" ? "Creating…" : "Create & checkout"}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-b border-white/8 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New branch
            </button>
          )}

          {error && (
            <div className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border-b border-red-500/20">
              {error}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto py-1">
            {localBranches.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] text-zinc-600 uppercase tracking-wider">Local</div>
                {localBranches.map((b) => (
                  <BranchRow
                    key={b.name}
                    branch={b}
                    loading={loading}
                    onCheckout={handleCheckout}
                    onDelete={handleDelete}
                    onForceDelete={handleForceDelete}
                    onMerge={handleMerge}
                    onRebase={handleRebase}
                  />
                ))}
              </>
            )}
            {remoteBranches.length > 0 && (
              <>
                <div className="px-3 py-1 mt-1 text-[10px] text-zinc-600 uppercase tracking-wider border-t border-white/5 pt-2">Remote</div>
                {remoteBranches.map((b) => (
                  <BranchRow
                    key={b.name}
                    branch={b}
                    loading={loading}
                    onCheckout={handleCheckout}
                    onDelete={handleDelete}
                    onForceDelete={handleForceDelete}
                    onMerge={handleMerge}
                    onRebase={handleRebase}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BranchRow({
  branch,
  loading,
  onCheckout,
  onDelete,
  onForceDelete,
  onMerge,
  onRebase,
}: {
  branch: BranchInfo;
  loading: string | null;
  onCheckout: (b: BranchInfo) => void;
  onDelete: (b: BranchInfo, e: React.MouseEvent) => void;
  onForceDelete: (b: BranchInfo) => void;
  onMerge: (b: BranchInfo) => void;
  onRebase: (b: BranchInfo) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isLoading = loading === branch.name || loading === `del-${branch.name}` || loading === `merge-${branch.name}` || loading === `rebase-${branch.name}`;

  return (
    <div
      onClick={() => !branch.is_current && !menuOpen && onCheckout(branch)}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm group transition-colors relative
        ${branch.is_current
          ? "text-green-400 cursor-default"
          : "text-zinc-300 hover:bg-white/5 cursor-pointer"
        }`}
    >
      {branch.is_current ? (
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span className="w-3 h-3 shrink-0" />
      )}
      <span className="truncate flex-1 text-xs font-mono">{branch.name}</span>

      {isLoading && <span className="text-[10px] text-zinc-500">working…</span>}

      {!branch.is_current && !isLoading && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* context menu */}
          <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all"
              title="More actions"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-zinc-800 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1">
                {!branch.is_remote && (
                  <>
                    <button
                      onClick={() => { setMenuOpen(false); onMerge(branch); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218zm1.55 5.596a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0zm5.25-2.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zM4.25 5.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"/>
                      </svg>
                      Merge into current
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onRebase(branch); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      Rebase onto current
                    </button>
                    <div className="my-1 border-t border-white/5" />
                    <button
                      onClick={() => { setMenuOpen(false); onForceDelete(branch); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Force delete (-D)
                    </button>
                  </>
                )}
                {branch.is_remote && (
                  <button
                    onClick={() => { setMenuOpen(false); onMerge(branch); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218zm1.55 5.596a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0zm5.25-2.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zM4.25 5.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"/>
                    </svg>
                    Merge into current
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Safe delete x */}
          {!branch.is_remote && (
            <button
              onClick={(e) => onDelete(branch, e)}
              className="p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete branch (safe)"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
