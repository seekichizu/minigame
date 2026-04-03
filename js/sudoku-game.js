'use strict';

/* ─── Sudoku Game Logic ─────────────────────── */

const sdkState = {
  puzzle:       null,
  solution:     null,
  board:        null,
  given:        null,
  selected:     null,   // { r, c }
  difficulty:   'easy',
  timerSeconds: 0,
  timerInterval:null,
  mistakes:     0,
  hints:        0,
  gameStarted:  false,
  completed:    false,
  showErrors:   false
};

const sdkEl = {};

/* ── 초기화 ─────────────────────────────────── */
function sdkInit() {
  sdkEl.grid          = document.getElementById('sdk-grid');
  sdkEl.timer         = document.getElementById('sdk-timer-value');
  sdkEl.mistakes      = document.getElementById('sdk-mistakes-value');
  sdkEl.hintsCount    = document.getElementById('sdk-hints-value');
  sdkEl.loading       = document.getElementById('sdk-loading');
  sdkEl.overlay       = document.getElementById('sdk-overlay');
  sdkEl.overlayTitle  = document.getElementById('sdk-overlay-title');
  sdkEl.overlayDesc   = document.getElementById('sdk-overlay-desc');
  sdkEl.btnStart      = document.getElementById('sdk-btn-start');
  sdkEl.banner        = document.getElementById('sdk-banner');
  sdkEl.finalTime     = document.getElementById('sdk-final-time');
  sdkEl.finalMistakes = document.getElementById('sdk-final-mistakes');

  // 난이도 버튼
  document.querySelectorAll('[data-sdk-diff]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-sdk-diff]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      sdkNewGame(btn.dataset.sdkDiff);
    });
  });

  document.getElementById('sdk-btn-new').addEventListener('click', function() {
    sdkNewGame(sdkState.difficulty);
  });
  document.getElementById('sdk-btn-hint').addEventListener('click', sdkHint);
  document.getElementById('sdk-btn-errors').addEventListener('click', sdkToggleErrors);
  document.getElementById('sdk-btn-sound').addEventListener('click', function() {
    if (typeof Sound !== 'undefined') {
      Sound.toggle();
      this.textContent = Sound.muted ? '🔇' : '🔊';
    }
  });

  sdkEl.btnStart.addEventListener('click', sdkStartGame);
  document.getElementById('sdk-btn-next').addEventListener('click', function() {
    sdkNewGame(sdkState.difficulty);
  });

  // 숫자 패드
  document.querySelectorAll('.sdk-num-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { sdkInput(parseInt(btn.dataset.num)); });
  });
  document.getElementById('sdk-btn-erase').addEventListener('click', function() { sdkInput(0); });

  // 키보드
  document.addEventListener('keydown', function(e) {
    if (!sdkState.gameStarted || sdkState.completed) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) { sdkInput(num); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { sdkInput(0); return; }
    const moves = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] };
    if (moves[e.key]) { e.preventDefault(); sdkMoveSelection(...moves[e.key]); }
  });

  if (!sdkLoadProgress()) sdkNewGame('easy');
}

/* ── 새 게임 ─────────────────────────────────── */
function sdkNewGame(difficulty) {
  sdkState.difficulty   = difficulty || 'easy';
  sdkState.gameStarted  = false;
  sdkState.completed    = false;
  sdkState.selected     = null;
  sdkState.mistakes     = 0;
  sdkState.hints        = 0;
  sdkState.timerSeconds = 0;
  sdkState.showErrors   = false;
  sdkStopTimer();

  document.getElementById('sdk-btn-errors').classList.remove('active');
  sdkEl.banner.classList.remove('show');
  sdkEl.loading.classList.add('show');
  sdkEl.overlay.classList.remove('show');

  setTimeout(function() {
    const result      = sdkGenerate(sdkState.difficulty);
    sdkState.puzzle   = result.puzzle;
    sdkState.solution = result.solution;
    sdkState.board    = result.puzzle.map(function(r) { return r.slice(); });
    sdkState.given    = result.puzzle.map(function(r) { return r.map(function(v) { return v !== 0; }); });

    sdkRenderBoard();
    sdkUpdateStats();
    sdkEl.loading.classList.remove('show');

    const names = { easy: '쉬움', medium: '보통', hard: '어려움' };
    sdkEl.overlayTitle.textContent = names[sdkState.difficulty] || '쉬움';
    sdkEl.overlayDesc.textContent  = '퍼즐이 준비됐습니다';
    sdkEl.btnStart.textContent     = '시작하기';
    sdkEl.overlay.classList.add('show');

    sdkSaveProgress();
  }, 20);
}

