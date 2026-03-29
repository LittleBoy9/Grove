import { useState, useEffect } from "react";
import { CommitInfo } from "../types";
import { api } from "../api";
import { ScrollArea } from "./ui/scroll-area";
import { timeAgo } from "../lib/time";

interface Props {
  repoPath: string;
  filePath: string;
  onClose: () => void;
}

export default function FileHistory({ repoPath, filePath, onClose }: Props) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [diff, setDiff] = useState("");
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getFileLog(repoPath, filePath, 50)
      .then(setCommits)
      .catch(() => setCommits([]))
      .finally(() => setLoading(false));
  }, [repoPath, filePath]);

  useEffect(() => {
    if (!selectedCommit) return;
    setDiffLoading(true);
    api.getCommitDiff(repoPath, selectedCommit)
      .then(setDiff)
      .catch(() => setDiff(""))
      .finally(() => setDiffLoading(false));
  }, [selectedCommit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[820px] max-w-[95vw] h-[560px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">File History</h2>
            <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">{filePath}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 ml-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Commit list */}
          <div className="w-72 shrink-0 border-r border-white/8 flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-zinc-600 text-sm">
                Loading…
              </div>
            ) : commits.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-zinc-600 text-sm">
                No history found
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2">
                  {commits.map((c) => (
                    <button
                      key={c.hash}
                      onClick={() => setSelectedCommit(c.hash)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors
                        ${selectedCommit === c.hash ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[11px] text-zinc-500 shrink-0">{c.short_hash}</span>
                        <span className="text-[11px] text-zinc-500 shrink-0 ml-auto">{timeAgo(c.timestamp)}</span>
                      </div>
                      <p className="text-xs text-zinc-300 truncate">{c.message}</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">{c.author}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Diff panel */}
          <div className="flex-1 min-w-0 bg-zinc-950/50 overflow-hidden flex flex-col">
            {selectedCommit ? (
              diffLoading ? (
                <div className="flex items-center justify-center flex-1 text-zinc-600 text-sm">
                  Loading diff…
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0">
                  <pre className="text-[11px] font-mono p-4 whitespace-pre-wrap leading-relaxed">
                    {diff.split("\n").map((line, i) => {
                      let cls = "text-zinc-400";
                      if (line.startsWith("+") && !line.startsWith("+++")) cls = "text-green-400";
                      else if (line.startsWith("-") && !line.startsWith("---")) cls = "text-red-400";
                      else if (line.startsWith("@@")) cls = "text-blue-400";
                      else if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) cls = "text-zinc-500";
                      return <span key={i} className={`block ${cls}`}>{line || "\u00a0"}</span>;
                    })}
                  </pre>
                </ScrollArea>
              )
            ) : (
              <div className="flex items-center justify-center flex-1 text-zinc-700 text-sm">
                Select a commit to view changes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
