/**
 * game.js — 노노그램 게임 상태 & UI 인터랙션
 *
 * 셀 값:
 *   0 = 미결정 (빈 칸)
 *   1 = 채움 (filled, 검정)
 *   2 = X 표시 (marked, 빈칸 확정)
 *
 * solution도 같은 인코딩 사용 (solver.js 결과 그대로)
 */

// ──────────────────────────────────────────────
// 게임 상태
// ──────────────────────────────────────────────

let state = null;
/*
state = {
  size,
  rowClues, colClues,
  solution,      // Uint8Array, 1=채움, 2=빈칸
  board,         // Uint8Array, 0=미결정, 1=채움, 2=X
  difficulty,
  completed,
  mistakes,
  timerInterval,
  timerSeconds,
  hintsUsed,
}
*/

let currentDifficulty = 'easy';
let isDragging = false;
let dragValue = null;    // 드래그 중 채울 값
let showErrors = false;

// ──────────────────────────────────────────────
// DOM 참조
// ──────────────────────────────────────────────

const boardEl        = document.getElementById('board');
const loadingEl      = document.getElementById('loading');
const completeBanner = document.getElementById('complete-banner');
const startOverlay   = document.getElementById('start-overlay');
const timerEl        = document.getElementById('timer-value');
const mistakesEl     = document.getElementById('mistakes-value');
const hintsEl        = document.getElementById('hints-value');
const finalTimeEl    = document.getElementById('final-time');
const finalMistakeEl = document.getElementById('final-mistakes');

// ──────────────────────────────────────────────
// 게임 시작
// ──────────────────────────────────────────────

function newGame(difficulty) {
  currentDifficulty = difficulty || currentDifficulty;
  updateDifficultyButtons();

  showLoading(true);
  completeBanner.classList.remove('show');
  startOverlay.classList.remove('show');

  requestAnimationFrame(() => {
    setTimeout(() => {
      const puzzle = generatePuzzle(currentDifficulty);

      state = {
        size: puzzle.size,
        rowClues: puzzle.rowClues,
        colClues: puzzle.colClues,
        solution: puzzle.solution,
        board: new Uint8Array(puzzle.size * puzzle.size),
        difficulty: currentDifficulty,
        completed: false,
        mistakes: 0,
        timerInterval: null,
        timerSeconds: 0,
        hintsUsed: 0,
      };

      saveProgress();
      renderBoard();
      showLoading(false);
      showStartOverlay();   // 타이머 시작 전에 시작 화면 표시
    }, 30);
  });
}

function showStartOverlay(isResume = false) {
  const labels = { easy: '쉬움 · 5×5', medium: '보통 · 10×10', hard: '어려움 · 15×15' };
  document.getElementById('start-title').textContent = labels[currentDifficulty] || '';
  document.getElementById('start-desc').textContent = isResume ? '이어서 풀까요?' : '퍼즐이 준비됐습니다';
  document.querySelector('.start-icon').textContent = isResume ? '▶️' : '🧩';
  document.getElementById('btn-start').textContent = isResume ? '이어하기' : '시작하기';
  startOverlay.classList.add('show');
}

function startGame() {
  startOverlay.classList.remove('show');
  const savedSeconds = state.timerSeconds; // 이어하기인 경우 시간 보존
  startTimer();
  state.timerSeconds = savedSeconds;
  updateStats();
}

// ──────────────────────────────────────────────
// 보드 렌더링
// ──────────────────────────────────────────────