/* ── 시작 ───────────────────────────────────── */
function sdkStartGame() {
  sdkState.gameStarted = true;
  sdkEl.overlay.classList.remove('show');
  sdkStartTimer();
  if (typeof Sound !== 'undefined' && Sound.cellFill) Sound.cellFill();
}

/* ── 보드 렌더링 ─────────────────────────────── */
function sdkRenderBoard() {
  sdkEl.grid.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className  = 'sdk-cell';
      cell.dataset.r  = r;
      cell.dataset.c  = c;

      if (r === 3 || r === 6) cell.classList.add('box-top');
      if (c === 3 || c === 6) cell.classList.add('box-left');

      const val = sdkState.board[r][c];
      if (val) cell.textContent = val;
      if (sdkState.given[r][c]) cell.classList.add('given');

      cell.addEventListener('click', (function(row, col) {
        return function() { sdkSelectCell(row, col); };
      })(r, c));

      sdkEl.grid.appendChild(cell);
    }
  }
}

/* ── 셀 선택 & 하이라이트 ───────────────────── */
function sdkSelectCell(r, c) {
  if (!sdkState.gameStarted || sdkState.completed) return;
  sdkState.selected = { r: r, c: c };
  sdkUpdateHighlights();
}

function sdkMoveSelection(dr, dc) {
  const cur = sdkState.selected || { r: 0, c: 0 };
  sdkSelectCell(
    Math.max(0, Math.min(8, cur.r + dr)),
    Math.max(0, Math.min(8, cur.c + dc))
  );
}

function sdkUpdateHighlights() {
  const { selected, board, given, solution, showErrors } = sdkState;
  const conflicts = showErrors ? sdkGetConflicts(board) : null;

  document.querySelectorAll('.sdk-cell').forEach(function(cell) {
    const r = +cell.dataset.r;
    const c = +cell.dataset.c;
    cell.classList.remove('selected', 'highlighted', 'same-num', 'conflict', 'wrong');

    if (selected) {
      const sr = selected.r, sc = selected.c;
      if (r === sr && c === sc) {
        cell.classList.add('selected');
      } else if (
        r === sr || c === sc ||
        (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3))
      ) {
        cell.classList.add('highlighted');
      }
      const sv = board[sr][sc];
      if (sv && board[r][c] === sv) cell.classList.add('same-num');
    }

    if (showErrors) {
      if (conflicts[r][c]) cell.classList.add('conflict');
      if (board[r][c] && !given[r][c] && board[r][c] !== solution[r][c]) cell.classList.add('wrong');
    }
  });
}

/* ── 숫자 입력 ──────────────────────────────── */
function sdkInput(num) {
  if (!sdkState.gameStarted || sdkState.completed || !sdkState.selected) return;
  const { r, c } = sdkState.selected;
  if (sdkState.given[r][c]) return;

  if (num === 0) {
    sdkState.board[r][c] = 0;
    if (typeof Sound !== 'undefined' && Sound.cellErase) Sound.cellErase();
  } else {
    sdkState.board[r][c] = num;
    if (num !== sdkState.solution[r][c]) {
      sdkState.mistakes++;
      sdkUpdateStats();
      if (typeof Sound !== 'undefined' && Sound.mistake) Sound.mistake();
    } else {
      if (typeof Sound !== 'undefined' && Sound.cellFill) Sound.cellFill();
    }
  }

  const cell = sdkEl.grid.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
  if (cell) cell.textContent = num || '';

  sdkUpdateHighlights();
  sdkCheckCompletion();
  sdkSaveProgress();
}

/* ── 완성 확인 ──────────────────────────────── */
function sdkCheckCompletion() {
  const { board, solution } = sdkState;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return;
    }
  }

  sdkState.completed = true;
  sdkStopTimer();
  if (typeof Sound !== 'undefined' && Sound.puzzleComplete) Sound.puzzleComplete();
  localStorage.removeItem('sudoku_save');

  setTimeout(function() {
    sdkEl.finalTime.textContent     = sdkFormatTime(sdkState.timerSeconds);
    sdkEl.finalMistakes.textContent = sdkState.mistakes;
    sdkEl.banner.classList.add('show');
  }, 500);
}

