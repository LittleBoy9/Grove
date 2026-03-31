import { Joyride, Step, EventData, STATUS } from "react-joyride";

const TOUR_KEY = "grove_tour_done";

const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    skipBeacon: true,
    title: "Welcome to Grove",
    content:
      "A quick tour of the key features — takes about 30 seconds. You can skip anytime.",
  },
  {
    target: "#tour-add-repo",
    placement: "right",
    skipBeacon: true,
    title: "Add a repository",
    content:
      "Click + to add a single repo or scan a folder — Grove finds all git repos inside automatically.",
  },
  {
    target: "#tour-clone-repo",
    placement: "right",
    skipBeacon: true,
    title: "Clone a repository",
    content: "Clone any remote repo by URL directly into a folder of your choice.",
  },
  {
    target: "#tour-repo-list",
    placement: "right",
    skipBeacon: true,
    title: "Repo sidebar",
    content:
      "Each card shows branch, dirty state, ahead/behind counts, and last commit. Dirty repos float to the top. Drag to reorder.",
  },
  {
    target: "#tour-search-cmd",
    placement: "right",
    skipBeacon: true,
    title: "Global search",
    content: "Press ⌘K to search across all repos by name, branch, or last commit message.",
  },
  {
    target: "#tour-main-panel",
    placement: "center",
    skipBeacon: true,
    title: "Repo detail",
    content:
      "Select a repo to stage files, write a commit, push, browse history, manage stashes, tags, and remotes — all in one place.",
  },
  {
    target: "#tour-settings",
    placement: "top",
    skipBeacon: true,
    title: "Settings",
    content:
      "Configure auto-refresh interval, scan depth, default editor/terminal, notifications, and AI commit message generation.",
  },
];

const joyrideOptions = {
  backgroundColor: "#18181b",
  textColor: "#d4d4d8",
  primaryColor: "#3b82f6",
  overlayColor: "rgba(0, 0, 0, 0.6)",
  arrowColor: "#18181b",
  zIndex: 9999,
  buttons: ["back", "primary", "skip"] as ("back" | "primary" | "skip")[],
  showProgress: true,
};

const joyrideStyles = {
  tooltip: {
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "20px",
    fontSize: "13px",
    maxWidth: "300px",
    background: "#18181b",
  },
  tooltipTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f4f4f5",
    marginBottom: "6px",
  },
  tooltipContent: {
    padding: "0",
    color: "#a1a1aa",
  },
  buttonNext: {
    backgroundColor: "#3b82f6",
    borderRadius: "8px",
    fontSize: "12px",
    padding: "6px 14px",
    color: "#fff",
  },
  buttonBack: {
    color: "#71717a",
    fontSize: "12px",
    marginRight: "8px",
    background: "transparent",
  },
  buttonSkip: {
    color: "#52525b",
    fontSize: "12px",
    background: "transparent",
  },
};

export default function TourGuide({
  run,
  onFinish,
}: {
  run: boolean;
  onFinish: () => void;
}) {
  function handleEvent(data: EventData) {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_KEY, "1");
      onFinish();
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={joyrideOptions}
      styles={joyrideStyles}
      locale={{
        back: "Back",
        close: "Close",
        last: "Done",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}

export function isTourDone() {
  return localStorage.getItem(TOUR_KEY) === "1";
}
