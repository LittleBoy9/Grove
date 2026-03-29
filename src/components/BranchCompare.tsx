import { useState, useEffect } from "react";
import { BranchInfo } from "../types";
import { api } from "../api";
import DiffViewer from "./DiffViewer";

interface Props {
  repoPath: string;
  currentBranch: string;
}

export default function BranchCompare({ repoPath, currentBranch }: Props) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [base, setBase] = useState("");
  const [compare, setCompare] = useState(currentBranch);
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBranches(repoPath).then(setBranches).catch(() => {});
  }, [repoPath]);

  // Default base to main/master when branches load
  useEffect(() => {
    if (branches.length === 0 || base) return;
    const mainBranch = branches.find(
      (b) => b.name === "main" || b.name === "master"
    );
    setBase(mainBranch?.name ?? branches[0]?.name ?? "");
  }, [branches, base]);

  // Reset compare when repo changes
  useEffect(() => {
    setCompare(currentBranch);
    setBase("");
    setDiff(null);
    setError(null);
  }, [repoPath, currentBranch]);

  async function handleCompare() {
    if (!base || !compare || base === compare) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getBranchDiff(repoPath, base, compare);
      setDiff(result || "");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Controls */}
      <div className="px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs text-zinc-500 shrink-0">Base</label>
            <select
              value={base}
              onChange={(e) => { setBase(e.target.value); setDiff(null); }}
              className="flex-1 min-w-0 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-white/20"
            >
              {localBranches.length > 0 && (
                <optgroup label="Local">
                  {localBranches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </optgroup>
              )}
              {remoteBranches.length > 0 && (
                <optgroup label="Remote">
                  {remoteBranches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <svg className="w-4 h-4 text-zinc-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
          </svg>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs text-zinc-500 shrink-0">Compare</label>
            <select
              value={compare}
              onChange={(e) => { setCompare(e.target.value); setDiff(null); }}
              className="flex-1 min-w-0 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-white/20"
            >
              {localBranches.length > 0 && (
                <optgroup label="Local">
                  {localBranches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </optgroup>
              )}
              {remoteBranches.length > 0 && (
                <optgroup label="Remote">
                  {remoteBranches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={!base || !compare || base === compare || loading}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40 transition-colors shrink-0"
          >
            {loading ? "Comparing…" : "Compare"}
          </button>
        </div>

        {base === compare && base && (
          <p className="text-xs text-zinc-600 mt-2">Select two different branches to compare.</p>
        )}
      </div>

      {/* Diff area */}
      <div className="flex-1 min-h-0 overflow-auto">
        {error && (
          <div className="m-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}
        {diff === null && !error && (
          <div className="flex items-center justify-center h-full text-zinc-700 text-sm">
            Select branches and click Compare
          </div>
        )}
        {diff !== null && !error && (
          diff === "" ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              No differences between <span className="font-mono mx-1">{base}</span> and <span className="font-mono mx-1">{compare}</span>
            </div>
          ) : (
            <DiffViewer diff={diff} />
          )
        )}
      </div>
    </div>
  );
}
