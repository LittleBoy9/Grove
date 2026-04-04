import { useState } from "react";

interface Props {
  repoName: string;
  repoPath: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteRepoModal({ repoName, repoPath, onConfirm, onCancel }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const matches = input === repoName;

  async function handleDelete() {
    if (!matches || loading) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-red-500/20 rounded-2xl w-110 shadow-2xl p-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Delete repository from disk</h2>
            <p className="text-xs text-zinc-500 mt-0.5">This action is permanent and cannot be undone</p>
          </div>
        </div>

        {/* Warning box */}
        <div className="bg-red-500/8 border border-red-500/20 rounded-lg px-4 py-3 mb-5 text-xs text-red-300 leading-relaxed">
          The folder <span className="font-mono bg-red-500/15 px-1 rounded">{repoPath}</span> will be permanently deleted from your machine. The remote repository (if any) will not be affected.
        </div>

        {/* Confirm input */}
        <div className="mb-5">
          <label className="block text-xs text-zinc-400 mb-2">
            Type <span className="font-mono font-semibold text-white">{repoName}</span> to confirm
          </label>
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); if (e.key === "Escape") onCancel(); }}
            placeholder={repoName}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-500/50 transition-colors font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!matches || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              enabled:bg-red-600 enabled:hover:bg-red-500 enabled:text-white"
          >
            {loading ? "Deleting…" : "Delete from disk"}
          </button>
        </div>
      </div>
    </div>
  );
}
