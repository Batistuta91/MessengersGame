// צלילים וניגונים — הכול נוצר בזמן אמת עם Web Audio, בלי קבצי קול
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const A = (G.Audio = {});
  let ctx = null, master, sfx, music, engO, engG;
  let enabled = true, station = 0, nextT = 0, idx = 0, bassT = 0, beat = 0;

  // [חצאי טונים מעל הבסיס, פעמות]; null = הפסקה
  const STATIONS = [
    null,
    {
      name: 'ניגון שמחה', bpm: 150, base: 293.66, wave: 'square', bass: [0, 7],
      notes: [
        [7, 0.5], [7, 0.5], [8, 0.5], [7, 0.5], [5, 0.5], [4, 0.5], [5, 1],
        [4, 0.5], [5, 0.5], [7, 0.5], [8, 0.5], [7, 1], [null, 1],
        [7, 0.5], [8, 0.5], [10, 0.5], [8, 0.5], [7, 0.5], [5, 0.5], [4, 0.5], [1, 0.5],
        [0, 1.5], [null, 0.5], [0, 0.5], [1, 0.5], [4, 1],
        [12, 0.5], [12, 0.5], [10, 0.5], [8, 0.5], [10, 0.5], [8, 0.5], [7, 1],
        [8, 0.5], [7, 0.5], [5, 0.5], [4, 0.5], [5, 1], [null, 1],
        [4, 0.5], [5, 0.5], [7, 0.5], [5, 0.5], [4, 0.5], [1, 0.5], [0, 0.5], [1, 0.5],
        [0, 2], [null, 2],
      ],
    },
    {
      name: 'ניגון געגועים', bpm: 84, base: 293.66, wave: 'triangle', bass: [0, -5],
      notes: [
        [0, 1], [3, 1], [7, 1.5], [5, 0.5], [3, 1], [2, 1], [0, 2],
        [3, 1], [5, 1], [7, 1], [8, 1], [7, 3], [null, 1],
        [10, 1], [8, 1], [7, 1.5], [5, 0.5], [3, 1], [5, 1], [7, 2],
        [5, 1], [3, 1], [2, 1], [-2, 1], [0, 3], [null, 1],
      ],
    },
    {
      name: 'ניגון ריקוד', bpm: 132, base: 392.0, wave: 'square', bass: [0, 7],
      notes: [
        [0, 0.5], [4, 0.5], [7, 0.5], [7, 0.5], [9, 0.5], [7, 0.5], [4, 1],
        [5, 0.5], [4, 0.5], [2, 0.5], [4, 0.5], [0, 1], [null, 1],
        [0, 0.5], [4, 0.5], [7, 0.5], [12, 0.5], [11, 0.5], [9, 0.5], [7, 1],
        [9, 0.5], [7, 0.5], [5, 0.5], [2, 0.5], [0, 2],
      ],
    },
  ];
  A.STATION_COUNT = STATIONS.length;
  A.stationName = (i) => (i === 9 ? 'רדיו קול חב״ד' : STATIONS[i] ? STATIONS[i].name : 'הרדיו כבוי');

  function blip(f, t, d, type, g, dest) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.012);
    a.gain.setValueAtTime(g, t + Math.max(0.02, d * 0.6));
    a.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(a);
    a.connect(dest);
    o.start(t);
    o.stop(t + d + 0.05);
  }

  function scheduler() {
    if (!ctx || !station) return;
    const st = STATIONS[station], spb = 60 / st.bpm, horizon = ctx.currentTime + 0.25;
    while (nextT < horizon) {
      const [s, b] = st.notes[idx];
      if (s !== null) blip(st.base * Math.pow(2, s / 12), nextT, b * spb * 0.92, st.wave, 0.07, music);
      nextT += b * spb;
      idx = (idx + 1) % st.notes.length;
    }
    while (bassT < horizon) {
      const s = st.bass[beat % st.bass.length];
      blip((st.base / 2) * Math.pow(2, s / 12), bassT, spb * 0.5, 'triangle', 0.13, music);
      bassT += spb;
      beat++;
    }
  }

  A.init = function () {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.connect(master);
    music = ctx.createGain();
    music.gain.value = 0;
    music.connect(master);
    engO = ctx.createOscillator();
    engO.type = 'sawtooth';
    engO.frequency.value = 45;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    engG = ctx.createGain();
    engG.gain.value = 0;
    engO.connect(f);
    f.connect(engG);
    engG.connect(sfx);
    engO.start();
    setInterval(scheduler, 60);
    if (station) A.setStation(station);
  };

  A.setEnabled = function (on) {
    enabled = on;
    if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05);
  };

  A.setStation = function (i) {
    // תחנה 9 = ״קול חב״ד״ (שירים מקבצים); 1–3 = ניגונים מסונתזים; 0 = כבוי
    const kol = i === A.KOL;
    if (A.kol) A.kol(kol);
    station = kol ? 0 : i;
    if (!ctx || !station) return;
    idx = 0;
    beat = 0;
    nextT = bassT = ctx.currentTime + 0.05;
  };

  A.setRadioVolume = function (v) {
    if (music) music.gain.setTargetAtTime(v * 0.6, ctx.currentTime, 0.15);
  };

  // ---------- רדיו ״קול חב״ד״: שירים מהתיקייה music (רשימה ב-music/playlist.js) ----------
  const songs = (window.RADIO_SONGS || []).filter(Boolean);
  let order = [], songIdx = -1, songEl = null, kolOn = false, kolVol = 0, kolTarget = 0, onSong = null;
  A.KOL = 9;
  A.hasSongs = () => songs.length > 0;
  A.onSongChange = (fn) => (onSong = fn);
  const songTitle = (f) => f.replace(/\.[^.]+$/, '');
  function shuffle() {
    order = songs.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  function loadSong(next) {
    if (!songs.length) return;
    if (next || songIdx < 0) {
      songIdx++;
      if (songIdx >= order.length || !order.length) {
        shuffle();
        songIdx = 0;
      }
    }
    const file = songs[order[songIdx]];
    if (!songEl) {
      songEl = new Audio();
      songEl.preload = 'auto';
      songEl.addEventListener('ended', () => {
        loadSong(true);
        if (kolOn) songEl.play().catch(() => {});
      });
      songEl.addEventListener('error', () => {
        // קובץ חסר או פגום — עוברים לשיר הבא
        if (songs.length > 1) setTimeout(() => loadSong(true), 300);
      });
    }
    songEl.src = 'music/' + encodeURIComponent(file);
    songEl.volume = 0;
    if (onSong) onSong(songTitle(file));
  }
  A.songState = () => (songEl ? { src: decodeURIComponent(songEl.src.split('/').pop()), paused: songEl.paused, vol: +songEl.volume.toFixed(2), t: +songEl.currentTime.toFixed(1), err: songEl.error && songEl.error.code } : null);
  A.currentSong = () => (songIdx >= 0 && songs.length ? songTitle(songs[order[songIdx]]) : '');
  A.nextSong = function () {
    if (!songs.length) return;
    loadSong(true);
    if (kolOn) songEl.play().catch(() => {});
  };
  // מדליק או מכבה את קול חב״ד (בהדרגה)
  A.kol = function (on) {
    if (!songs.length) return;
    kolOn = on;
    kolTarget = on ? 1 : 0;
    if (on) {
      if (!songEl || !songEl.src) loadSong(false);
      songEl.play().catch(() => {});
    }
  };
  // נקרא בכל פריים: עמעום חלק של עוצמת השיר
  A.kolTick = function (dt) {
    if (!songEl) return;
    kolVol = kolTarget > kolVol ? Math.min(kolTarget, kolVol + dt * 1.5) : Math.max(kolTarget, kolVol - dt * 1.2);
    songEl.volume = enabled ? kolVol * 0.85 : 0;
    if (kolVol <= 0 && !kolOn && !songEl.paused) songEl.pause();
  };

  // מנוע: גובה הצליל לפי סוג הרכב (טנק נמוך, קטנוע גבוה ומזמזם)
  A.setEngine = function (on, sp, pitch) {
    if (!ctx) return;
    const p = pitch || 1;
    engG.gain.setTargetAtTime(on ? (0.03 + sp * 0.04) * (p > 2 ? 0.7 : 1) : 0, ctx.currentTime, 0.1);
    engO.frequency.setTargetAtTime((42 + sp * 75) * p, ctx.currentTime, 0.1);
  };

  // ---------- רעש לבן משותף ----------
  let noiseBuf = null;
  function noise(t, dur, freq, q, g, type) {
    if (!noiseBuf) {
      const len = ctx.sampleRate * 1;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.005);
    a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f);
    f.connect(a);
    a.connect(sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }
  A.step = function (run) {
    if (!ctx) return;
    noise(ctx.currentTime, run ? 0.07 : 0.06, 900 + Math.random() * 400, 1.2, run ? 0.07 : 0.05);
  };
  A.crash = function (k) {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.35, 500, 0.7, 0.25 * k + 0.05);
    noise(t + 0.02, 0.5, 2600, 0.8, 0.12 * k);
    blip(70, t, 0.25, 'sawtooth', 0.15 * k, sfx);
  };
  A.door = function (type) {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (type === 'bike') return seq([1400], 0.05, 'triangle', 0.04);
    if (type === 'scooter') return noise(t, 0.12, 300, 1, 0.08);
    noise(t, 0.08, 700, 1.5, 0.12);
    blip(110, t + 0.02, 0.12, 'square', 0.08, sfx);
  };
  A.bell = function () {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const k of [0, 0.16]) {
      blip(2350, t + k, 0.45, 'sine', 0.08, sfx);
      blip(3120, t + k, 0.3, 'sine', 0.04, sfx);
    }
  };
  A.beep = function () {
    if (!ctx) return;
    seq([880, 880], 0.14, 'square', 0.06, 0.1);
  };
  A.cheer = function () {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 14; i++) noise(t + i * 0.12, 0.9, 600 + Math.random() * 900, 0.6, 0.05);
    seq([523, 659, 784, 1047, 784, 1047, 1319], 0.15, 'triangle', 0.08, 0.3);
  };
  A.splash = function () {
    if (!ctx) return;
    noise(ctx.currentTime, 0.6, 1800, 0.5, 0.12);
  };

  // ---------- אווירה: ציפורים ביום, צרצרים בלילה, תנועה ברקע ----------
  let ambT = 0, trafG = null, trafO = null;
  A.ambience = function (dt, night, city, traffic) {
    if (!ctx || !enabled) return;
    ambT -= dt;
    if (ambT <= 0) {
      ambT = night > 0.5 ? 0.35 + Math.random() * 0.3 : 1.2 + Math.random() * 3;
      const t = ctx.currentTime;
      if (night > 0.5) {
        // צרצר
        for (let k = 0; k < 3; k++) blip(4200 + Math.random() * 200, t + k * 0.05, 0.03, 'sine', 0.012, sfx);
      } else if (city) {
        // ציוץ ציפור
        const base = 2200 + Math.random() * 1600, n = 2 + ((Math.random() * 4) | 0);
        for (let k = 0; k < n; k++) {
          const o = ctx.createOscillator(), a = ctx.createGain(), s = t + k * 0.11;
          o.type = 'sine';
          o.frequency.setValueAtTime(base, s);
          o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), s + 0.07);
          a.gain.setValueAtTime(0, s);
          a.gain.linearRampToValueAtTime(0.018, s + 0.01);
          a.gain.exponentialRampToValueAtTime(0.0005, s + 0.09);
          o.connect(a);
          a.connect(sfx);
          o.start(s);
          o.stop(s + 0.1);
        }
      }
    }
    // זמזום תנועה: כמה רכבים קרובים יש
    if (!trafG) {
      trafO = ctx.createOscillator();
      trafO.type = 'sawtooth';
      trafO.frequency.value = 58;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 220;
      trafG = ctx.createGain();
      trafG.gain.value = 0;
      trafO.connect(f);
      f.connect(trafG);
      trafG.connect(sfx);
      trafO.start();
    }
    trafG.gain.setTargetAtTime(Math.min(0.05, (traffic || 0) * 0.05), ctx.currentTime, 0.3);
    trafO.frequency.setTargetAtTime(50 + (traffic || 0) * 30, ctx.currentTime, 0.3);
  };

  // גשם: רעש לבן מסונן בלולאה
  let rainG = null;
  A.setRain = function (v) {
    if (!ctx) return;
    if (!rainG) {
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1400;
      f.Q.value = 0.6;
      rainG = ctx.createGain();
      rainG.gain.value = 0;
      src.connect(f);
      f.connect(rainG);
      rainG.connect(sfx);
      src.start();
    }
    rainG.gain.setTargetAtTime(v * 0.14, ctx.currentTime, 0.4);
  };

  A.horn = function () {
    if (!ctx) return;
    const t = ctx.currentTime;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1600;
    f.connect(sfx);
    const g = ctx.createGain();
    g.connect(f);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.02);
    g.gain.setValueAtTime(0.2, t + 0.42);
    g.gain.linearRampToValueAtTime(0, t + 0.5);
    for (const fr of [349, 440]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = fr;
      o.connect(g);
      o.start(t);
      o.stop(t + 0.55);
    }
  };

  function seq(freqs, step, type, g, dur) {
    if (!ctx) return;
    const t = ctx.currentTime;
    freqs.forEach((f, i) => blip(f, t + i * step, dur || step * 1.6, type, g, sfx));
  }
  A.click = () => seq([880], 0.06, 'square', 0.04);
  A.chime = () => seq([784, 988, 1175], 0.08, 'triangle', 0.12);
  A.success = () => seq([523, 659, 784, 1047, 1319], 0.09, 'triangle', 0.14, 0.35);
  A.wrap = () => seq([196, 294], 0.05, 'triangle', 0.18);
  A.bump = () => seq([90, 70], 0.06, 'sawtooth', 0.12);
  A.soft = () => seq([440, 392], 0.1, 'triangle', 0.08);
  A.candle = (i) => seq([523 * Math.pow(2, (i % 8) / 12) * 1.5], 0.1, 'triangle', 0.12, 0.5);
  A.fail = () => seq([330, 262, 196], 0.12, 'square', 0.07);
  A.load = () => seq([150, 110], 0.07, 'square', 0.1);
  A.phone = () => seq([988, 784, 988, 784, 988, 784], 0.08, 'square', 0.05);
})();
