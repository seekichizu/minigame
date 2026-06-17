'use strict';

/* ─── Arrow Puzzle Solver ───────────────────────
   arCanRemove  — 해당 화살표 제거 가능 여부
   arGetRemovable — 현재 제거 가능한 화살표 목록
──────────────────────────────────────────────── */

const AR_DIRS    = { up: [-1,0], down: [1,0], left: [0,-1], right: [0,1] };
const AR_SYMBOLS = { up: '↑', down: '↓', left: '←', right: '→' };

function arCanRemove(board, r, c) {
  const dir = board[r][c];
  if (!dir) return false;
  const [dr, dc] = AR_DIRS[dir];
  const rows = board.length, cols = board[0].length;
  let nr = r + dr, nc = c + dc;
  while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
    if (board[nr][nc]) return false;
    nr += dr; nc += dc;
  }
  return true;
}

function arGetRemovable(board) {
  const result = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] && arCanRemove(board, r, c)) result.push({ r, c });
    }
  }
  return result;
}
