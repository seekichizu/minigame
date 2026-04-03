'use strict';

/* ─── Sudoku Solver ─────────────────────────────
   sdkIsValid      — 숫자 배치 가능 여부 확인
   sdkCountSolutions — 해의 수 (유일해 검증용)
   sdkSolve        — 완전 풀이 반환
   sdkGetConflicts — 충돌 셀 표시
──────────────────────────────────────────────── */

function sdkIsValid(board, row, col, num) {
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function sdkCountSolutions(board, limit) {
  limit = limit || 2;
  let count = 0;
  const b = board.map(function(r) { return r.slice(); });

  function solve() {
    if (count >= limit) return;
    let row = -1, col = -1;
    outer: for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) { row = r; col = c; break outer; }
      }
    }
    if (row === -1) { count++; return; }
    for (let num = 1; num <= 9; num++) {
      if (sdkIsValid(b, row, col, num)) {
        b[row][col] = num;
        solve();
        b[row][col] = 0;
        if (count >= limit) return;
      }
    }
  }

  solve();
  return count;
}

function sdkSolve(board) {
  const b = board.map(function(r) { return r.slice(); });

  function solve() {
    let row = -1, col = -1;
    outer: for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) { row = r; col = c; break outer; }
      }
    }
    if (row === -1) return true;
    for (let num = 1; num <= 9; num++) {
      if (sdkIsValid(b, row, col, num)) {
        b[row][col] = num;
        if (solve()) return true;
        b[row][col] = 0;
      }
    }
    return false;
  }

  return solve() ? b : null;
}

function sdkGetConflicts(board) {
  const cf = Array.from({ length: 9 }, function() { return Array(9).fill(false); });

  // 행
  for (let r = 0; r < 9; r++) {
    const seen = {};
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (!v) continue;
      if (seen[v] !== undefined) { cf[r][c] = true; cf[r][seen[v]] = true; }
      else seen[v] = c;
    }
  }
  // 열
  for (let c = 0; c < 9; c++) {
    const seen = {};
    for (let r = 0; r < 9; r++) {
      const v = board[r][c];
      if (!v) continue;
      if (seen[v] !== undefined) { cf[r][c] = true; cf[seen[v]][c] = true; }
      else seen[v] = r;
    }
  }
  // 3×3 박스
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = {};
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          const v = board[r][c];
          if (!v) continue;
          const key = r + ',' + c;
          if (seen[v] !== undefined) {
            cf[r][c] = true;
            const p = seen[v].split(',');
            cf[+p[0]][+p[1]] = true;
          } else seen[v] = key;
        }
      }
    }
  }
  return cf;
}
