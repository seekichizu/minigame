'use strict';

/* ─── Arrow Puzzle Game ─────────────────────── */

const arState = {
  board:        null,
  size:         4,
  solution:     null,
  history:      [],   // 실행 취소용 [{r, c, dir}]
  difficulty:   'easy',
  timerSeconds: 0,
  timerInterval:null,
  moves:        0,
  totalArrows:  0,
  gameStarted:  false,
  completed:    false
};

const arEl = {};

/* ── 초기화 ─────────────────────────────────── */
function arInit() {
  arEl.grid      = document.getElementById('ar-grid');
  arEl.timer     = document.getElementById('ar-timer-value');
  arEl.moves     = document.getElementById('ar-moves-value');
  arEl.remain    = document.getElementById('ar-remain-value');
  arEl.loading   = document.getElementById('ar-loading');
  arEl.overlay   = document.getElementById('ar-overlay');
  arEl.ovTitle   = document.getElementById('ar-overlay-title');
  arEl.ovDesc    = document.getElementById('ar-overlay-desc');
  arEl.btnStart  = document.getElementById('ar-btn-start');
  arEl.banner    = document.getElementById('ar-banner');
  arEl.finalTime = document.getElementById('ar-final-time');
  arEl.finalMoves= document.getElementById('ar-final-moves');

  document.querySelectorAll('[data-ar-diff]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-ar-diff]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      arNewGame(btn.dataset.arDiff);
    });
  });

  document.getElementById('ar-btn-new').addEventListener('click', function() { arNewGame(arState.difficulty); });
  document.getElementById('ar-btn-undo').addEventListener('click', arUndo);
  document.getElementById('ar-btn-sound').addEventListener('click', function() {
    if (typeof Sound !== 'undefined') {
      Sound.toggle();
      this.textContent = Sound.muted ? '🔇' : '🔊';
    }
  });

  arEl.btnStart.addEventListener('click', arStartGame);
  document.getElementById('ar-btn-next').addEventListener('click', function() { arNewGame(arState.difficulty); });

  if (!arLoadProgress()) arNewGame('easy');
}

/* ── 새 게임 ─────────────────────────────────── */
function arNewGame(difficulty) {
  arState.difficulty   = difficulty || 'easy';
  arState.gameStarted  = false;
  arState.completed    = false;
  arState.history      = [];
  arState.moves        = 0;
  arState.timerSeconds = 0;
  arStopTimer();

  arEl.banner.classList.remove('show');
  arEl.loading.classList.add('show');
  arEl.overlay.classList.remove('show');

  setTimeout(function() {
    const result      = arGenerate(arState.difficulty);
    arState.board     = result.board;
    arState.solution  = result.solution;
    arState.size      = result.size;
    arState.totalArrows = result.solution.length;

    arRenderBoard();
    arUpdateStats();

    arEl.loading.classList.remove('show');
    const names = { easy: '쉬움', medium: '보통', hard: '어려움' };
    arEl.ovTitle.textContent  = names[arState.difficulty] || '쉬움';
    arEl.ovDesc.textContent   = '화살표를 순서에 맞게 빼세요!';
    arEl.btnStart.textContent = '시작하기';
    arEl.overlay.classList.add('show');

    arSaveProgress();
  }, 20);
}

/* ── 시작 ───────────────────────────────────── */
function arStartGame() {
  arState.gameStarted = true;
  arEl.overlay.classList.remove('show');
  arStartTimer();
  if (typeof Sound !== 'undefined' && Sound.cellFill) Sound.cellFill();
}

/* ── 곡선 SVG 화살표 생성 ───────────────────── */
function arMakeSVG(dir) {
  // 각 방향별 곡선 화살표 SVG path (shaft S곡선 + 화살촉)
  const paths = {
    right: 'M 7,28 C 14,14 32,42 49,28 M 39,20 L 49,28 L 39,36',
    left:  'M 49,28 C 42,14 24,42 7,28 M 17,20 L 7,28 L 17,36',
    up:    'M 28,49 C 14,42 42,24 28,7 M 20,17 L 28,7 L 36,17',
    down:  'M 28,7 C 14,14 42,32 28,49 M 20,39 L 28,49 L 36,39'
  };
  const ns  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 56 56');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('ar-arrow');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', paths[dir] || '');
  svg.appendChild(path);
  return svg;
}

/* ── 보드 렌더링 ─────────────────────────────── */
function arRenderBoard() {
  const { board, size } = arState;
  arEl.grid.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
  arEl.grid.style.setProperty('--ar-cols', size);
  arEl.grid.innerHTML = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className  = 'ar-cell';
      cell.dataset.r  = r;
      cell.dataset.c  = c;

      if (board[r][c]) {
        cell.dataset.dir = board[r][c];
        cell.appendChild(arMakeSVG(board[r][c]));
        if (arCanRemove(board, r, c)) cell.classList.add('removable');
      } else {
        cell.classList.add('empty');
      }

      cell.addEventListener('click', (function(row, col) {
        return function() { arClickCell(row, col); };
      })(r, c));

      arEl.grid.appendChild(cell);
    }
  }
}

/* ── 셀 클릭 ────────────────────────────────── */
function arClickCell(r, c) {
  if (!arState.gameStarted || arState.completed) return;
  if (!arState.board[r][c]) return;

  if (!arCanRemove(arState.board, r, c)) {
    // 막힌 화살표 — 흔들림 효과
    const cell = arEl.grid.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
    if (cell && !cell.classList.contains('shaking')) {
      cell.classList.add('shaking');
      setTimeout(function() { cell.classList.remove('shaking'); }, 400);
    }
    if (typeof Sound !== 'undefined' && Sound.mistake) Sound.mistake();
    return;
  }

  arRemoveArrow(r, c);
}

