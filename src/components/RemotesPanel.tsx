import { useState, useEffect } from "react";
import { RemoteInfo } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
}

export default function RemotesPanel({ repoPath }: Props) {
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("origin");
  const [newUrl, setNewUrl] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function loadRemotes() {
    setLoading(true);
    api.listRemotes(repoPath).then(setRemotes).catch(() => setRemotes([])).finally(() => setLoading(false));
  }

  useEffect(() => { loadRemotes(); }, [repoPath]);

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return;
    setActionLoading("add");
    setError(null);
    try {
      await api.addRemote(repoPath, newName.trim(), newUrl.trim());
      setNewName("origin");
      setNewUrl("");
      setAdding(false);
      loadRemotes();
    } catch (e) { setError(String(e)); } finally { setActionLoading(null); }
  }

  async function handleRemove(name: string) {
    setActionLoading(`rm-${name}`);
    setError(null);
    try {
      await api.removeRemote(repoPath, name);
      setRemotes((prev) => prev.filter((r) => r.name !== name));
    } catch (e) { setError(String(e)); } finally { setActionLoading(null); }
  }

  async function handleRename(oldName: string) {
    if (!renameValue.trim() || renameValue.trim() === oldName) { setRenamingId(null); return; }
    setActionLoading(`rn-${oldName}`);
    setError(null);
    try {
      await api.renameRemote(repoPath, oldName, renameValue.trim());
      setRenamingId(null);
      loadRemotes();
    } catch (e) { setError(String(e)); } finally { setActionLoading(null); }
  }

  return (
    <div className="p-4 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Remotes ({remotes.length})</h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add remote
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/8 space-y-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Remote name (e.g. origin)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 font-mono"
            onKeyDown={(e) => { if (e.key === "Escape") setAdding(false); }}
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL (https://github.com/user/repo.git)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 font-mono"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || !newUrl.trim() || actionLoading === "add"}
              className="flex-1 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-40"
            >
              {actionLoading === "add" ? "Adding…" : "Add Remote"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-600 text-center py-8">Loading remotes…</div>
      ) : remotes.length === 0 ? (
        <div className="text-xs text-zinc-600 text-center py-8">No remotes configured</div>
      ) : (
        <div className="space-y-2">
          {remotes.map((remote) => (
            <div key={remote.name} className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 group">
              <div className="flex items-center gap-2 mb-0.5">
                {renamingId === remote.name ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(remote.name); if (e.key === "Escape") setRenamingId(null); }}
                    onBlur={() => handleRename(remote.name)}
                    className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-0.5 text-xs text-white font-mono outline-none"
                  />
                ) : (
                  <span
                    className="text-xs font-semibold text-zinc-200 font-mono cursor-pointer hover:text-white"
                    title="Click to rename"
                    onClick={() => { setRenamingId(remote.name); setRenameValue(remote.name); }}
                  >
                    {remote.name}
                  </span>
                )}
                <button
                  onClick={() => handleRemove(remote.name)}
                  disabled={!!actionLoading}
                  className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Remove remote"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono break-all">{remote.url}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
