/**
 * solver.js — Nonogram 라인 솔버 & 유일해 검증
 *
 * 핵심 알고리즘: Constraint Propagation (제약 전파)
 *   각 행/열의 힌트에 맞는 모든 permutation을 구해
 *   공통으로 확정된 셀을 보드에 반영, 반복 수렴.
 *   수렴이 멈추면 백트래킹으로 진행.
 *
 * 셀 값: 0 = 미결정, 1 = 채움(filled), 2 = 빈칸(empty)
 */

// ──────────────────────────────────────────────
// Clue 추출
// ──────────────────────────────────────────────

/**
 * 이진 배열(0/1)에서 노노그램 힌트 숫자 배열 추출
 * [1,1,0,1,1,1,0,1] → [2, 3, 1]
 */
function getClues(line) {
  const clues = [];
  let count = 0;
  for (const cell of line) {
    if (cell === 1) {
      count++;
    } else if (count > 0) {
      clues.push(count);
      count = 0;
    }
  }
  if (count > 0) clues.push(count);
  return clues.length > 0 ? clues : [0];
}

// ──────────────────────────────────────────────
// Permutation 생성 (힌트에 맞는 모든 배치 열거)
// ──────────────────────────────────────────────

/**
 * 길이 len인 줄에 clues를 배치하는 모든 유효한 배열 반환
 * 캐시를 사용해 같은 (len, clues) 조합은 재계산하지 않음
 */
const _permCache = new Map();

function getPermutations(len, clues) {
  const key = `${len}:${clues.join(',')}`;
  if (_permCache.has(key)) return _permCache.get(key);

  const results = [];

  function place(pos, clueIdx, current) {
    if (clueIdx === clues.length) {
      // 남은 칸 모두 빈칸
      const row = current.slice();
      while (row.length < len) row.push(2);
      results.push(row);
      return;
    }

    const clue = clues[clueIdx];
    // 남은 힌트들이 들어갈 최소 공간
    let minRemaining = 0;
    for (let i = clueIdx + 1; i < clues.length; i++) {
      minRemaining += clues[i] + 1; // 각 블록 + 구분 공백
    }

    const maxStart = len - clue - minRemaining;

    for (let start = pos; start <= maxStart; start++) {
      const next = current.slice();
      // start까지 빈칸
      for (let i = current.length; i < start; i++) next.push(2);
      // clue만큼 채움
      for (let i = 0; i < clue; i++) next.push(1);

      place(start + clue + 1, clueIdx + 1, next);
    }
  }

  place(0, 0, []);
  _permCache.set(key, results);
  return results;
}

// ──────────────────────────────────────────────
// 라인 필터링 (현재 보드 상태에 모순되는 permutation 제거)
// ──────────────────────────────────────────────

/**
 * 현재 줄 상태(current)와 일치하는 permutation만 필터링
 * current 값: 0=미결정, 1=채움, 2=빈칸
 */
function filterPerms(perms, current) {
  return perms.filter(perm => {
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== 0 && current[i] !== perm[i]) return false;
    }
    return true;
  });
}

/**
 * 유효한 permutation들에서 모든 배치에서 동일한 셀만 확정
 * 반환: 업데이트된 줄 배열 (변화 없으면 같은 배열 반환)
 */
function resolveLineFromPerms(validPerms, current) {
  if (validPerms.length === 0) return null; // 모순

  const len = current.length;
  const resolved = current.slice();

  for (let i = 0; i < len; i++) {
    if (resolved[i] !== 0) continue; // 이미 확정
    const val = validPerms[0][i];
    if (validPerms.every(p => p[i] === val)) {
      resolved[i] = val;
    }
  }
  return resolved;
}

// ──────────────────────────────────────────────
// 보드 유틸
// ──────────────────────────────────────────────

function getRow(board, size, r) {
  return board.slice(r * size, r * size + size);
}

function getCol(board, size, c) {
  const col = [];
  for (let r = 0; r < size; r++) col.push(board[r * size + c]);
  return col;
}

function setRow(board, size, r, line) {
  for (let i = 0; i < size; i++) board[r * size + i] = line[i];
}

function setCol(board, size, c, line) {
  for (let r = 0; r < size; r++) board[r * size + c] = line[r];
}

function isSolved(board) {
  return board.every(v => v !== 0);
}

function isContradiction(board, rowClues, colClues, size) {
  // 빠른 모순 체크: 어느 줄이든 유효한 permutation이 0이면 모순
  for (let r = 0; r < size; r++) {
    const line = getRow(board, size, r);
    const perms = getPermutations(size, rowClues[r]);
    if (filterPerms(perms, line).length === 0) return true;
  }
  for (let c = 0; c < size; c++) {
    const line = getCol(board, size, c);
    const perms = getPermutations(size, colClues[c]);
    if (filterPerms(perms, line).length === 0) return true;
  }
  return false;
}

