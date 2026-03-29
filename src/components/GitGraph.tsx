import { useMemo, useState, useRef, useEffect } from "react";
import { GraphCommitInfo } from "../types";
import { computeLayout, LayoutCommit, parseRefs, ParsedRef } from "../lib/graphLayout";
import { timeAgo } from "../lib/time";

const ROW_H = 38;
const LANE_W = 14;
const DOT_R = 3.5;
const LINE_W = 1.5;

interface Props {
  commits: GraphCommitInfo[];
  selectedHash: string | null;
  actionLoading: string | null;
  onSelect: (c: GraphCommitInfo) => void;
  onRevert: (hash: string) => void;
  onCherryPick: (hash: string) => void;
}

export default function GitGraph({
  commits,
  selectedHash,
  actionLoading,
  onSelect,
  onRevert,
  onCherryPick,
}: Props) {
  const layout = useMemo(() => computeLayout(commits), [commits]);
  const maxLanes = useMemo(
    () => Math.max(...layout.map((c) => c.totalLanes), 1),
    [layout]
  );
  // +1 lane of padding on the right so curves don't clip
  const graphW = (maxLanes + 1) * LANE_W;

  if (layout.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-xs">
        No commits found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {layout.map((commit) => (
        <GraphRow
          key={commit.hash}
          commit={commit}
          graphW={graphW}
          selected={selectedHash === commit.hash}
          actionLoading={actionLoading}
          onSelect={onSelect}
          onRevert={onRevert}
          onCherryPick={onCherryPick}
        />
      ))}
    </div>
  );
}

function GraphRow({
  commit,
  graphW,
  selected,
  actionLoading,
  onSelect,
  onRevert,
  onCherryPick,
}: {
  commit: LayoutCommit;
  graphW: number;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (c: GraphCommitInfo) => void;
  onRevert: (hash: string) => void;
  onCherryPick: (hash: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActing =
    actionLoading === `revert-${commit.hash}` ||
    actionLoading === `pick-${commit.hash}`;
  const isMerge = commit.parents.length > 1;
  const parsedRefs = useMemo(() => parseRefs(commit.refs), [commit.refs]);

  const mid = ROW_H / 2;
  const myX = commit.lane * LANE_W + LANE_W / 2;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      onClick={() => !menuOpen && onSelect(commit)}
      className={`flex items-stretch cursor-pointer border-b border-white/4 transition-colors group relative select-none
        ${selected ? "bg-white/10" : "hover:bg-white/5"}`}
      style={{ height: ROW_H }}
    >
      {/* Graph SVG column */}
      <svg
        width={graphW}
        height={ROW_H}
        className="shrink-0"
        style={{ overflow: "visible" }}
      >
        {/* Pass-through and curve segments */}
        {commit.segments.map((seg, i) => {
          const x1 = seg.fromLane * LANE_W + LANE_W / 2;
          const x2 = seg.toLane * LANE_W + LANE_W / 2;

          if (seg.fromLane === seg.toLane) {
            // Straight vertical pass-through (not myLane — those are handled below)
            return (
              <line
                key={i}
                x1={x1}
                y1={0}
                x2={x1}
                y2={ROW_H}
                stroke={seg.color}
                strokeWidth={LINE_W}
                strokeOpacity={0.75}
              />
            );
          }

          // Bezier curve: originates at dot (myLane mid-row) and fans out to target lane at bottom
          const cp1y = mid + (ROW_H - mid) * 0.55;
          const cp2y = mid + (ROW_H - mid) * 0.55;
          return (
            <path
              key={i}
              d={`M ${x1} ${mid} C ${x1} ${cp1y} ${x2} ${cp2y} ${x2} ${ROW_H}`}
              stroke={seg.color}
              strokeWidth={LINE_W}
              strokeOpacity={0.75}
              fill="none"
            />
          );
        })}

        {/* Commit's incoming vertical (top of row → just above dot) */}
        {commit.topLine && (
          <line
            x1={myX}
            y1={0}
            x2={myX}
            y2={mid - DOT_R - 1}
            stroke={commit.color}
            strokeWidth={LINE_W}
          />
        )}

        {/* Commit's outgoing vertical (just below dot → bottom of row) */}
        {commit.bottomLine && (
          <line
            x1={myX}
            y1={mid + DOT_R + 1}
            x2={myX}
            y2={ROW_H}
            stroke={commit.color}
            strokeWidth={LINE_W}
          />
        )}

        {/* Commit dot */}
        {isMerge ? (
          // Merge commit: outlined ring
          <>
            <circle
              cx={myX}
              cy={mid}
              r={DOT_R + 1.5}
              fill={selected ? commit.color + "30" : "transparent"}
              stroke={commit.color}
              strokeWidth={1.5}
            />
            <circle cx={myX} cy={mid} r={1.5} fill={commit.color} />
          </>
        ) : (
          // Regular commit: solid dot with soft glow
          <>
            <circle
              cx={myX}
              cy={mid}
              r={DOT_R + 2.5}
              fill={commit.color}
              opacity={selected ? 0.25 : 0.12}
            />
            <circle cx={myX} cy={mid} r={DOT_R} fill={commit.color} />
          </>
        )}
      </svg>

      {/* Commit text */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-2 pr-8 gap-0.5">
        {/* Top line: ref pills + message */}
        <div className="flex items-center gap-1 min-w-0">
          {parsedRefs.map((ref, ri) => (
            <RefPill key={ri} ref_={ref} />
          ))}
          <p className="text-xs text-zinc-200 truncate leading-tight flex-1">
            {commit.message}
          </p>
        </div>
        {/* Bottom line: hash · author · time */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(commit.hash);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            title="Copy full hash"
            className="font-mono text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
          >
            {copied ? "✓ copied" : commit.short_hash}
          </button>
          <span className="text-[10px] text-zinc-600 truncate">
            {commit.author}
          </span>
          <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
            {timeAgo(commit.timestamp)}
          </span>
        </div>
      </div>

      {/* Context menu trigger */}
      <div
        ref={menuRef}
        className="absolute right-2 top-1/2 -translate-y-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        {isActing ? (
          <span className="text-[10px] text-zinc-500">working…</span>
        ) : (
          <>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all"
              title="More actions"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-zinc-800 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRevert(commit.hash);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors"
                >
                  Revert commit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onCherryPick(commit.hash);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/8 transition-colors"
                >
                  Cherry-pick
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Ref pill styles by kind
const REF_STYLES: Record<ParsedRef["kind"], string> = {
  head: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  local: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  remote: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  tag: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

function RefPill({ ref_ }: { ref_: ParsedRef }) {
  return (
    <span
      className={`inline-flex items-center shrink-0 px-1.5 py-px text-[9px] font-medium rounded border leading-none ${REF_STYLES[ref_.kind]}`}
    >
      {ref_.label}
    </span>
  );
}
