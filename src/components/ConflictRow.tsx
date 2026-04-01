interface Props {
  filePath: string;
  resolving: boolean;
  onOurs: () => void;
  onTheirs: () => void;
  onSelect: () => void;
  selected: boolean;
}

export default function ConflictRow({ filePath, resolving, onOurs, onTheirs, onSelect, selected }: Props) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md transition-colors
        ${selected ? "bg-red-500/10" : "hover:bg-red-500/5"}`}
    >
      <span className="text-[11px] font-bold w-4 shrink-0 text-red-500">!</span>
      <span className="text-xs text-red-300 truncate flex-1 font-mono">{filePath}</span>
      {resolving ? (
        <span className="text-[10px] text-zinc-500 shrink-0">resolving…</span>
      ) : (
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onOurs}
            className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/20 rounded transition-colors"
            title="Use our version (git checkout --ours)"
          >
            Ours
          </button>
          <button
            onClick={onTheirs}
            className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/20 rounded transition-colors"
            title="Use their version (git checkout --theirs)"
          >
            Theirs
          </button>
        </div>
      )}
    </div>
  );
}
