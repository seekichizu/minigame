'use strict';

/* ─── Arrow Puzzle Generator ────────────────────
   역방향 알고리즘:
   빈 보드에서 화살표를 하나씩 놓되,
   놓는 시점에 진행 방향이 비어있어야 함.
   → 놓은 순서의 역순이 정답 순서가 됨.
──────────────────────────────────────────────── */

function arShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function arGenerate(difficulty) {
  const configs = {
    easy:   { size: 4, count: 10 },
    medium: { size: 5, count: 16 },
    hard:   { size: 6, count: 26 }
  };
  const cfg = configs[difficulty] || configs.easy;

  // 실패 시 최대 5회 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = arTryGenerate(cfg.size, cfg.count);
    if (result.solution.length >= Math.floor(cfg.count * 0.85)) return result;
  }
  return arTryGenerate(cfg.size, cfg.count);
}

function arTryGenerate(size, count) {
  const board = Array.from({ length: size }, function() { return Array(size).fill(null); });
  const dirs  = ['up', 'down', 'left', 'right'];

  function pathClear(r, c, dir) {
    const [dr, dc] = AR_DIRS[dir];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      if (board[nr][nc]) return false;
      nr += dr; nc += dc;
    }
    return true;
  }

  function getCandidates() {
    const list = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c]) continue;
        for (const dir of dirs) {
          if (pathClear(r, c, dir)) list.push({ r, c, dir });
        }
      }
    }
    return list;
  }

  const reverseSeq = [];

  while (reverseSeq.length < count) {
    const candidates = arShuffle(getCandidates());
    if (!candidates.length) break;
    const pick = candidates[0];
    board[pick.r][pick.c] = pick.dir;
    reverseSeq.push({ r: pick.r, c: pick.c, dir: pick.dir });
  }

  return {
    board:    board,
    solution: reverseSeq.slice().reverse(), // 정방향 정답
    size:     size
  };
}
