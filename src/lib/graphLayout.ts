import { GraphCommitInfo } from "../types";

export const LANE_COLORS = [
  "#a78bfa", // violet-400
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#fb923c", // orange-400
  "#f472b6", // pink-400
  "#22d3ee", // cyan-400
  "#fbbf24", // amber-400
  "#f87171", // rose-400
  "#a3e635", // lime-400
  "#818cf8", // indigo-400
  "#38bdf8", // sky-400
  "#4ade80", // green-400
];

export interface GraphSegment {
  fromLane: number; // x lane at top of row (for curves: always myLane)
  toLane: number;   // x lane at bottom of row
  color: string;
}

export interface LayoutCommit extends GraphCommitInfo {
  lane: number;
  color: string;
  totalLanes: number;
  topLine: boolean;    // draw incoming line from above into the dot
  bottomLine: boolean; // draw outgoing line from dot down (first parent continues in same lane)
  segments: GraphSegment[];
}

export function computeLayout(commits: GraphCommitInfo[]): LayoutCommit[] {
  // lanes[i] = hash of the commit this lane is waiting for, null = free slot
  const lanes: (string | null)[] = [];
  const laneColors: string[] = [];
  let colorIdx = 0;
  const nextColor = () => LANE_COLORS[colorIdx++ % LANE_COLORS.length];

  const result: LayoutCommit[] = [];

  for (const commit of commits) {
    // 1. Find which lane is already tracking this commit (from a child processed earlier)
    const foundAt = lanes.indexOf(commit.hash);
    const hasIncoming = foundAt !== -1;

    let myLane: number;
    let myColor: string;

    if (hasIncoming) {
      myLane = foundAt;
      myColor = laneColors[myLane];
    } else {
      // Branch head not yet seen — find a free slot or extend
      const free = lanes.indexOf(null);
      myLane = free !== -1 ? free : lanes.length;
      if (myLane === lanes.length) {
        lanes.push(null);
        laneColors.push("");
      }
      myColor = nextColor();
      laneColors[myLane] = myColor;
    }

    // 2. Snapshot the incoming lane state before modifying
    const snapshot: (string | null)[] = [...lanes];
    // Ensure myLane is marked as occupied in the snapshot
    snapshot[myLane] = commit.hash;

    // 3. Free myLane now that this commit is being processed
    lanes[myLane] = null;

    // 4. Assign lanes for this commit's parents
    const parentLanes: number[] = [];

    for (let pi = 0; pi < commit.parents.length; pi++) {
      const ph = commit.parents[pi];
      const existing = lanes.indexOf(ph);

      if (existing !== -1) {
        // Parent already tracked by an existing lane (another branch merging into it)
        parentLanes.push(existing);
      } else if (pi === 0 && lanes[myLane] === null) {
        // Reuse myLane for the first parent (keep the lane alive)
        lanes[myLane] = ph;
        laneColors[myLane] = myColor;
        parentLanes.push(myLane);
      } else {
        // Open a new/free lane for this parent
        const free = lanes.indexOf(null);
        const nl = free !== -1 ? free : lanes.length;
        if (nl === lanes.length) {
          lanes.push(null);
          laneColors.push("");
        }
        lanes[nl] = ph;
        laneColors[nl] = nextColor();
        parentLanes.push(nl);
      }
    }

    // 5. Build visual segments for this row
    const segments: GraphSegment[] = [];
    const maxLen = Math.max(snapshot.length, lanes.length, myLane + 1);

    // Pass-through lanes: same hash in snapshot and current lanes, not myLane
    for (let i = 0; i < maxLen; i++) {
      if (i === myLane) continue;
      const top = i < snapshot.length ? snapshot[i] : null;
      const bot = i < lanes.length ? lanes[i] : null;
      if (top !== null && top === bot) {
        segments.push({ fromLane: i, toLane: i, color: laneColors[i] });
      }
    }

    // Curve segments: from myLane (dot) to each parent lane that isn't myLane
    for (const pl of parentLanes) {
      if (pl === myLane) continue;
      segments.push({ fromLane: myLane, toLane: pl, color: laneColors[pl] });
    }

    // 6. Trim trailing null slots
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
      lanes.pop();
      laneColors.pop();
    }

    const topLine = hasIncoming;
    const bottomLine = parentLanes.includes(myLane);

    const totalLanes = Math.max(
      myLane + 1,
      lanes.length,
      ...parentLanes.map((pl) => pl + 1),
      ...segments.map((s) => Math.max(s.fromLane, s.toLane) + 1),
      1
    );

    result.push({
      ...commit,
      lane: myLane,
      color: myColor,
      totalLanes,
      topLine,
      bottomLine,
      segments,
    });
  }

  return result;
}

// --- Ref parsing ---

export type RefKind = "head" | "local" | "remote" | "tag";

export interface ParsedRef {
  kind: RefKind;
  label: string;
}

export function parseRefs(refs: string[]): ParsedRef[] {
  const out: ParsedRef[] = [];
  for (const r of refs) {
    const trimmed = r.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("HEAD -> ")) {
      out.push({ kind: "head", label: trimmed.slice(8) });
    } else if (trimmed === "HEAD") {
      out.push({ kind: "head", label: "HEAD" });
    } else if (trimmed.startsWith("tag: ")) {
      out.push({ kind: "tag", label: trimmed.slice(5) });
    } else if (trimmed.includes("/")) {
      out.push({ kind: "remote", label: trimmed });
    } else {
      out.push({ kind: "local", label: trimmed });
    }
  }
  return out;
}
