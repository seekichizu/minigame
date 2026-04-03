/**
 * sound.js — Web Audio API 기반 게임 효과음
 * 외부 파일 없이 순수 코드로 사운드 생성
 */

const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 모바일/브라우저 정책: 사용자 제스처 후 resume
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 기본 oscillator 헬퍼
  function playTone({ freq = 440, type = 'sine', gain = 0.3, duration = 0.1,
                      attack = 0.005, decay = 0.05, sustain = 0.6, release = 0.05,
                      startTime = null, destination = null }) {
    const c = getCtx();
    const t = startTime ?? c.currentTime;
    const dest = destination ?? c.destination;

    const osc = c.createOscillator();
    const gainNode = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(gain, t + attack);
    gainNode.gain.linearRampToValueAtTime(gain * sustain, t + attack + decay);
    gainNode.gain.setValueAtTime(gain * sustain, t + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, t + duration);

    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // ── 셀 채우기 클릭음 ──
  function cellFill() {
    if (!enabled) return;
    playTone({ freq: 600, type: 'sine', gain: 0.18, duration: 0.08,
               attack: 0.002, decay: 0.02, sustain: 0.3, release: 0.04 });
  }

  // ── 셀 지우기 (토글 off) ──
  function cellErase() {
    if (!enabled) return;
    playTone({ freq: 380, type: 'sine', gain: 0.12, duration: 0.07,
               attack: 0.002, decay: 0.02, sustain: 0.2, release: 0.04 });
  }

  // ── X 마크 ──
  function cellMark() {
    if (!enabled) return;
    playTone({ freq: 480, type: 'triangle', gain: 0.14, duration: 0.06,
               attack: 0.002, decay: 0.01, sustain: 0.4, release: 0.03 });
  }

  // ── 오류 (잘못된 칸 채움) ──
  function mistake() {
    if (!enabled) return;
    const c = getCtx();
    const t = c.currentTime;
    playTone({ freq: 200, type: 'sawtooth', gain: 0.15, duration: 0.18,
               attack: 0.005, decay: 0.05, sustain: 0.4, release: 0.08,
               startTime: t });
    playTone({ freq: 160, type: 'sawtooth', gain: 0.10, duration: 0.18,
               attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.08,
               startTime: t + 0.06 });
  }

  // ── 줄(행/열) 완성 ──
  function lineComplete() {
    if (!enabled) return;
    const c = getCtx();
    const t = c.currentTime;
    const notes = [523, 659, 784]; // C5 E5 G5 (C 메이저 코드)
    notes.forEach((freq, i) => {
      playTone({ freq, type: 'sine', gain: 0.18, duration: 0.22,
                 attack: 0.005, decay: 0.06, sustain: 0.5, release: 0.10,
                 startTime: t + i * 0.07 });
    });
  }

  // ── 힌트 사용 ──
  function hint() {
    if (!enabled) return;
    const c = getCtx();
    const t = c.currentTime;
    playTone({ freq: 880, type: 'sine', gain: 0.14, duration: 0.12,
               attack: 0.005, decay: 0.04, sustain: 0.4, release: 0.06,
               startTime: t });
    playTone({ freq: 1109, type: 'sine', gain: 0.10, duration: 0.16,
               attack: 0.005, decay: 0.04, sustain: 0.4, release: 0.08,
               startTime: t + 0.09 });
  }

  // ── 퍼즐 완성 팡파레 ──
  function puzzleComplete() {
    if (!enabled) return;
    const c = getCtx();
    const t = c.currentTime;

    // 밝고 경쾌한 멜로디: C E G C(옥타브)
    const melody = [
      { freq: 523, start: 0.00, dur: 0.18 },
      { freq: 659, start: 0.14, dur: 0.18 },
      { freq: 784, start: 0.28, dur: 0.18 },
      { freq: 1047, start: 0.42, dur: 0.40 },
    ];

    melody.forEach(({ freq, start, dur }) => {
      playTone({ freq, type: 'sine', gain: 0.22, duration: dur,
                 attack: 0.01, decay: 0.06, sustain: 0.6, release: 0.10,
                 startTime: t + start });
      // 화음 추가 (3도 위)
      playTone({ freq: freq * 1.26, type: 'sine', gain: 0.10, duration: dur,
                 attack: 0.01, decay: 0.06, sustain: 0.5, release: 0.10,
                 startTime: t + start });
    });

    // 마지막에 반짝이는 고음
    playTone({ freq: 2093, type: 'sine', gain: 0.08, duration: 0.25,
               attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.12,
               startTime: t + 0.72 });
  }

  // ── 뮤트 토글 ──
  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function isEnabled() { return enabled; }

  return { cellFill, cellErase, cellMark, mistake, lineComplete, hint, puzzleComplete, toggle, isEnabled };
})();
