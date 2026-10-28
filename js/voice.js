// קולות לדמויות: הקראת הדיאלוגים בעברית עם Web Speech (speechSynthesis) של הדפדפן.
// לכל דמות קול משלה — מגדר, גובה וקצב. אם יש כמה קולות עבריים במכשיר, מחלקים אותם בין הדמויות.
(function () {
  'use strict';
  const G = window.G;
  const synth = window.speechSynthesis;

  // m = גבר, f = אישה · pitch: גובה (1 רגיל) · rate: קצב (1 רגיל)
  const PROFILES = {
    moshe: { g: 'm', pitch: 0.85, rate: 0.95 },
    yossi: { g: 'm', pitch: 1.15, rate: 1.18 },
    cohen: { g: 'm', pitch: 0.9, rate: 0.9 },
    daniel: { g: 'm', pitch: 1.0, rate: 1.12 },
    roi: { g: 'm', pitch: 1.1, rate: 1.05 },
    ido: { g: 'm', pitch: 1.05, rate: 1.2 },
    avraham: { g: 'm', pitch: 0.7, rate: 0.82 },
    shimon: { g: 'm', pitch: 0.95, rate: 1.0 },
    alon: { g: 'm', pitch: 1.12, rate: 1.06 },
    maya: { g: 'f', pitch: 1.12, rate: 1.06 },
    zalman: { g: 'm', pitch: 0.65, rate: 0.8 },
    ev_yaakov: { g: 'm', pitch: 0.82, rate: 0.95 },
    ev_haim: { g: 'm', pitch: 0.95, rate: 1.02 },
    ev_levi: { g: 'm', pitch: 1.0, rate: 1.0 },
    ev_nachman: { g: 'm', pitch: 1.12, rate: 1.15 },
    ev_david: { g: 'm', pitch: 1.05, rate: 1.12 },
    ev_zaken: { g: 'm', pitch: 0.72, rate: 0.85 },
    pt_yoel: { g: 'm', pitch: 0.68, rate: 0.8 },
    pt_father: { g: 'm', pitch: 0.92, rate: 0.95 },
    pt_shimshon: { g: 'm', pitch: 0.95, rate: 1.2 },
    pt_avi: { g: 'm', pitch: 1.08, rate: 1.05 },
    pt_moti: { g: 'm', pitch: 1.0, rate: 1.1 },
    pt_rachamim: { g: 'm', pitch: 0.8, rate: 0.95 },
    player: { g: 'm', pitch: 1.0, rate: 1.08 },
    narr: { g: 'f', pitch: 1.0, rate: 1.0 },
  };
  const BY_NAME = { 'משה': 'moshe', 'מר כהן': 'cohen' };
  const FEMALE = /hila|carmit|female|הילה|כרמית/i;
  const MALE = /asaf|avri|\bmale|אסף|אברי/i;

  let voices = { m: [], f: [], any: [] };
  function loadVoices() {
    if (!synth) return;
    const he = synth.getVoices().filter((v) => /^(he|iw)([-_]|$)/i.test(v.lang));
    // קולות "טבעיים" (Edge) נשמעים הרבה יותר טוב — הם קודם
    he.sort((a, b) => /natural|online/i.test(b.name) - /natural|online/i.test(a.name));
    voices = {
      m: he.filter((v) => MALE.test(v.name) && !FEMALE.test(v.name)),
      f: he.filter((v) => FEMALE.test(v.name) || (!MALE.test(v.name) && /google/i.test(v.name))),
      any: he,
    };
  }
  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
    else synth.onvoiceschanged = loadVoices;
  }

  // ניקוי הטקסט להקראה: בלי הוראות במה בסוגריים, בלי אימוג׳ים וגרשיים
  function clean(t) {
    return String(t)
      .replace(/\([^)]*\)/g, ' ')
      .replace(/חב״ד/g, 'חבד')
      .replace(/ר׳ /g, 'רבי ')
      .replace(/[״"]/g, '')
      .replace(/[—–]/g, ', ')
      .replace(/\.\.\./g, '… ')
      .replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  const V = (G.voice = {
    enabled: true,
    speaking: false,
    supported: !!(synth && window.SpeechSynthesisUtterance),
    hasHebrew: () => voices.any.length > 0,
    profileFor(id, name) {
      const key = PROFILES[id] ? id : BY_NAME[name] || id || 'narr';
      return Object.assign({ key }, PROFILES[key] || { g: 'm', pitch: 0.9 + (hash(key) % 5) * 0.06, rate: 1 });
    },
    // speaker: מזהה הדמות ('narr' לקריין, 'player' לשליח) · name: לשיחות טלפון בלי מזהה
    speak(text, speaker, name, opts) {
      if (!V.supported || !V.enabled) return;
      const say = clean(text);
      if (!opts || !opts.queue) synth.cancel();
      if (!say) return;
      if (!voices.any.length) loadVoices();
      const p = V.profileFor(speaker, name);
      const u = new SpeechSynthesisUtterance(say);
      u.lang = 'he-IL';
      let pitch = p.pitch;
      // קול לפי מגדר; כמה דמויות מאותו מגדר מקבלות קולות שונים לפי הסדר
      const pool = voices[p.g].length ? voices[p.g] : voices.any;
      if (pool.length) {
        u.voice = pool[hash(p.key) % pool.length];
        // אין קול גברי במכשיר (למשל באייפון): מנמיכים את הקול הנשי
        if (p.g === 'm' && !voices.m.length) pitch *= 0.72;
        if (p.g === 'f' && !voices.f.length) pitch *= 1.25;
      }
      u.pitch = Math.max(0.1, Math.min(2, pitch));
      u.rate = p.rate;
      u.volume = 1;
      u.onstart = () => (V.speaking = true);
      u.onend = u.onerror = () => (V.speaking = synth.speaking);
      synth.speak(u);
    },
    stop() {
      if (V.supported) synth.cancel();
      V.speaking = false;
    },
  });
})();
