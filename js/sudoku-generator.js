'use strict';

/* ─── Sudoku Generator ──────────────────────────
   sdkShuffle       — Fisher-Yates 셔플
   sdkGenerateSolved — 완성된 보드 생성
   sdkGenerate      — 유일해 퍼즐 생성
──────────────────────────────────────────────── */

function sdkShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function sdkGenerateSolved() {
  const board = Array.from({ length: 9 }, function() { return Array(9).fill(0); });

  function fill(pos) {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const nums = sdkShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const num of nums) {
      if (sdkIsValid(board, r, c, num)) {
        board[r][c] = num;
        if (fill(pos + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }

  fill(0);
  return board;
}

function sdkGenerate(difficulty) {
  const solution = sdkGenerateSolved();
  const puzzle = solution.map(function(r) { return r.slice(); });

  // 난이도별 제거 수 (남길 단서 수: 쉬움≈45, 보통≈35, 어려움≈27)
  const removeCount = { easy: 36, medium: 46, hard: 54 };
  const toRemove = removeCount[difficulty] || 36;

  const positions = sdkShuffle(Array.from({ length: 81 }, function(_, i) { return i; }));
  let removed = 0;

  for (const pos of positions) {
    if (removed >= toRemove) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    const copy = puzzle.map(function(row) { return row.slice(); });
    if (sdkCountSolutions(copy, 2) !== 1) {
      puzzle[r][c] = backup; // 유일해 아니면 복원
    } else {
      removed++;
    }
  }

  return { puzzle: puzzle, solution: solution };
}
