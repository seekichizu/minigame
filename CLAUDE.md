# 무한 미니 게임 프로젝트

## 프로젝트 개요
외부 API/라이브러리 없이 순수 HTML/CSS/JS로 만든 웹 기반 퍼즐 게임 모음.
알고리즘으로 무한히 새 퍼즐을 생성하며, 유일해를 보장한다.
GitHub Pages로 배포 중: https://seekichizu.github.io/minigame/

## 멀티 페이지 구조
홈 화면(index.html)에서 각 게임으로 이동하는 카드 방식. 새 게임 추가 시 HTML 파일을 별도로 만들고 index.html에 카드를 추가하면 된다.

## 파일 구조
```
minigame/
├── index.html           — 홈 화면 ("무한 미니 게임", 게임 카드 목록)
├── nonogram.html        — 노노그램 게임
├── sudoku.html          — 스도쿠 게임
├── style.css            — 전체 공통 디자인 (라벤더 그라디언트 테마)
├── server.py            — 로컬 개발 서버 (port 3001)
└── js/
    ├── sound.js             — Web Audio API 사운드 (외부 파일 없음, 모든 게임 공유)
    ├── solver.js            — 노노그램 라인 솔버 + 유일해 검증
    ├── generator.js         — 노노그램 랜덤 퍼즐 생성
    ├── game.js              — 노노그램 게임 로직
    ├── sudoku-solver.js     — 스도쿠 백트래킹 솔버 + 유일해 검증
    ├── sudoku-generator.js  — 스도쿠 랜덤 퍼즐 생성
    └── sudoku-game.js       — 스도쿠 게임 로직
```

## 개발 서버 실행
```bash
python3 server.py
# → http://localhost:3001 에서 확인
```

## GitHub 배포
- 레포지터리: https://github.com/seekichizu/minigame (public)
- 배포 URL: https://seekichizu.github.io/minigame/
- GitHub Desktop으로 커밋 후 Push하면 1~2분 내 반영

## 현재 구현된 게임

### 노노그램 (nonogram.html)
- 난이도 3단계: 쉬움(5×5), 보통(10×10), 어려움(15×15)
- 라인 솔버 기반 무한 퍼즐 생성, 유일해 보장
- 조작: 왼클릭=채우기, 오른클릭=× 표시, 드래그=연속 조작
- 오류 표시 토글, 힌트(랜덤 셀 공개), 완성 배너
- localStorage로 진행 저장/복원 ("이어하기")

### 스도쿠 (sudoku.html)
- 난이도 3단계: 쉬움(45개 단서), 보통(35개), 어려움(27개)
- 백트래킹 솔버로 유일해 보장
- 키보드 입력 + 숫자 패드, 힌트, 오답 강조
- localStorage로 진행 저장/복원

## 공통 UI 패턴
- 상단 네비게이션: `<nav class="top-nav"><a href="index.html" class="home-btn">← 홈으로</a></nav>`
- 사운드: `sound.js`를 `<script>`로 로드 후 `Sound.cellFill()` 등 호출
- 타이머, 통계 표시: `.stat-pill` 컴포넌트 사용
- 시작 오버레이: `#xxx-overlay` + `#xxx-btn-start` 패턴 (타이머는 버튼 클릭 후 시작)
- 완성 배너: `#xxx-banner` + `.show` 클래스 토글

## CSS 설계 포인트
- CSS 변수: `--accent: #6c63ff`, `--success: #10b981`, `--surface: #ffffff`, `--cell-filled: #2d3561` 등
- 반응형: `clamp()`로 셀 크기 조정
- 게임별 테마: 노노그램=보라, 스도쿠=초록 (`.game-card-title-green` 등)

## 주의사항
- server.py에 프로젝트 경로가 하드코딩됨 — 폴더 이동 시 `os.chdir()` 경로 수정 필요
- `.claude/launch.json`은 미리보기용 임시 서버 설정 (수동 편집 불필요)
- 새 게임 추가 시 해당 게임 전용 CSS는 `style.css` 하단에 섹션으로 추가