/* ── 화살표 제거 ─────────────────────────────── */
function arRemoveArrow(r, c) {
  const dir = arState.board[r][c];
  arState.history.push({ r: r, c: c, dir: dir });
  arState.board[r][c] = null;
  arState.moves++;

  const cell = arEl.grid.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
  if (cell) {
    cell.classList.remove('removable');
    cell.classList.add('exiting', 'exit-' + dir);
    setTimeout(function() {
      cell.className = 'ar-cell empty';
      cell.innerHTML = '';
      delete cell.dataset.dir;
      arUpdateRemovable();
      arUpdateStats();
      arCheckCompletion();
    }, 280);
  }

  if (typeof Sound !== 'undefined' && Sound.cellFill) Sound.cellFill();
  arSaveProgress();
}

/* ── 제거 가능 상태 갱신 ─────────────────────── */
function arUpdateRemovable() {
  document.querySelectorAll('.ar-cell:not(.empty)').forEach(function(cell) {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (arState.board[r] && arState.board[r][c]) {
      cell.classList.toggle('removable', arCanRemove(arState.board, r, c));
    }
  });
}

/* ── 실행 취소 ──────────────────────────────── */
function arUndo() {
  if (!arState.gameStarted || !arState.history.length) return;
  const { r, c, dir } = arState.history.pop();
  arState.board[r][c] = dir;
  arState.moves = Math.max(0, arState.moves - 1);

  const cell = arEl.grid.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
  if (cell) {
    cell.className = 'ar-cell';
    cell.dataset.dir = dir;
    cell.innerHTML = '';
    cell.appendChild(arMakeSVG(dir));
    if (arCanRemove(arState.board, r, c)) cell.classList.add('removable');
  }

  arUpdateRemovable();
  arUpdateStats();
  if (typeof Sound !== 'undefined' && Sound.cellErase) Sound.cellErase();
  arSaveProgress();
}

/* ── 완성 확인 ──────────────────────────────── */
function arCheckCompletion() {
  const hasArrows = arState.board.some(function(row) { return row.some(function(v) { return v !== null; }); });
  if (hasArrows) return;

  arState.completed = true;
  arStopTimer();
  if (typeof Sound !== 'undefined' && Sound.puzzleComplete) Sound.puzzleComplete();
  localStorage.removeItem('arrow_save');

  setTimeout(function() {
    arEl.finalTime.textContent  = arFormatTime(arState.timerSeconds);
    arEl.finalMoves.textContent = arState.moves;
    arEl.banner.classList.add('show');
  }, 400);
}

/* ── 타이머 ─────────────────────────────────── */
function arStartTimer() {
  arStopTimer();
  arState.timerInterval = setInterval(function() {
    arState.timerSeconds++;
    arEl.timer.textContent = arFormatTime(arState.timerSeconds);
    arSaveProgress();
  }, 1000);
}

function arStopTimer() {
  if (arState.timerInterval) { clearInterval(arState.timerInterval); arState.timerInterval = null; }
}

function arFormatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
}

/* ── 스탯 업데이트 ──────────────────────────── */
function arUpdateStats() {
  arEl.timer.textContent  = arFormatTime(arState.timerSeconds);
  arEl.moves.textContent  = arState.moves;
  const remaining = arState.board ? arState.board.flat().filter(Boolean).length : 0;
  arEl.remain.textContent = remaining;
}

/* ── 저장 / 복원 ─────────────────────────────── */
function arSaveProgress() {
  if (arState.completed) return;
  try {
    localStorage.setItem('arrow_save', JSON.stringify({
      board:        arState.board,
      solution:     arState.solution,
      size:         arState.size,
      history:      arState.history,
      difficulty:   arState.difficulty,
      timerSeconds: arState.timerSeconds,
      moves:        arState.moves,
      totalArrows:  arState.totalArrows
    }));
  } catch(e) {}
}

function arLoadProgress() {
  try {
    const raw = localStorage.getItem('arrow_save');
    if (!raw) return false;
    const d = JSON.parse(raw);

    arState.board        = d.board;
    arState.solution     = d.solution;
    arState.size         = d.size || 4;
    arState.history      = d.history || [];
    arState.difficulty   = d.difficulty || 'easy';
    arState.timerSeconds = d.timerSeconds || 0;
    arState.moves        = d.moves || 0;
    arState.totalArrows  = d.totalArrows || 0;
    arState.gameStarted  = false;
    arState.completed    = false;

    document.querySelectorAll('[data-ar-diff]').forEach(function(b) {
      b.classList.toggle('active', b.dataset.arDiff === arState.difficulty);
    });

    arRenderBoard();
    arUpdateStats();
    arEl.loading.classList.remove('show');

    const names = { easy: '쉬움', medium: '보통', hard: '어려움' };
    arEl.ovTitle.textContent  = names[arState.difficulty] || '쉬움';
    arEl.ovDesc.textContent   = '이어서 풀까요?';
    arEl.btnStart.textContent = '이어하기';
    arEl.overlay.classList.add('show');

    return true;
  } catch(e) { return false; }
}

document.addEventListener('DOMContentLoaded', arInit);