function renderBoard() {
  const { size, rowClues, colClues } = state;

  // 최대 힌트 길이 (컬럼 헤더 높이, 행 헤더 너비 결정)
  const maxColClueLen = Math.max(...colClues.map(c => c.length));
  const maxRowClueLen = Math.max(...rowClues.map(r => r.length));

  boardEl.innerHTML = '';

  // CSS Grid: 열 = 행힌트(auto×maxRowClueLen) + 게임셀(32px×size)
  //           행 = 열힌트(auto×maxColClueLen) + 게임셀(32px×size)
  boardEl.style.gridTemplateColumns = `repeat(${maxRowClueLen}, auto) repeat(${size}, 32px)`;
  boardEl.style.gridTemplateRows    = `repeat(${maxColClueLen}, auto) repeat(${size}, 32px)`;

  // ── 열 힌트 헤더 행 (maxColClueLen 행) ──
  for (let cr = 0; cr < maxColClueLen; cr++) {
    // 왼쪽 코너 빈칸
    for (let cc = 0; cc < maxRowClueLen; cc++) {
      const corner = document.createElement('div');
      corner.className = 'corner-cell';
      boardEl.appendChild(corner);
    }
    // 각 열의 cr번째 힌트 숫자
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'clue-cell col-clue';
      cell.dataset.col = c;

      const clue = colClues[c];
      const padCount = maxColClueLen - clue.length;
      if (cr >= padCount) {
        const span = document.createElement('span');
        span.className = 'clue-num';
        span.textContent = clue[cr - padCount];
        cell.appendChild(span);
      }
      boardEl.appendChild(cell);
    }
  }

  // ── 게임 행 (size 행) ──
  for (let r = 0; r < size; r++) {
    // 행 힌트 (한 행당 maxRowClueLen 칸)
    const rowClue = rowClues[r];
    const rowPad = maxRowClueLen - rowClue.length;
    for (let cc = 0; cc < maxRowClueLen; cc++) {
      const cell = document.createElement('div');
      cell.className = 'clue-cell row-clue';
      cell.dataset.row = r;
      if (cc >= rowPad) {
        const span = document.createElement('span');
        span.className = 'clue-num';
        span.textContent = rowClue[cc - rowPad];
        cell.appendChild(span);
      }
      boardEl.appendChild(cell);
    }

    // 게임 셀
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'game-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      // 5셀마다 굵은 구분선
      if ((c + 1) % 5 === 0 && c + 1 < size) cell.classList.add('border-right-thick');
      if ((r + 1) % 5 === 0 && r + 1 < size) cell.classList.add('border-bottom-thick');

      cell.addEventListener('mousedown', onCellMouseDown);
      cell.addEventListener('mouseenter', onCellMouseEnter);
      cell.addEventListener('contextmenu', onCellRightClick);
      cell.addEventListener('touchstart', onCellTouchStart, { passive: false });
      cell.addEventListener('touchmove', onCellTouchMove, { passive: false });

      boardEl.appendChild(cell);
    }
  }

  document.addEventListener('mouseup', () => { isDragging = false; dragValue = null; });

  updateBoardDisplay();
  updateClueHighlights();
}

// ──────────────────────────────────────────────
// 셀 값 → CSS 클래스 반영
// ──────────────────────────────────────────────

function updateBoardDisplay() {
  if (!state) return;
  const { size, board, solution, completed } = state;

  const cells = boardEl.querySelectorAll('.game-cell');
  cells.forEach(cell => {
    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);
    const idx = r * size + c;
    const val = board[idx];

    cell.classList.remove('filled', 'marked', 'error', 'hinted');

    if (val === 1) {
      cell.classList.add('filled');
      // 오류 표시
      if (showErrors && !completed && solution[idx] !== 1) {
        cell.classList.add('error');
      }
    } else if (val === 2) {
      cell.classList.add('marked');
    }
  });
}

function updateClueHighlights() {
  if (!state) return;
  const { size, board, rowClues, colClues } = state;

  // 행 힌트 done 처리
  boardEl.querySelectorAll('.clue-cell.row-clue').forEach(cell => {
    const r = parseInt(cell.dataset.row);
    const line = [];
    for (let c = 0; c < size; c++) line.push(board[r * size + c] === 1 ? 1 : 0);
    const clues = getClues(line);
    const match = JSON.stringify(clues) === JSON.stringify(rowClues[r]);
    cell.classList.toggle('done', match);
  });

  // 열 힌트 done 처리
  boardEl.querySelectorAll('.clue-cell.col-clue').forEach(cell => {
    const c = parseInt(cell.dataset.col);
    const line = [];
    for (let r = 0; r < size; r++) line.push(board[r * size + c] === 1 ? 1 : 0);
    const clues = getClues(line);
    const match = JSON.stringify(clues) === JSON.stringify(colClues[c]);
    cell.classList.toggle('done', match);
  });
}

// ──────────────────────────────────────────────
// 셀 인터랙션
// ──────────────────────────────────────────────

function setCellValue(r, c, val) {
  if (!state || state.completed) return;
  const idx = r * state.size + c;
  state.board[idx] = val;
}

function onCellMouseDown(e) {
  if (e.button === 2) return; // 오른쪽 클릭은 contextmenu에서 처리
  e.preventDefault();
  const r = parseInt(this.dataset.r);
  const c = parseInt(this.dataset.c);
  const idx = r * state.size + c;

  // 현재 값 → 다음 값 토글
  const cur = state.board[idx];
  dragValue = cur === 1 ? 0 : 1; // 채움 토글

  setCellValue(r, c, dragValue);
  isDragging = true;

  if (dragValue === 1) Sound.cellFill();
  else Sound.cellErase();

  afterCellChange();
}

