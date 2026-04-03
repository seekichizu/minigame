/**
 * generator.js — 노노그램 퍼즐 무한 생성기
 *
 * 알고리즘:
 *   1. 랜덤 이진 행렬 생성 (난이도별 채움률 조정)
 *   2. 행/열 힌트(clue) 추출
 *   3. solver로 유일해 검증
 *   4. 통과하면 반환, 실패하면 재생성
 */

const DIFFICULTY = {
  easy:   { size: 5,  fillMin: 0.55, fillMax: 0.65 },
  medium: { size: 10, fillMin: 0.45, fillMax: 0.55 },
  hard:   { size: 15, fillMin: 0.40, fillMax: 0.50 },
};

/**
 * 랜덤 이진 행렬 생성
 * @param {number} size
 * @param {number} fillRate - 0~1 사이 채움 비율
 * @returns {number[][]} size×size 행렬 (0/1)
 */
function randomMatrix(size, fillRate) {
  const matrix = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(Math.random() < fillRate ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * 행렬 전치 (행↔열)
 */
function transpose(matrix) {
  const size = matrix.length;
  return matrix[0].map((_, c) => matrix.map(row => row[c]));
}

/**
 * 노노그램 퍼즐 생성
 *
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {function} [onProgress] - 생성 시도 횟수 콜백 (선택)
 * @returns {{ rowClues, colClues, solution, size }}
 */
function generatePuzzle(difficulty, onProgress) {
  const { size, fillMin, fillMax } = DIFFICULTY[difficulty];
  clearPermCache();

  let attempts = 0;
  const maxAttempts = 500;

  while (attempts < maxAttempts) {
    attempts++;
    if (onProgress) onProgress(attempts);

    // 랜덤 채움률 선택
    const fillRate = fillMin + Math.random() * (fillMax - fillMin);
    const matrix = randomMatrix(size, fillRate);

    // 힌트 추출
    const rowClues = matrix.map(row => getClues(row));
    const colClues = transpose(matrix).map(col => getClues(col));

    // 솔버로 검증
    const solution = solve(rowClues, colClues, size, 1);
    if (!solution) continue;

    // 유일해 검증 (5×5는 빠르므로 항상 검증, 더 큰 것도 검증)
    if (!hasUniqueSolution(rowClues, colClues, size)) continue;

    // solution을 Uint8Array (1=채움, 2=빈칸) 형식으로 변환
    // solver는 1=채움, 2=빈칸을 사용하므로 그대로 사용
    return {
      rowClues,
      colClues,
      solution: new Uint8Array(solution),
      size,
      difficulty,
    };
  }

  // maxAttempts 초과 시 유일해 조건을 완화하고 마지막 유효 퍼즐 반환
  console.warn(`[generator] ${maxAttempts}번 시도 후 완화된 조건으로 생성`);
  while (true) {
    const fillRate = fillMin + Math.random() * (fillMax - fillMin);
    const matrix = randomMatrix(size, fillRate);
    const rowClues = matrix.map(row => getClues(row));
    const colClues = transpose(matrix).map(col => getClues(col));
    const solution = solve(rowClues, colClues, size, 1);
    if (solution) {
      return {
        rowClues,
        colClues,
        solution: new Uint8Array(solution),
        size,
        difficulty,
      };
    }
  }
}
