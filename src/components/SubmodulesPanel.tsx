import { useState, useEffect } from "react";
import { SubmoduleInfo } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
}

const statusColor: Record<string, string> = {
  clean: "text-green-400",
  modified: "text-yellow-400",
  uninitialized: "text-zinc-500",
  conflict: "text-red-400",
};

const statusLabel: Record<string, string> = {
  clean: "clean",
  modified: "modified",
  uninitialized: "not init",
  conflict: "conflict",
};

export default function SubmodulesPanel({ repoPath }: Props) {
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [repoPath]);

  function load() {
    setLoading(true);
    api.listSubmodules(repoPath)
      .then(setSubmodules)
      .catch(() => setSubmodules([]))
      .finally(() => setLoading(false));
  }

  async function handleUpdateAll() {
    setActionLoading("update-all");
    setError(null);
    setSuccess(null);
    try {
      await api.updateSubmodules(repoPath);
      setSuccess("All submodules updated.");
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          Submodules ({submodules.length})
        </p>
        {submodules.length > 0 && (
          <button
            onClick={handleUpdateAll}
            disabled={!!actionLoading}
            className="text-xs px-3 py-1.5 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-40"
          >
            {actionLoading === "update-all" ? "Updating…" : "↺ Update all"}
          </button>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 shrink-0">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 shrink-0">
          {success}
          <button className="ml-2 underline" onClick={() => setSuccess(null)}>dismiss</button>
        </div>
      )}

      {submodules.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-zinc-600">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-sm">No submodules</p>
          <p className="text-xs text-zinc-700">Submodules defined in .gitmodules will appear here</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          {submodules.map((sub) => (
            <div
              key={sub.path}
              className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5"
            >
              {/* Icon */}
              <div className="shrink-0">
                <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{sub.name}</p>
                <p className="text-[10px] text-zinc-600 font-mono truncate mt-0.5">{sub.path}</p>
              </div>
              {/* Commit */}
              <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                {sub.commit.slice(0, 7)}
              </span>
              {/* Status */}
              <span className={`text-[10px] font-medium shrink-0 ${statusColor[sub.status] || "text-zinc-500"}`}>
                {statusLabel[sub.status] || sub.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
