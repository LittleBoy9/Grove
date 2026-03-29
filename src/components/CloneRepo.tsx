import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { notify } from "../lib/notify";

interface Props {
  onClose: () => void;
  onCloned: (repoPath: string) => void;
}

export default function CloneRepo({ onClose, onCloned }: Props) {
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlRef.current?.focus();
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  async function handlePickDestination() {
    const folder = await api.pickFolder();
    if (folder) setDestination(folder);
  }

  function inferRepoName(repoUrl: string): string {
    const trimmed = repoUrl.trim().replace(/\.git$/, "");
    return trimmed.split("/").pop() ?? "repo";
  }

  async function handleClone() {
    const trimUrl = url.trim();
    const trimDest = destination.trim();
    if (!trimUrl || !trimDest) return;

    const repoName = inferRepoName(trimUrl);
    const fullDest = trimDest.endsWith(repoName)
      ? trimDest
      : `${trimDest}/${repoName}`;

    setLoading(true);
    setError(null);
    try {
      await api.cloneRepo(trimUrl, fullDest);
      await notify("Clone complete", `Cloned into ${fullDest}`);
      onCloned(fullDest);
      onClose();
    } catch (e) {
      const msg = String(e);
      setError(msg);
      await notify("Clone failed", msg.slice(0, 80));
    } finally {
      setLoading(false);
    }
  }

  const repoName = url.trim() ? inferRepoName(url) : "";
  const fullDest = destination && repoName
    ? (destination.endsWith(repoName) ? destination : `${destination}/${repoName}`)
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={ref}
        className="w-[480px] bg-zinc-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Clone Repository</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* URL */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Repository URL
            </label>
            <input
              ref={urlRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 font-mono"
              onKeyDown={(e) => { if (e.key === "Enter") handleClone(); }}
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Clone into folder
            </label>
            <div className="flex gap-2">
              <div
                onClick={handlePickDestination}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs cursor-pointer hover:bg-white/8 hover:border-white/15 transition-colors"
              >
                <span className={destination ? "text-zinc-200 font-mono" : "text-zinc-600"}>
                  {destination || "Pick a folder…"}
                </span>
              </div>
              <button
                onClick={handlePickDestination}
                className="px-3 py-2 text-xs text-zinc-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors shrink-0"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Preview */}
          {fullDest && (
            <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/8">
              <p className="text-[11px] text-zinc-500 mb-0.5">Will clone into:</p>
              <p className="text-xs font-mono text-zinc-300 break-all">{fullDest}</p>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/8 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={!url.trim() || !destination.trim() || loading}
            className="flex-1 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Cloning…" : "Clone"}
          </button>
        </div>
      </div>
    </div>
  );
}
