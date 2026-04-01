import { FileChange } from "../types";

interface Props {
  file: FileChange;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onCheck: (v: boolean) => void;
  onDiscard?: () => void;
  onHistory?: () => void;
}

const colorMap: Record<string, string> = {
  modified: "text-yellow-400", added: "text-green-400", deleted: "text-red-400",
  renamed: "text-blue-400", conflict: "text-red-500", untracked: "text-zinc-400",
  changed: "text-yellow-400", copied: "text-blue-400",
};

const labelMap: Record<string, string> = {
  modified: "M", added: "A", deleted: "D", renamed: "R",
  conflict: "!", untracked: "?", changed: "~", copied: "C",
};

export default function FileRow({ file, selected, checked, onSelect, onCheck, onDiscard, onHistory }: Props) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md group/row transition-colors
        ${selected ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => { e.stopPropagation(); onCheck(e.target.checked); }}
        onClick={(e) => e.stopPropagation()}
        className="accent-green-500 shrink-0"
      />
      <span className={`text-[11px] font-bold w-4 shrink-0 ${colorMap[file.status] || "text-zinc-400"}`}>
        {labelMap[file.status] || "~"}
      </span>
      <span className="text-xs text-zinc-300 truncate flex-1 font-mono">{file.path}</span>
      {onHistory && (
        <button
          onClick={(e) => { e.stopPropagation(); onHistory(); }}
          className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0"
          title="File history"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 3" />
          </svg>
        </button>
      )}
      {onDiscard && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          title="Discard changes"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