function onCellMouseEnter(e) {
  if (!isDragging || dragValue === null) return;
  const r = parseInt(this.dataset.r);
  const c = parseInt(this.dataset.c);
  setCellValue(r, c, dragValue);
  afterCellChange();
}

function onCellRightClick(e) {
  e.preventDefault();
  const r = parseInt(this.dataset.r);
  const c = parseInt(this.dataset.c);
  const idx = r * state.size + c;
  const cur = state.board[idx];
  state.board[idx] = cur === 2 ? 0 : 2; // X 토글
  if (state.board[idx] === 2) Sound.cellMark();
  afterCellChange();
}

// 터치 지원
let touchStartCell = null;
let touchDragValue = null;

function onCellTouchStart(e) {
  e.preventDefault();
  const r = parseInt(this.dataset.r);
  const c = parseInt(this.dataset.c);
  const idx = r * state.size + c;
  const cur = state.board[idx];
  touchDragValue = cur === 1 ? 0 : 1;
  touchStartCell = { r, c };
  setCellValue(r, c, touchDragValue);
  afterCellChange();
}

function onCellTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!el || !el.classList.contains('game-cell')) return;
  const r = parseInt(el.dataset.r);
  const c = parseInt(el.dataset.c);
  if (touchDragValue === null) return;
  setCellValue(r, c, touchDragValue);
  afterCellChange();
}

function afterCellChange() {
  const prevCompletedLines = countCompletedLines();
  updateBoardDisplay();
  updateClueHighlights();
  const newMistakes = countMistakes();
  if (newMistakes > state.mistakes) Sound.mistake();
  state.mistakes = newMistakes;
  const newCompletedLines = countCompletedLines();
  if (newCompletedLines > prevCompletedLines) Sound.lineComplete();
  updateStats();
  saveProgress();
  checkCompletion();
}

// 현재 완성된 행+열 수 (힌트와 일치하는 줄)
function countCompletedLines() {
  if (!state) return 0;
  const { size, board, rowClues, colClues } = state;
  let count = 0;
  for (let r = 0; r < size; r++) {
    const line = Array.from({length: size}, (_, c) => board[r * size + c] === 1 ? 1 : 0);
    if (JSON.stringify(getClues(line)) === JSON.stringify(rowClues[r])) count++;
  }
  for (let c = 0; c < size; c++) {
    const line = Array.from({length: size}, (_, r) => board[r * size + c] === 1 ? 1 : 0);
    if (JSON.stringify(getClues(line)) === JSON.stringify(colClues[c])) count++;
  }
  return count;
}

// 현재 보드에서 잘못 채운 셀 수 반환
function countMistakes() {
  const { size, board, solution } = state;
  let count = 0;
  for (let i = 0; i < size * size; i++) {
    if (board[i] === 1 && solution[i] !== 1) count++;
  }
  return count;
}

// ──────────────────────────────────────────────
// 완성 감지
// ──────────────────────────────────────────────

function checkCompletion() {
  if (!state || state.completed) return;
  const { size, board, solution } = state;

  // 채움 셀이 정답과 일치하는지 확인 (X 마크는 관계없음)
  for (let i = 0; i < size * size; i++) {
    const boardFilled = board[i] === 1;
    const solFilled = solution[i] === 1;
    if (boardFilled !== solFilled) return;
  }

  state.completed = true;
  stopTimer();
  Sound.puzzleComplete();
  celebrateCompletion();
}

function celebrateCompletion() {
  const { size, timerSeconds, mistakes, hintsUsed } = state;

  // 셀 팝 애니메이션
  const cells = boardEl.querySelectorAll('.game-cell');
  cells.forEach((cell, i) => {
    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);
    setTimeout(() => {
      cell.classList.add('celebrate');
    }, (r + c) * 20);
  });

  finalTimeEl.textContent = formatTime(timerSeconds);
  finalMistakeEl.textContent = mistakes;
  completeBanner.classList.add('show');

  clearSavedProgress();
}

// ──────────────────────────────────────────────
// 힌트
// ──────────────────────────────────────────────

