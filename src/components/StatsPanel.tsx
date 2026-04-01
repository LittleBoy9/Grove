import { useState, useEffect } from "react";
import { RepoStats } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StatsPanel({ repoPath }: Props) {
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getRepoStats(repoPath)
      .then(setStats)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [repoPath]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-24 bg-zinc-800 rounded-xl" />
        <div className="h-40 bg-zinc-800 rounded-xl" />
        <div className="h-32 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">{error}</div>
    );
  }

  if (!stats) return null;

  const maxDaily = Math.max(...stats.daily_commits.map(([, c]) => c), 1);
  const maxAuthor = Math.max(...stats.authors.map((a) => a.commits), 1);

  // Fill in missing dates for the last 30 days
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const allDays: [string, number][] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = stats.daily_commits.find(([date]) => date === key);
    allDays.push([key, found ? found[1] : 0]);
  }

  const last30Total = allDays.reduce((sum, [, c]) => sum + c, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Total commits</p>
          <p className="text-2xl font-bold text-white tabular-nums">{stats.total_commits.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">all branches</p>
        </div>
        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Contributors</p>
          <p className="text-2xl font-bold text-white tabular-nums">{stats.authors.length}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">unique authors</p>
        </div>
        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Last 30 days</p>
          <p className="text-2xl font-bold text-white tabular-nums">{last30Total}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">commits</p>
        </div>
      </div>

      {/* Commit frequency chart */}
      <div className="shrink-0">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Commit activity — last 30 days
        </p>
        <div className="bg-white/3 border border-white/8 rounded-xl p-4 relative">
          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute top-2 z-10 px-2.5 py-1.5 bg-zinc-800 border border-white/10 rounded-lg shadow-xl text-[11px] text-zinc-200 whitespace-nowrap pointer-events-none"
              style={{ left: `clamp(60px, ${tooltip.x}px, calc(100% - 60px))`, transform: "translateX(-50%)" }}
            >
              <span className="text-zinc-400">{formatDate(tooltip.date)}: </span>
              <span className="font-semibold">{tooltip.count} commit{tooltip.count !== 1 ? "s" : ""}</span>
            </div>
          )}

          <div className="flex items-end gap-1 h-20">
            {allDays.map(([date, count], idx) => {
              const height = count === 0 ? 2 : Math.max(6, Math.round((count / maxDaily) * 72));
              const isToday = date === todayKey;
              return (
                <div
                  key={date}
                  className="flex-1 flex flex-col items-center cursor-default"
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const parentRect = (e.currentTarget as HTMLElement).closest(".relative")!.getBoundingClientRect();
                    setTooltip({ date, count, x: rect.left - parentRect.left + rect.width / 2 });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div
                    className={`w-full rounded-sm transition-colors ${
                      count === 0
                        ? "bg-zinc-800"
                        : isToday
                        ? "bg-blue-400 hover:bg-blue-300"
                        : "bg-green-500/70 hover:bg-green-400"
                    }`}
                    style={{ height }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels — show full month+day */}
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-zinc-600">{formatDateShort(allDays[0][0])}</span>
            <span className="text-[10px] text-zinc-600">{formatDateShort(allDays[14][0])}</span>
            <span className="text-[10px] text-zinc-600">today</span>
          </div>
        </div>
      </div>

      {/* Top contributors */}
      {stats.authors.length > 0 && (
        <div className="shrink-0">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Top contributors
          </p>
          <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
            {stats.authors.map((author, i) => {
              const pct = Math.round((author.commits / maxAuthor) * 100);
              const shareOfTotal = stats.total_commits > 0
                ? Math.round((author.commits / stats.total_commits) * 100)
                : 0;
              return (
                <div
                  key={author.name}
                  className={`px-4 py-3 ${i < stats.authors.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                      {author.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-200 flex-1 truncate">{author.name}</span>
                    <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                      {author.commits} <span className="text-zinc-600">({shareOfTotal}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