// ──────────────────────────────────────────────
// 메인 솔버
// ──────────────────────────────────────────────

/**
 * 제약 전파 한 라운드
 * 변화가 있으면 true 반환
 */
function propagateOnce(board, rowClues, colClues, size) {
  let changed = false;

  for (let r = 0; r < size; r++) {
    const line = getRow(board, size, r);
    const perms = getPermutations(size, rowClues[r]);
    const valid = filterPerms(perms, line);
    if (valid.length === 0) return null; // 모순
    const resolved = resolveLineFromPerms(valid, line);
    if (resolved === null) return null;
    for (let i = 0; i < size; i++) {
      if (board[r * size + i] !== resolved[i]) {
        board[r * size + i] = resolved[i];
        changed = true;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    const line = getCol(board, size, c);
    const perms = getPermutations(size, colClues[c]);
    const valid = filterPerms(perms, line);
    if (valid.length === 0) return null;
    const resolved = resolveLineFromPerms(valid, line);
    if (resolved === null) return null;
    for (let r = 0; r < size; r++) {
      if (board[r * size + c] !== resolved[r]) {
        board[r * size + c] = resolved[r];
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * 수렴할 때까지 제약 전파 반복
 * 반환: 해결된 board 또는 null (모순)
 */
function propagate(board, rowClues, colClues, size) {
  const b = board.slice();
  while (true) {
    const changed = propagateOnce(b, rowClues, colClues, size);
    if (changed === null) return null; // 모순
    if (!changed) break;
  }
  return b;
}

/**
 * 미결정 셀 중 가장 제약이 많은 셀 인덱스 반환
 * (유효 permutation 수가 가장 적은 줄의 셀 선택)
 */
function pickCell(board, rowClues, colClues, size) {
  let bestIdx = -1;
  let bestScore = Infinity;

  for (let r = 0; r < size; r++) {
    const line = getRow(board, size, r);
    if (line.every(v => v !== 0)) continue;
    const perms = getPermutations(size, rowClues[r]);
    const valid = filterPerms(perms, line);
    for (let i = 0; i < size; i++) {
      if (board[r * size + i] === 0 && valid.length < bestScore) {
        bestScore = valid.length;
        bestIdx = r * size + i;
      }
    }
  }
  return bestIdx;
}

/**
 * 노노그램 솔버 (제약전파 + 백트래킹)
 *
 * @param {number[]} rowClues
 * @param {number[]} colClues
 * @param {number} size
 * @param {number} [maxSolutions=1] - 이 수 이상 해를 찾으면 중단
 * @returns {Uint8Array|null} 해결된 보드 또는 null
 */
function solve(rowClues, colClues, size, maxSolutions = 1) {
  const solutions = [];

  function search(board) {
    if (solutions.length >= maxSolutions) return;

    const propagated = propagate(board, rowClues, colClues, size);
    if (propagated === null) return; // 모순

    if (isSolved(propagated)) {
      solutions.push(propagated.slice());
      return;
    }

    // 백트래킹: 미결정 셀 선택
    const idx = pickCell(propagated, rowClues, colClues, size);
    if (idx === -1) return;

    for (const val of [1, 2]) { // 채움 먼저 시도
      const next = propagated.slice();
      next[idx] = val;
      search(next);
      if (solutions.length >= maxSolutions) return;
    }
  }

  const emptyBoard = new Array(size * size).fill(0);
  search(emptyBoard);

  return solutions.length > 0 ? solutions[0] : null;
}

/**
 * 퍼즐이 유일해를 가지는지 검증
 * solve를 최대 2개 해를 찾도록 실행해 1개이면 true
 */
function hasUniqueSolution(rowClues, colClues, size) {
  const solutions = [];

  function search(board) {
    if (solutions.length > 1) return;

    const propagated = propagate(board, rowClues, colClues, size);
    if (propagated === null) return;

    if (isSolved(propagated)) {
      solutions.push(1);
      return;
    }

    const idx = pickCell(propagated, rowClues, colClues, size);
    if (idx === -1) return;

    for (const val of [1, 2]) {
      const next = propagated.slice();
      next[idx] = val;
      search(next);
      if (solutions.length > 1) return;
    }
  }

  search(new Array(size * size).fill(0));
  return solutions.length === 1;
}

// 캐시 초기화 (난이도 변경 시 메모리 관리용)
function clearPermCache() {
  _permCache.clear();
}