function giveHint() {
  if (!state || state.completed) return;
  const { size, board, solution } = state;

  // 아직 채우지 않은 채움 셀 중 랜덤 공개
  const candidates = [];
  for (let i = 0; i < size * size; i++) {
    if (solution[i] === 1 && board[i] !== 1) candidates.push(i);
  }

  if (candidates.length === 0) return;

  const idx = candidates[Math.floor(Math.random() * candidates.length)];
  board[idx] = 1;
  state.hintsUsed++;
  Sound.hint();

  const r = Math.floor(idx / size);
  const c = idx % size;

  // 힌트 셀 강조
  const cell = boardEl.querySelector(`.game-cell[data-r="${r}"][data-c="${c}"]`);
  if (cell) {
    cell.classList.add('filled', 'hinted');
  }

  updateBoardDisplay();
  updateClueHighlights();
  updateStats();
  saveProgress();
  checkCompletion();
}

// ──────────────────────────────────────────────
// 오류 표시 토글
// ──────────────────────────────────────────────

function toggleErrors() {
  showErrors = !showErrors;
  const btn = document.getElementById('btn-errors');
  btn.textContent = showErrors ? '오류 숨기기' : '오류 표시';
  updateBoardDisplay();
}

// ──────────────────────────────────────────────
// 타이머
// ──────────────────────────────────────────────

function startTimer() {
  stopTimer();
  state.timerSeconds = 0;
  updateStats();
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    updateStats();
  }, 1000);
}

function stopTimer() {
  if (state && state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function updateStats() {
  if (!state) return;
  timerEl.textContent = formatTime(state.timerSeconds);
  mistakesEl.textContent = state.mistakes;
  const pill = document.getElementById('mistakes-pill');
  if (pill) pill.classList.toggle('warn', state.mistakes >= 3);
  if (hintsEl) hintsEl.textContent = state.hintsUsed;
}

// ──────────────────────────────────────────────
// 진행 저장 (localStorage)
// ──────────────────────────────────────────────

const SAVE_KEY = 'nonogram_save';

function saveProgress() {
  if (!state) return;
  const save = {
    size: state.size,
    rowClues: state.rowClues,
    colClues: state.colClues,
    solution: Array.from(state.solution),
    board: Array.from(state.board),
    difficulty: state.difficulty,
    mistakes: state.mistakes,
    timerSeconds: state.timerSeconds,
    hintsUsed: state.hintsUsed,
    completed: state.completed,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) { /* 무시 */ }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);
    if (save.completed) { clearSavedProgress(); return false; }

    state = {
      size: save.size,
      rowClues: save.rowClues,
      colClues: save.colClues,
      solution: new Uint8Array(save.solution),
      board: new Uint8Array(save.board),
      difficulty: save.difficulty,
      completed: false,
      mistakes: save.mistakes,
      timerSeconds: save.timerSeconds,
      hintsUsed: save.hintsUsed,
      timerInterval: null,
    };
    currentDifficulty = save.difficulty;
    return true;
  } catch (e) {
    return false;
  }
}

function clearSavedProgress() {
  localStorage.removeItem(SAVE_KEY);
}

// ──────────────────────────────────────────────
// 로딩 UI
// ──────────────────────────────────────────────

function showLoading(show) {
  loadingEl.classList.toggle('show', show);
}

// ──────────────────────────────────────────────
// 난이도 버튼 상태
// ──────────────────────────────────────────────

function updateDifficultyButtons() {
  document.querySelectorAll('.difficulty-group button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.difficulty === currentDifficulty);
  });
}

// ──────────────────────────────────────────────
// 초기화
// ──────────────────────────────────────────────

function init() {
  // 버튼 이벤트
  document.querySelectorAll('.difficulty-group button').forEach(btn => {
    btn.addEventListener('click', () => newGame(btn.dataset.difficulty));
  });

  document.getElementById('btn-new').addEventListener('click', () => newGame());
  document.getElementById('btn-hint').addEventListener('click', giveHint);
  document.getElementById('btn-errors').addEventListener('click', toggleErrors);
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-sound').addEventListener('click', () => {
    const on = Sound.toggle();
    document.getElementById('btn-sound').textContent = on ? '🔊' : '🔇';
  });

  // 저장된 진행 불러오기 또는 새 게임
  if (loadProgress()) {
    updateDifficultyButtons();
    renderBoard();
    updateStats();
    showLoading(false);
    showStartOverlay(true);   // 복원된 퍼즐도 시작 버튼으로 재개
  } else {
    newGame('easy');
  }
}

document.addEventListener('DOMContentLoaded', init);
