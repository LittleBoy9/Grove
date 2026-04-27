import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { RepoStatus } from "./types";
import { api } from "./api";
import RepoCard from "./components/RepoCard";
import RepoDetail from "./components/RepoDetail";
import SettingsPanel from "./components/SettingsPanel";
import CloneRepo from "./components/CloneRepo";
import GlobalSearch from "./components/GlobalSearch";
import TourGuide, { isTourDone } from "./components/TourGuide";
import { ScrollArea } from "./components/ui/scroll-area";
import { TooltipProvider } from "./components/ui/tooltip";
import { loadSettings, saveSettings, GroveSettings } from "./lib/settings";
import { notify } from "./lib/notify";
import GroupPicker from "./components/GroupPicker";
import SplashScreen from "./components/SplashScreen";
import DeleteRepoModal from "./components/DeleteRepoModal";
import UpdateChecker from "./components/UpdateChecker";
import StandupModal from "./components/StandupModal";

const STORAGE_KEY = "grove_repos";

function loadSavedRepos(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRepos(paths: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
}

function loadCustomOrder(): string[] | null {
  try {
    const raw = localStorage.getItem("grove_order");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveCustomOrder(order: string[] | null) {
  if (order === null) {
    localStorage.removeItem("grove_order");
  } else {
    localStorage.setItem("grove_order", JSON.stringify(order));
  }
}

function loadGroups(): Record<string, string> {
  try {
    const raw = localStorage.getItem("grove_groups");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGroups(groups: Record<string, string>) {
  localStorage.setItem("grove_groups", JSON.stringify(groups));
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem("grove_favorites");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem("grove_favorites", JSON.stringify([...favs]));
}

export default function App() {
  const [repoPaths, setRepoPaths] = useState<string[]>(loadSavedRepos);
  const [statuses, setStatuses] = useState<Map<string, RepoStatus>>(new Map());
  const [selectedPath, setSelectedPath] = useState<string | null>(() => {
    try {
      return localStorage.getItem("grove_selected") ?? null;
    } catch {
      return null;
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [scanPath, setScanPath] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bulkLoading, setBulkLoading] = useState<"fetch" | "pull" | null>(null);
  const [settings, setSettings] = useState<GroveSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showStandup, setShowStandup] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[] | null>(loadCustomOrder);
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [groups, setGroups] = useState<Record<string, string>>(loadGroups);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [groupPickerPath, setGroupPickerPath] = useState<string | null>(null);
  const [groupInput, setGroupInput] = useState("");
  const [runTour, setRunTour] = useState(() => !isTourDone());
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashVisible(false), 1500);
    const unmountTimer = setTimeout(() => setSplashMounted(false), 2000);
    return () => { clearTimeout(fadeTimer); clearTimeout(unmountTimer); };
  }, []);

  // Apply theme + color mode to document root so modals/portals and shadcn dark variants work
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme || "grove");
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Validate selectedPath is in repoPaths
  useEffect(() => {
    if (selectedPath && !repoPaths.includes(selectedPath)) {
      setSelectedPath(null);
    }
  }, [repoPaths]);

  // Persist selectedPath
  useEffect(() => {
    try {
      if (selectedPath) {
        localStorage.setItem("grove_selected", selectedPath);
      } else {
        localStorage.removeItem("grove_selected");
      }
    } catch { /* ignore */ }
  }, [selectedPath]);

  // Persist customOrder
  useEffect(() => {
    saveCustomOrder(customOrder);
  }, [customOrder]);

  // Persist groups
  useEffect(() => {
    saveGroups(groups);
  }, [groups]);

  const refreshAll = useCallback(async (paths: string[] = repoPaths) => {
    if (paths.length === 0) return;
    setRefreshing(true);
    try {
      const results = await Promise.allSettled(paths.map((p) => api.getRepoStatus(p)));
      setStatuses((prev) => {
        const next = new Map(prev);
        results.forEach((r, i) => {
          if (r.status === "fulfilled") next.set(paths[i], r.value);
        });
        return next;
      });
    } finally {
      setRefreshing(false);
    }
  }, [repoPaths]);

  useEffect(() => {
    if (repoPaths.length > 0) refreshAll(repoPaths);
    if (settings.refreshInterval === 0) return;
    const interval = setInterval(() => refreshAll(repoPaths), settings.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [repoPaths, settings.refreshInterval]);

  // Keyboard shortcuts
  const filteredPathsRef = useRef<string[]>([]);
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K: open global search
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      // Escape: close global search
      if (e.key === "Escape" && showSearch) {
        e.preventDefault();
        setShowSearch(false);
        return;
      }
      // Cmd+R: refresh all
      if (e.metaKey && e.key === "r") {
        e.preventDefault();
        refreshAll();
        return;
      }
      // ArrowUp/ArrowDown: navigate repos in sidebar
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const paths = filteredPathsRef.current;
        if (paths.length === 0) return;
        e.preventDefault();
        const currentIndex = selectedPath ? paths.indexOf(selectedPath) : -1;
        if (e.key === "ArrowUp") {
          const newIndex = currentIndex <= 0 ? paths.length - 1 : currentIndex - 1;
          setSelectedPath(paths[newIndex]);
        } else {
          const newIndex = currentIndex >= paths.length - 1 ? 0 : currentIndex + 1;
          setSelectedPath(paths[newIndex]);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [refreshAll, selectedPath, showSearch]);

  async function handleAddFolder() {
    const folder = await api.pickFolder();
    if (!folder) return;
    const isRepo = await api.addRepo(folder);
    if (isRepo) {
      if (!repoPaths.includes(folder)) {
        const next = [...repoPaths, folder];
        setRepoPaths(next);
        saveRepos(next);
        refreshAll(next);
      }
    } else {
      setScanPath(folder);
      const found = await api.scanDirectory(folder, settings.scanDepth);
      if (found.length > 0) {
        const newPaths = found.filter((p) => !repoPaths.includes(p));
        const next = [...repoPaths, ...newPaths];
        setRepoPaths(next);
        saveRepos(next);
        refreshAll(next);
      }
      setScanPath(null);
    }
  }

  function handleRemoveRepo(path: string) {
    const next = repoPaths.filter((p) => p !== path);
    setRepoPaths(next);
    saveRepos(next);
    setStatuses((prev) => {
      const next2 = new Map(prev);
      next2.delete(path);
      return next2;
    });
    if (selectedPath === path) setSelectedPath(null);
    // Remove from custom order too
    if (customOrder) {
      const newOrder = customOrder.filter((p) => p !== path);
      setCustomOrder(newOrder.length > 0 ? newOrder : null);
    }
  }

  async function handleFetchAll() {
    if (repoPaths.length === 0) return;
    setBulkLoading("fetch");
    try {
      await api.fetchAllRepos(repoPaths);
      await refreshAll();
      await notify("Fetch all complete", `${repoPaths.length} repos`);
    } finally {
      setBulkLoading(null);
    }
  }

  async function handlePullAll() {
    if (repoPaths.length === 0) return;
    setBulkLoading("pull");
    try {
      await api.pullAllRepos(repoPaths);
      await refreshAll();
      await notify("Pull all complete", `${repoPaths.length} repos`);
    } finally {
      setBulkLoading(null);
    }
  }

  function handleCloned(repoPath: string) {
    if (!repoPaths.includes(repoPath)) {
      const next = [...repoPaths, repoPath];
      setRepoPaths(next);
      saveRepos(next);
      refreshAll(next);
    }
  }

  function handleSettingsSave(s: GroveSettings) {
    setSettings(s);
    saveSettings(s);
  }

  // Drag handlers
  function handleDragStart(path: string) {
    setDragPath(path);
  }

  function handleDragOver(path: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverPath(path);
  }

  function handleDrop(targetPath: string) {
    if (!dragPath || dragPath === targetPath) {
      setDragPath(null);
      setDragOverPath(null);
      return;
    }
    // Use the current display order as the base for reordering
    const currentOrder = customOrder
      ? repoPaths.slice().sort((a, b) => {
          const ai = customOrder.indexOf(a);
          const bi = customOrder.indexOf(b);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        })
      : [...sortedPaths];

    const newOrder = [...currentOrder];
    const fromIndex = newOrder.indexOf(dragPath);
    const toIndex = newOrder.indexOf(targetPath);
    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, dragPath);
    }
    setCustomOrder(newOrder);
    setDragPath(null);
    setDragOverPath(null);
  }

  function assignGroup(path: string, groupName: string | null) {
    setGroups((prev) => {
      const next = { ...prev };
      if (groupName === null) {
        delete next[path];
      } else {
        next[path] = groupName.trim();
      }
      return next;
    });
    setGroupPickerPath(null);
    setGroupInput("");
  }

  function toggleGroupCollapse(name: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const selectedRepo = selectedPath ? statuses.get(selectedPath) : null;

  const sortedPaths = [...repoPaths].sort((a, b) => {
    const favA = favorites.has(a) ? 0 : 1;
    const favB = favorites.has(b) ? 0 : 1;
    if (favA !== favB) return favA - favB;
    const sa = statuses.get(a);
    const sb = statuses.get(b);
    const dirtyA = sa ? sa.staged.length + sa.unstaged.length + sa.untracked.length : 0;
    const dirtyB = sb ? sb.staged.length + sb.unstaged.length + sb.untracked.length : 0;
    return dirtyB - dirtyA;
  });

  function handleToggleFavorite(path: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      saveFavorites(next);
      return next;
    });
  }

  // When customOrder is set, use it; otherwise use dirty-first sort
  const orderedPaths = customOrder
    ? repoPaths.slice().sort((a, b) => {
        const ai = customOrder.indexOf(a);
        const bi = customOrder.indexOf(b);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : sortedPaths;

  const filteredPaths = search.trim()
    ? orderedPaths.filter((p) => {
        const q = search.toLowerCase();
        const name = (statuses.get(p)?.name ?? p.split("/").pop() ?? "").toLowerCase();
        // Also match against the last 3 path segments so "api/server" or "projects/web" work
        const segments = p.split("/").filter(Boolean);
        const context = segments.slice(-3).join("/").toLowerCase();
        return name.includes(q) || context.includes(q);
      })
    : orderedPaths;

  // Keep ref in sync for keyboard navigation
  filteredPathsRef.current = filteredPaths;

  // Group repos
  const groupedMap: Record<string, string[]> = {};
  const ungroupedPaths: string[] = [];
  for (const path of filteredPaths) {
    const g = groups[path];
    if (g) {
      if (!groupedMap[g]) groupedMap[g] = [];
      groupedMap[g].push(path);
    } else {
      ungroupedPaths.push(path);
    }
  }
  const groupNames = Object.keys(groupedMap).sort();
  const hasGroups = groupNames.length > 0;

  // All unique group names (for the picker)
  const allGroupNames = [...new Set(Object.values(groups))].sort();

  const dirtyCount = [...statuses.values()].filter(
    (s) => s.staged.length + s.unstaged.length + s.untracked.length > 0
  ).length;

  function renderRepoCard(path: string) {
    const status = statuses.get(path);
    if (!status) {
      return (
        <div key={path} className="px-4 py-3 rounded-xl border border-white/5 bg-white/3 animate-pulse space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
            <div className="h-3 bg-zinc-700 rounded w-28" />
          </div>
          <div className="h-2.5 bg-zinc-800 rounded w-16" />
          <div className="h-2 bg-zinc-800 rounded w-36" />
        </div>
      );
    }
    return (
      <RepoCard
        key={path}
        repo={status}
        selected={selectedPath === path}
        onClick={() => setSelectedPath(path)}
        onRemove={(e) => { e.stopPropagation(); handleRemoveRepo(path); }}
        onSetGroup={() => { setGroupPickerPath(path); setGroupInput(groups[path] ?? ""); }}
        onDeleteFromDisk={() => setDeleteTarget(path)}
        groupName={groups[path]}
        isFavorite={favorites.has(path)}
        onToggleFavorite={() => handleToggleFavorite(path)}
        draggable={true}
        onDragStart={() => handleDragStart(path)}
        onDragOver={(e) => handleDragOver(path, e)}
        onDrop={() => handleDrop(path)}
        isDragOver={dragOverPath === path}
      />
    );
  }

  return (
    <TooltipProvider>
      {splashMounted && <SplashScreen visible={splashVisible} />}
      <div data-theme={settings.theme} className="flex h-screen bg-zinc-900 text-white overflow-hidden">
        {/* Titlebar drag region — enables window drag + double-click to zoom */}
        <div
          data-tauri-drag-region
          onDoubleClick={() => getCurrentWindow().toggleMaximize()}
          className="fixed inset-x-0 top-0 z-50"
          style={{ height: "env(titlebar-area-height, 28px)" }}
        />
        {/* Sidebar */}
        <div
          className="w-72 shrink-0 flex flex-col border-r border-white/8"
          style={{ paddingTop: "env(titlebar-area-height, 28px)" }}
        >
          {/* Header */}
          <div className="px-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="20" height="20" style={{ borderRadius: "5px", flexShrink: 0 }}>
                <defs>
                  <radialGradient id="sidebar-logo-bg" cx="50%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#1E4D33" />
                    <stop offset="100%" stopColor="#0C1F16" />
                  </radialGradient>
                </defs>
                <rect width="1024" height="1024" rx="210" ry="210" fill="url(#sidebar-logo-bg)" />
                <g stroke="white" strokeLinecap="round" fill="none">
                  <line x1="512" y1="810" x2="512" y2="545" strokeWidth="56" />
                  <path d="M 512 545 Q 426 418 268 268" strokeWidth="46" />
                  <line x1="512" y1="545" x2="512" y2="220" strokeWidth="46" />
                  <path d="M 512 545 Q 598 418 756 268" strokeWidth="46" />
                </g>
                <circle cx="512" cy="810" r="54" fill="white" />
                <circle cx="512" cy="545" r="50" fill="white" />
                <circle cx="268" cy="268" r="58" fill="#6EE7A0" />
                <circle cx="512" cy="220" r="58" fill="#6EE7A0" />
                <circle cx="756" cy="268" r="58" fill="#6EE7A0" />
              </svg>
              <span className="text-base font-bold text-white tracking-tight">Grove</span>
              {refreshing && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
              <span
                id="tour-search-cmd"
                className="text-[10px] text-zinc-700 cursor-pointer hover:text-zinc-500 transition-colors ml-1"
                onClick={() => setShowSearch(true)}
                title="Global search (Cmd+K)"
              >
                ⌘K
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => refreshAll()}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                title="Refresh all (Cmd+R)">
                <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button id="tour-clone-repo" onClick={() => setShowClone(true)}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                title="Clone repository">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" />
                </svg>
              </button>
              <button id="tour-add-repo" onClick={handleAddFolder}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                title="Add repository or scan folder">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {repoPaths.length > 1 && (
            <div id="tour-bulk-actions" className="px-3 pb-2 flex gap-1.5">
              <button
                onClick={handleFetchAll}
                disabled={!!bulkLoading}
                className="flex-1 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 bg-white/4 hover:bg-white/8 rounded-lg border border-white/5 transition-colors disabled:opacity-40"
              >
                {bulkLoading === "fetch" ? "Fetching…" : "↺ Fetch all"}
              </button>
              <button
                onClick={handlePullAll}
                disabled={!!bulkLoading}
                className="flex-1 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 bg-white/4 hover:bg-white/8 rounded-lg border border-white/5 transition-colors disabled:opacity-40"
              >
                {bulkLoading === "pull" ? "Pulling…" : "↓ Pull all"}
              </button>
            </div>
          )}

          {/* Search */}
          {repoPaths.length > 3 && (
            <div className="px-3 pb-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search repos…"
                  className="w-full bg-white/5 border border-white/8 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/15"
                />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {scanPath && (
            <div className="mx-3 mb-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400">Scanning for repos…</p>
            </div>
          )}

          {/* Repo list */}
          <ScrollArea id="tour-repo-list" className="flex-1 min-h-0 px-3">
            {sortedPaths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                </svg>
                <p className="text-sm">No repositories</p>
                <button onClick={handleAddFolder} className="text-xs text-blue-400 hover:text-blue-300 underline">
                  Add a folder
                </button>
              </div>
            ) : filteredPaths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-600">
                <p className="text-sm">No results for "{search}"</p>
                <button onClick={() => setSearch("")} className="text-xs text-zinc-500 hover:text-zinc-300 underline">Clear</button>
              </div>
            ) : (
              <div className="pb-4">
                {/* Named groups */}
                {groupNames.map((groupName) => (
                  <div key={groupName} className="mb-2">
                    <button
                      onClick={() => toggleGroupCollapse(groupName)}
                      className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 font-semibold uppercase tracking-wider transition-colors"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${collapsedGroups.has(groupName) ? "" : "rotate-90"}`}
                        viewBox="0 0 24 24" fill="currentColor"
                      >
                        <path d="M8 5l8 7-8 7V5z" />
                      </svg>
                      {groupName}
                      <span className="ml-auto font-normal normal-case tracking-normal text-zinc-700">
                        {groupedMap[groupName].length}
                      </span>
                    </button>
                    {!collapsedGroups.has(groupName) && (
                      <div className="space-y-1.5 pl-2">
                        {groupedMap[groupName].map((path) => renderRepoCard(path))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Ungrouped */}
                {ungroupedPaths.length > 0 && (
                  <div>
                    {hasGroups && (
                      <div className="px-2 py-1 text-[11px] text-zinc-700 font-semibold uppercase tracking-wider">
                        Other
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {ungroupedPaths.map((path) => renderRepoCard(path))}
                    </div>
                  </div>
                )}

                {/* Group picker popover */}
                {groupPickerPath && (
                  <GroupPicker
                    repoName={statuses.get(groupPickerPath)?.name ?? groupPickerPath.split("/").pop() ?? ""}
                    currentGroup={groups[groupPickerPath] ?? null}
                    allGroupNames={allGroupNames}
                    groupInput={groupInput}
                    onGroupInputChange={setGroupInput}
                    onAssign={(name) => assignGroup(groupPickerPath, name)}
                    onRemove={() => assignGroup(groupPickerPath, null)}
                    onClose={() => { setGroupPickerPath(null); setGroupInput(""); }}
                  />
                )}
              </div>
            )}
          </ScrollArea>

          <UpdateChecker />

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/8 shrink-0 flex items-center justify-between">
            <p className="text-[11px] text-zinc-700">
              {repoPaths.length} {repoPaths.length === 1 ? "repo" : "repos"} · {dirtyCount} dirty
              {search && ` · ${filteredPaths.length} shown`}
            </p>
            <div className="flex items-center gap-1">
              {customOrder && (
                <button
                  onClick={() => setCustomOrder(null)}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
                  title="Reset custom order"
                >
                  Reset order
                </button>
              )}
              {settings.aiProvider && (
                <button
                  onClick={() => setShowStandup(true)}
                  className="p-1 rounded-md text-zinc-600 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                  title="Generate standup summary"
                >
                  <span className="text-sm leading-none">✨</span>
                </button>
              )}
              <button
                onClick={() => setRunTour(true)}
                className="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-colors"
                title="Take a tour"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
                </svg>
              </button>
              <button
                id="tour-settings"
                onClick={() => setShowSettings(true)}
                className="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-colors"
                title="Settings"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div id="tour-main-panel" className="flex-1 min-w-0 flex flex-col" style={{ paddingTop: "env(titlebar-area-height, 28px)" }}>
          {selectedRepo ? (
            <RepoDetail repo={selectedRepo} onRefresh={() => refreshAll()} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-700">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-sm">Select a repository</p>
            </div>
          )}
        </div>
      </div>

      {showStandup && (
        <StandupModal
          repoPaths={repoPaths}
          repoNames={new Map(Array.from(statuses.entries()).map(([p, s]) => [p, s.name]))}
          onClose={() => setShowStandup(false)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showClone && (
        <CloneRepo
          onClose={() => setShowClone(false)}
          onCloned={handleCloned}
        />
      )}

      {showSearch && (
        <GlobalSearch
          statuses={statuses}
          onSelect={(p) => { setSelectedPath(p); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      <TourGuide run={runTour} onFinish={() => setRunTour(false)} />

      {deleteTarget && (() => {
        const status = statuses.get(deleteTarget);
        const name = status?.name ?? deleteTarget.split("/").pop() ?? deleteTarget;
        return (
          <DeleteRepoModal
            repoName={name}
            repoPath={deleteTarget}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={async () => {
              await api.deleteRepoFolder(deleteTarget);
              handleRemoveRepo(deleteTarget);
              if (selectedPath === deleteTarget) setSelectedPath(null);
              setDeleteTarget(null);
            }}
          />
        );
      })()}
    </TooltipProvider>
  );
}
