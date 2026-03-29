interface Props {
  diff: string;
}

function tokenize(line: string): string[] {
  return line.match(/(\w+|\s+|[^\w\s]+)/g) ?? [line];
}

function wordDiff(
  oldLine: string,
  newLine: string
): [
  { text: string; type: "same" | "removed" | "added" }[],
  { text: string; type: "same" | "removed" | "added" }[]
] {
  const oldTokens = tokenize(oldLine.slice(1));
  const newTokens = tokenize(newLine.slice(1));

  const m = oldTokens.length,
    n = newTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldTokens[i] === newTokens[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const oldResult: { text: string; type: "same" | "removed" | "added" }[] = [];
  const newResult: { text: string; type: "same" | "removed" | "added" }[] = [];
  let i = 0,
    j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && oldTokens[i] === newTokens[j]) {
      oldResult.push({ text: oldTokens[i], type: "same" });
      newResult.push({ text: newTokens[j], type: "same" });
      i++;
      j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      newResult.push({ text: newTokens[j], type: "added" });
      j++;
    } else {
      oldResult.push({ text: oldTokens[i], type: "removed" });
      i++;
    }
  }
  return [oldResult, newResult];
}

export default function DiffViewer({ diff }: Props) {
  if (!diff) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        No diff available
      </div>
    );
  }

  const lines = diff.split("\n");

  // Pre-process: find paired - and + lines for word diff
  const processed: {
    line: string;
    wordTokens?: { text: string; type: "same" | "removed" | "added" }[];
  }[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("-") && !line.startsWith("---")) {
      const removedLines: string[] = [];
      let j = i;
      while (
        j < lines.length &&
        lines[j].startsWith("-") &&
        !lines[j].startsWith("---")
      ) {
        removedLines.push(lines[j]);
        j++;
      }
      const addedLines: string[] = [];
      while (
        j < lines.length &&
        lines[j].startsWith("+") &&
        !lines[j].startsWith("+++")
      ) {
        addedLines.push(lines[j]);
        j++;
      }
      const pairCount = Math.min(removedLines.length, addedLines.length);
      for (let k = 0; k < removedLines.length; k++) {
        if (k < pairCount) {
          const [oldTokens] = wordDiff(removedLines[k], addedLines[k]);
          processed.push({ line: removedLines[k], wordTokens: oldTokens });
        } else {
          processed.push({ line: removedLines[k] });
        }
      }
      for (let k = 0; k < addedLines.length; k++) {
        if (k < pairCount) {
          const [, newTokens] = wordDiff(removedLines[k], addedLines[k]);
          processed.push({ line: addedLines[k], wordTokens: newTokens });
        } else {
          processed.push({ line: addedLines[k] });
        }
      }
      i = j;
    } else {
      processed.push({ line });
      i++;
    }
  }

  return (
    <div className="font-mono text-xs leading-5 overflow-auto h-full">
      {processed.map(({ line, wordTokens }, idx) => {
        let cls = "text-zinc-400 px-3";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          cls = "bg-green-500/10 text-green-400 px-3";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          cls = "bg-red-500/10 text-red-400 px-3";
        } else if (line.startsWith("@@")) {
          cls = "text-blue-400 px-3 bg-blue-500/5";
        } else if (
          line.startsWith("diff ") ||
          line.startsWith("index ") ||
          line.startsWith("---") ||
          line.startsWith("+++")
        ) {
          cls = "text-zinc-500 px-3";
        }

        if (wordTokens && wordTokens.length > 0) {
          return (
            <div key={idx} className={`${cls} whitespace-pre`}>
              {line[0]}
              {wordTokens.map((tok, ti) => {
                if (tok.type === "removed")
                  return (
                    <span key={ti} className="bg-red-500/30 rounded-sm">
                      {tok.text}
                    </span>
                  );
                if (tok.type === "added")
                  return (
                    <span key={ti} className="bg-green-500/30 rounded-sm">
                      {tok.text}
                    </span>
                  );
                return <span key={ti}>{tok.text}</span>;
              })}
            </div>
          );
        }

        return (
          <div key={idx} className={`${cls} whitespace-pre`}>
            {line || " "}
          </div>
        );
      })}
    </div>
  );
}
