export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  const m = oldLines.length;
  const n = newLines.length;

  // dp[i][j] stores the length of LCS of oldLines[0..i-1] and newLines[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the diff
  const diff: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.push({ type: "unchanged", content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: "added", content: newLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.push({ type: "removed", content: oldLines[i - 1] });
      i--;
    }
  }

  return diff.reverse();
}

export interface AlignedDiffRow {
  left?: { lineNumber?: number; content: string; type: "removed" | "unchanged" };
  right?: { lineNumber?: number; content: string; type: "added" | "unchanged" };
}

export function alignDiff(diffLines: DiffLine[]): AlignedDiffRow[] {
  const rows: AlignedDiffRow[] = [];
  let i = 0;
  
  let leftLineNum = 1;
  let rightLineNum = 1;

  while (i < diffLines.length) {
    if (diffLines[i].type === "unchanged") {
      rows.push({
        left: { lineNumber: leftLineNum++, content: diffLines[i].content, type: "unchanged" },
        right: { lineNumber: rightLineNum++, content: diffLines[i].content, type: "unchanged" }
      });
      i++;
    } else {
      // Gather consecutive removed lines and added lines
      const removed: DiffLine[] = [];
      const added: DiffLine[] = [];
      
      while (i < diffLines.length && diffLines[i].type !== "unchanged") {
        if (diffLines[i].type === "removed") {
          removed.push(diffLines[i]);
        } else if (diffLines[i].type === "added") {
          added.push(diffLines[i]);
        }
        i++;
      }
      
      const maxLen = Math.max(removed.length, added.length);
      for (let k = 0; k < maxLen; k++) {
        const r = removed[k];
        const a = added[k];
        rows.push({
          left: r ? { lineNumber: leftLineNum++, content: r.content, type: "removed" } : undefined,
          right: a ? { lineNumber: rightLineNum++, content: a.content, type: "added" } : undefined
        });
      }
    }
  }
  return rows;
}

export interface WordDiffToken {
  type: "added" | "removed" | "unchanged";
  content: string;
}

export function computeWordDiff(oldStr: string, newStr: string): WordDiffToken[] {
  // Split by whitespace and common punctuation, retaining them in the split
  const oldWords = oldStr.split(/(\s+|[.,;:!?"'()\[\]{}])/g).filter(Boolean);
  const newWords = newStr.split(/(\s+|[.,;:!?"'()\[\]{}])/g).filter(Boolean);

  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: WordDiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      diff.push({ type: "unchanged", content: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: "added", content: newWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.push({ type: "removed", content: oldWords[i - 1] });
      i--;
    }
  }

  return diff.reverse();
}

