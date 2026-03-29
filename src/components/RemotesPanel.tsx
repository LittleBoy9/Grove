import { useState, useEffect } from "react";
import { RemoteInfo } from "../types";
import { api } from "../api";

// Convert any git remote URL to a https:// browser URL
function remoteToWebUrl(url: string): string | null {
  url = url.trim();

  // Already https — strip .git suffix
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return url.replace(/\.git$/, "");
  }

  // SSH shorthand: git@github.com:user/repo.git
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  // git:// protocol
  const gitMatch = url.match(/^git:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (gitMatch) {
    return `https://${gitMatch[1]}/${gitMatch[2]}`;
  }

  return null;
}

function hostIcon(url: string): "github" | "gitlab" | "bitbucket" | "azure" | "generic" {
  if (/github\.com/i.test(url)) return "github";
  if (/gitlab\.com/i.test(url)) return "gitlab";
  if (/bitbucket\.org/i.test(url)) return "bitbucket";
  if (/dev\.azure\.com|visualstudio\.com/i.test(url)) return "azure";
  return "generic";
}

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
          {remotes.map((remote) => {
            const webUrl = remoteToWebUrl(remote.url);
            const icon = hostIcon(remote.url);
            return (
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

                  <div className="ml-auto flex items-center gap-1">
                    {/* Open in browser */}
                    {webUrl && (
                      <button
                        onClick={() => api.openUrl(webUrl)}
                        title={`Open on ${icon === "generic" ? "remote" : icon.charAt(0).toUpperCase() + icon.slice(1)}`}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all"
                      >
                        <HostIcon kind={icon} />
                        <span>Open</span>
                        <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </button>
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(remote.name)}
                      disabled={!!actionLoading}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Remove remote"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono break-all">{remote.url}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HostIcon({ kind }: { kind: "github" | "gitlab" | "bitbucket" | "azure" | "generic" }) {
  if (kind === "github") {
    return (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }
  if (kind === "gitlab") {
    return (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
      </svg>
    );
  }
  if (kind === "bitbucket") {
    return (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" />
      </svg>
    );
  }
  if (kind === "azure") {
    return (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.92 2l-6.05 10.26L2 18.5h5.1l4.81-6.34L7.4 18.5H22L11.92 2z" />
      </svg>
    );
  }
  // Generic: globe icon
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}