/* ── 힌트 ───────────────────────────────────── */
function sdkHint() {
  if (!sdkState.gameStarted || sdkState.completed) return;

  const candidates = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!sdkState.given[r][c] && sdkState.board[r][c] !== sdkState.solution[r][c]) {
        candidates.push({ r: r, c: c });
      }
    }
  }
  if (candidates.length === 0) return;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  sdkState.board[pick.r][pick.c] = sdkState.solution[pick.r][pick.c];
  sdkState.hints++;
  sdkUpdateStats();

  const cell = sdkEl.grid.querySelector('[data-r="' + pick.r + '"][data-c="' + pick.c + '"]');
  if (cell) {
    cell.textContent = sdkState.solution[pick.r][pick.c];
    cell.classList.add('hinted');
  }

  sdkState.selected = pick;
  sdkUpdateHighlights();
  sdkCheckCompletion();
  sdkSaveProgress();

  if (typeof Sound !== 'undefined' && Sound.hint) Sound.hint();
}

/* ── 오류 표시 토글 ─────────────────────────── */
function sdkToggleErrors() {
  sdkState.showErrors = !sdkState.showErrors;
  document.getElementById('sdk-btn-errors').classList.toggle('active', sdkState.showErrors);
  sdkUpdateHighlights();
}

/* ── 타이머 ─────────────────────────────────── */
function sdkStartTimer() {
  sdkStopTimer();
  sdkState.timerInterval = setInterval(function() {
    sdkState.timerSeconds++;
    sdkEl.timer.textContent = sdkFormatTime(sdkState.timerSeconds);
    sdkSaveProgress();
  }, 1000);
}

function sdkStopTimer() {
  if (sdkState.timerInterval) { clearInterval(sdkState.timerInterval); sdkState.timerInterval = null; }
}

function sdkFormatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
}

/* ── 스탯 업데이트 ──────────────────────────── */
function sdkUpdateStats() {
  sdkEl.timer.textContent      = sdkFormatTime(sdkState.timerSeconds);
  sdkEl.mistakes.textContent   = sdkState.mistakes;
  sdkEl.hintsCount.textContent = sdkState.hints;
  const pill = document.getElementById('sdk-mistakes-pill');
  if (pill) pill.classList.toggle('warn', sdkState.mistakes >= 3);
}

/* ── 저장 / 복원 ─────────────────────────────── */
function sdkSaveProgress() {
  if (sdkState.completed) return;
  try {
    localStorage.setItem('sudoku_save', JSON.stringify({
      puzzle:       sdkState.puzzle,
      solution:     sdkState.solution,
      board:        sdkState.board,
      given:        sdkState.given,
      difficulty:   sdkState.difficulty,
      timerSeconds: sdkState.timerSeconds,
      mistakes:     sdkState.mistakes,
      hints:        sdkState.hints
    }));
  } catch (e) {}
}

function sdkLoadProgress() {
  try {
    const raw = localStorage.getItem('sudoku_save');
    if (!raw) return false;
    const d = JSON.parse(raw);

    sdkState.puzzle       = d.puzzle;
    sdkState.solution     = d.solution;
    sdkState.board        = d.board;
    sdkState.given        = d.given;
    sdkState.difficulty   = d.difficulty || 'easy';
    sdkState.timerSeconds = d.timerSeconds || 0;
    sdkState.mistakes     = d.mistakes || 0;
    sdkState.hints        = d.hints || 0;
    sdkState.gameStarted  = false;
    sdkState.completed    = false;

    document.querySelectorAll('[data-sdk-diff]').forEach(function(b) {
      b.classList.toggle('active', b.dataset.sdkDiff === sdkState.difficulty);
    });

    sdkRenderBoard();
    sdkUpdateStats();
    sdkUpdateHighlights();

    sdkEl.loading.classList.remove('show');

    const names = { easy: '쉬움', medium: '보통', hard: '어려움' };
    sdkEl.overlayTitle.textContent = names[sdkState.difficulty] || '쉬움';
    sdkEl.overlayDesc.textContent  = '이어서 풀까요?';
    sdkEl.btnStart.textContent     = '이어하기';
    sdkEl.overlay.classList.add('show');

    return true;
  } catch (e) { return false; }
}

document.addEventListener('DOMContentLoaded', sdkInit);
