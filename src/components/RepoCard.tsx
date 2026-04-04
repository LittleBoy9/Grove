import { RepoStatus } from "../types";
import { Badge } from "./ui/badge";
import { timeAgo } from "../lib/time";

interface Props {
  repo: RepoStatus;
  selected: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
  onSetGroup?: () => void;
  onDeleteFromDisk?: () => void;
  groupName?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragOver?: boolean;
}

export default function RepoCard({
  repo,
  selected,
  onClick,
  onRemove,
  onSetGroup,
  onDeleteFromDisk,
  groupName,
  isFavorite,
  onToggleFavorite,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: Props) {
  const totalChanges =
    repo.staged.length + repo.unstaged.length + repo.untracked.length;
  const isDirty = totalChanges > 0;
  const hasConflicts = [...repo.staged, ...repo.unstaged].some(
    (f) => f.status === "conflict"
  );

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative group ${isDragOver ? "border-t-2 border-blue-500/60" : ""}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
        className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 group/card cursor-pointer
          ${selected
            ? "bg-white/10 border-white/20 shadow-lg"
            : "bg-white/5 border-white/5 hover:bg-white/8 hover:border-white/10"
          }
          ${isDragOver ? "ring-1 ring-blue-500/40" : ""}
        `}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Favorite star */}
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={`shrink-0 transition-all ${
                  isFavorite
                    ? "opacity-100 text-amber-400"
                    : "opacity-0 group-hover/card:opacity-100 text-zinc-600 hover:text-amber-400"
                }`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </button>
            )}
            <span className="font-semibold text-sm text-white truncate max-w-35">
              {repo.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasConflicts && (
              <span className="text-xs text-red-400 font-bold">!</span>
            )}
            {/* Trash — delete from disk, shown on hover */}
            {onDeleteFromDisk && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteFromDisk(); }}
                className="opacity-0 group-hover/card:opacity-100 transition-opacity text-zinc-600 hover:text-red-500"
                title="Delete folder from disk"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
            <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
              {/* Dot — hidden on hover */}
              <span className={`absolute w-2 h-2 rounded-full transition-opacity group-hover/card:opacity-0 ${isDirty ? "bg-yellow-400" : "bg-green-500"}`} />
              {/* × button — shown on hover */}
              <button
                onClick={onRemove}
                className="absolute opacity-0 group-hover/card:opacity-100 transition-opacity text-zinc-500 hover:text-red-400"
                title="Remove from Grove"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
        </div>

        {/* Branch */}
        <div className="flex items-center gap-1.5 mb-2 min-w-0">
          <svg className="w-3 h-3 text-zinc-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM4.25 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z" />
          </svg>
          <span className="text-xs text-zinc-400 truncate flex-1 min-w-0">{repo.branch}</span>
          {(repo.ahead > 0 || repo.behind > 0) && (
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {repo.ahead > 0 && (
                <span className="text-xs text-blue-400">↑{repo.ahead}</span>
              )}
              {repo.behind > 0 && (
                <span className="text-xs text-orange-400">↓{repo.behind}</span>
              )}
            </div>
          )}
        </div>

        {/* Changes summary */}
        {isDirty && (
          <div className="flex flex-wrap gap-1 mb-2">
            {repo.staged.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/30 text-green-400 bg-green-500/10">
                {repo.staged.length} staged
              </Badge>
            )}
            {repo.unstaged.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                {repo.unstaged.length} modified
              </Badge>
            )}
            {repo.untracked.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-500/30 text-zinc-400 bg-zinc-500/10">
                {repo.untracked.length} untracked
              </Badge>
            )}
          </div>
        )}

        {/* Last commit */}
        {repo.last_commit && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-zinc-600 shrink-0">
              {repo.last_commit.short_hash}
            </span>
            <span className="text-[10px] text-zinc-500 truncate flex-1">
              {repo.last_commit.message}
            </span>
            <span className="text-[10px] text-zinc-600 shrink-0 ml-auto">
              {timeAgo(repo.last_commit.timestamp)}
            </span>
          </div>
        )}

        {!isDirty && !repo.last_commit && (
          <span className="text-xs text-zinc-600">Clean</span>
        )}
      </div>

      {/* Group tag button (top-left, only on hover) */}
      {onSetGroup && (
        <button
          onClick={(e) => { e.stopPropagation(); onSetGroup(); }}
          className={`absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[10px] rounded-md px-2 py-0.5 border font-medium
            ${groupName
              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
              : "bg-zinc-800 text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:text-white hover:border-zinc-500"
            }`}
          title={groupName ? `Group: ${groupName}` : "Assign to group"}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          {groupName ?? "group"}
        </button>
      )}
    </div>
  );
}
