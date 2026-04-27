import { useState } from "react";
import { api } from "../api";
import { loadSettings } from "../lib/settings";
import { generateStandupSummary } from "../lib/ai";
import { CommitInfo } from "../types";

interface Props {
  repoPaths: string[];
  repoNames: Map<string, string>;
  onClose: () => void;
}

type Range = "today" | "yesterday" | "week";

function rangeStart(r: Range): number {
  const now = new Date();
  if (r === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  }
  if (r === "yesterday") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime() / 1000;
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime() / 1000;
}

function rangeEnd(r: Range): number {
  const now = new Date();
  if (r === "yesterday") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  }
  return Date.now() / 1000;
}

export default function StandupModal({ repoPaths, repoNames, onClose }: Props) {
  const [range, setRange] = useState<Range>("today");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setSummary("");
    try {
      const settings = loadSettings();
      const start = rangeStart(range);
      const end = rangeEnd(range);

      const repoCommits: { repoName: string; commits: { message: string; author: string }[] }[] = [];

      await Promise.all(
        repoPaths.map(async (path) => {
          try {
            const commits: CommitInfo[] = await api.getLog(path, 200);
            const filtered = commits.filter((c) => c.timestamp >= start && c.timestamp <= end);
            repoCommits.push({
              repoName: repoNames.get(path) ?? path.split("/").pop() ?? path,
              commits: filtered.map((c) => ({ message: c.message, author: c.author })),
            });
          } catch {
            // skip repos that fail
          }
        })
      );

      const result = await generateStandupSummary(repoCommits, settings);
      setSummary(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Standup Summary</p>
              <p className="text-[11px] text-zinc-500">AI-generated from your commits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/8 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Range picker */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-[11px] text-zinc-500 mb-2 font-medium uppercase tracking-wider">Time range</p>
          <div className="flex gap-2">
            {(["today", "yesterday", "week"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${range === r
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-white/3 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/8"
                  }`}
              >
                {r === "today" ? "Today" : r === "yesterday" ? "Yesterday" : "Last 7 days"}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div className="px-5 pb-4">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-semibold hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <span>✨</span>
                Generate standup
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {summary && (
          <div className="mx-5 mb-5 flex flex-col gap-2">
            <div className="px-4 py-3.5 bg-white/3 border border-white/8 rounded-xl text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {summary}
            </div>
            <button
              onClick={handleCopy}
              className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/8 border border-white/5 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copy to clipboard
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
