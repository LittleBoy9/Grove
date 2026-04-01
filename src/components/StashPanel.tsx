import { useState, useEffect } from "react";
import { StashEntry } from "../types";
import { api } from "../api";
import DiffViewer from "./DiffViewer";

interface Props {
  repoPath: string;
  onRefresh: () => void;
}

export default function StashPanel({ repoPath, onRefresh }: Props) {
  const [stashes, setStashes] = useState<StashEntry[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [previewDiff, setPreviewDiff] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadStashes();
  }, [repoPath]);

  function loadStashes() {
    api.listStashes(repoPath).then(setStashes).catch(() => setStashes([]));
  }

  async function handleSave() {
    setLoading("save");
    setError(null);
    try {
      await api.stashSave(repoPath, message);
      setMessage("");
      loadStashes();
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handlePop() {
    setLoading("pop");
    setError(null);
    try {
      await api.stashPop(repoPath);
      loadStashes();
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleApply(index: number) {
    setLoading(`apply-${index}`);
    setError(null);
    try {
      await api.stashApply(repoPath, index);
      loadStashes();
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleDrop(index: number) {
    setLoading(`drop-${index}`);
    setError(null);
    try {
      await api.stashDrop(repoPath, index);
      if (expandedIndex === index) { setExpandedIndex(null); setPreviewDiff(""); }
      loadStashes();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  async function togglePreview(index: number) {
    if (expandedIndex === index) {
      setExpandedIndex(null);
      setPreviewDiff("");
      return;
    }
    setExpandedIndex(index);
    setPreviewDiff("");
    setPreviewLoading(true);
    try {
      const diff = await api.stashDiff(repoPath, index);
      setPreviewDiff(diff);
    } catch {
      setPreviewDiff("");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Save stash */}
      <div className="shrink-0">
        <p className="text-xs text-zinc-500 font-medium mb-2 uppercase tracking-wider">Save current changes</p>
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Stash message (optional)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20"
          />
          <button
            onClick={handleSave}
            disabled={!!loading}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded-lg disabled:opacity-40 transition-colors shrink-0"
          >
            {loading === "save" ? "Saving…" : "Stash"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 shrink-0">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {/* Stash list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
            Stashes ({stashes.length})
          </p>
          {stashes.length > 0 && (
            <button
              onClick={handlePop}
              disabled={!!loading}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40"
            >
              {loading === "pop" ? "Popping…" : "Pop latest"}
            </button>
          )}
        </div>

        {stashes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-700">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span className="text-sm">No stashes</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {stashes.map((stash) => (
              <div
                key={stash.index}
                className="bg-white/5 rounded-xl border border-white/5 overflow-hidden"
              >
                {/* Header row */}
                <div className="flex items-center gap-3 px-3 py-2.5 group">
                  <button
                    onClick={() => togglePreview(stash.index)}
                    className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Preview diff"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${expandedIndex === stash.index ? "rotate-90" : ""}`}
                      viewBox="0 0 24 24" fill="currentColor"
                    >
                      <path d="M8 5l8 7-8 7V5z" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{stash.message}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">stash@{"{" + stash.index + "}"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleApply(stash.index)}
                      disabled={!!loading}
                      className="text-[11px] px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/8 rounded transition-colors disabled:opacity-40"
                      title="Apply (keep stash)"
                    >
                      {loading === `apply-${stash.index}` ? "…" : "Apply"}
                    </button>
                    <button
                      onClick={() => handleDrop(stash.index)}
                      disabled={!!loading}
                      className="text-[11px] px-2 py-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-40"
                      title="Drop stash"
                    >
                      {loading === `drop-${stash.index}` ? "…" : "Drop"}
                    </button>
                  </div>
                </div>
                {/* Preview diff */}
                {expandedIndex === stash.index && (
                  <div className="border-t border-white/8 max-h-64 overflow-auto">
                    {previewLoading ? (
                      <div className="p-4 space-y-1.5 animate-pulse">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className={`h-3 rounded ${i % 3 === 0 ? "bg-green-900/30 w-4/5" : i % 3 === 1 ? "bg-red-900/25 w-3/5" : "bg-zinc-800/60 w-full"}`} />
                        ))}
                      </div>
                    ) : previewDiff ? (
                      <DiffViewer diff={previewDiff} />
                    ) : (
                      <p className="p-4 text-xs text-zinc-600">No diff available</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
