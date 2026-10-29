// מאפיית מצות — 18 דקות: משחק מיומנות בבית חב״ד (לישה, רידוד, ניקוב, תנור)
// 18 דקות של המאפייה עוברות בכ-90 שניות אמיתיות
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeMatzah = function (api) {
    const { scene, W, A, isTouch } = api;
    const S = () => api.S;
    const SP = W.spots || {};
    const spot = SP.kitchen || SP.playerStart;
    if (!spot) return null;
    const LIMIT = 90; // שניות אמיתיות = 18 דקות במאפייה
    const KEY = isTouch ? 'הכפתור' : 'רווח';

    // ---------- שלט על הקיר ליד המטבח ----------
    const fr = W.chabadFrame;
    if (fr) {
      const tex = G.textTex('🫓 מאפיית מצות', { w: 128, h: 26, size: 15, bg: '#c98a3a', fg: '#ffffff', border: '#7b4a12' });
      const sign = new T.Mesh(new T.PlaneGeometry(2.2, 0.45), new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
      sign.position.set(spot.x + Math.sin(fr.ang) * 0.08, 2.9, spot.z + Math.cos(fr.ang) * 0.08);
      sign.rotation.y = fr.ang;
      scene.add(sign);
    }

    // ---------- ממשק (נבנה פעם אחת) ----------
    const root = document.createElement('div');
    root.id = 'matzah';
    root.className = 'overlay hidden';
    root.innerHTML =
      '<div class="mz-card">' +
      '<div class="mz-head"><b>🫓 מאפיית מצות שמורות</b><span id="mz-clock">⏱ 0:00 / 18:00</span><span id="mz-count">מצות: 0</span></div>' +
      '<canvas id="mz-canvas" width="640" height="300"></canvas>' +
      '<div id="mz-tip" class="mz-tip"></div>' +
      '<div id="mz-btns" class="mz-btns"></div>' +
      '<div id="mz-end" class="mz-end hidden"></div>' +
      '</div>';
    document.body.appendChild(root);
    const $ = (id) => document.getElementById(id);
    const cv = $('mz-canvas'), g = cv.getContext('2d');

    const STAGES = ['knead', 'roll', 'holes', 'oven'];
    // טקסט עברי בתוך קנבס בכיוון LTR: עוטפים בסימני כיוון כדי שהפיסוק יישב נכון
    const RTL = (t) => '\u202B' + t + '\u202C';
    const NAMES = { knead: 'לישה', roll: 'רידוד', holes: 'ניקוב', oven: 'תנור' };
    let st = null, raf = 0, last = 0;

    function open() {
      st = { t: 0, stage: 'knead', prog: 0, side: 0, rows: 0, mark: 0, markDir: 1, heat: 0, made: 0, burnt: 0, raw: 0, missed: 0, flash: null, flashT: 0, done: false };
      show(root, true);
      $('mz-end').classList.add('hidden');
      $('mz-canvas').classList.remove('hidden');
      setButtons();
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      A.click && A.click();
      api.toast('18 דקות מרגע שהמים פוגשים את הקמח — מהר, אבל בזהירות!', 'gold');
    }
    function close() {
      cancelAnimationFrame(raf);
      st = null;
      show(root, false);
      api.onClose && api.onClose();
    }
    function show(el, on) {
      el.classList.toggle('hidden', !on);
    }

    // ---------- כפתורים לכל תחנה ----------
    function setButtons() {
      const b = $('mz-btns');
      if (!st || st.done) {
        b.innerHTML = '';
        return;
      }
      if (st.stage === 'roll') b.innerHTML = '<button class="btn big" data-k="ArrowLeft">⬅</button><button class="btn big" data-k="ArrowRight">➡</button>';
      else b.innerHTML = '<button class="btn big" data-k="Space">' + { knead: 'ללוש!', holes: 'לנקב!', oven: 'להוציא מהתנור!' }[st.stage] + '</button>';
      b.querySelectorAll('button').forEach((el) => el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        press(el.dataset.k);
      }));
      const tips = {
        knead: 'לישה: לחצו מהר על ' + KEY + ' כדי לערבב את הקמח והמים',
        roll: 'רידוד: ימינה ושמאלה לסירוגין (' + (isTouch ? 'הכפתורים' : 'החיצים') + ') — מצה עגולה ודקה',
        holes: 'ניקוב: לחצו ' + KEY + ' כשהסמן באזור הירוק — 3 שורות חורים',
        oven: 'תנור: הוציאו כשהמצה זהובה! מוקדם מדי — לא אפויה, מאוחר מדי — נשרפת',
      };
      $('mz-tip').textContent = tips[st.stage];
    }
    function flash(text, good) {
      st.flash = { text, good };
      st.flashT = 0.9;
    }
    function nextStage() {
      const i = STAGES.indexOf(st.stage);
      st.stage = STAGES[(i + 1) % STAGES.length];
      st.prog = 0;
      st.rows = 0;
      st.heat = 0;
      st.mark = 0;
      setButtons();
    }
    function press(k) {
      if (!st || st.done) return;
      if (st.stage === 'knead' && (k === 'Space' || k === 'KeyE' || k === 'Enter')) {
        st.prog += 1 / 9;
        A.click && A.click();
        if (st.prog >= 1) {
          flash('הבצק מוכן!', true);
          nextStage();
        }
      } else if (st.stage === 'roll' && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'KeyA' || k === 'KeyD')) {
        const side = k === 'ArrowLeft' || k === 'KeyA' ? -1 : 1;
        if (side !== st.side) {
          st.prog += 1 / 8;
          st.side = side;
          A.click && A.click();
        } else st.prog = Math.max(0, st.prog - 0.04);
        if (st.prog >= 1) {
          flash('עגולה ודקה!', true);
          nextStage();
        }
      } else if (st.stage === 'holes' && (k === 'Space' || k === 'KeyE' || k === 'Enter')) {
        const zone = zoneOf();
        if (st.mark >= zone[0] && st.mark <= zone[1]) {
          st.rows++;
          A.click && A.click();
          if (st.rows >= 3) {
            flash('מנוקבת!', true);
            nextStage();
          }
        } else {
          st.missed++;
          st.t += 1.5;
          flash('פספוס! (שנייה וחצי הלכה)', false);
          A.soft && A.soft();
        }
      } else if (st.stage === 'oven' && (k === 'Space' || k === 'KeyE' || k === 'Enter')) {
        if (st.heat < 0.62) {
          st.raw++;
          flash('לא אפויה — לא כשרה לפסח', false);
          A.soft && A.soft();
        } else if (st.heat <= 0.84) {
          st.made++;
          flash('מצה כשרה! ✓', true);
          A.success && A.success();
        } else {
          st.burnt++;
          flash('נשרפה...', false);
          A.crash && A.crash(0.3);
        }
        nextStage();
      }
    }
    // אזור הניקוב מצטמצם ככל שמכינים יותר מצות
    const zoneOf = () => {
      const w = Math.max(0.12, 0.26 - st.made * 0.015);
      return [0.5 - w / 2, 0.5 + w / 2];
    };

    function onKey(e) {
      if (!st || root.classList.contains('hidden')) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        if (st.done) close();
        else finish(true);
        return;
      }
      if (st.done) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          close();
        }
        return;
      }
      if (['Space', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
      if (!e.repeat) press(e.code);
    }
    window.addEventListener('keydown', onKey, true);

    function finish(quit) {
      st.done = true;
      const n = st.made;
      const stars = n >= 8 ? 3 : n >= 5 ? 2 : n >= 2 ? 1 : 0;
      const best = Math.max(S().matzahBest || 0, n);
      const isBest = n > (S().matzahBest || 0);
      S().matzahBest = best;
      const joy = Math.min(20, n * 2 + stars * 2);
      if (!quit && joy) api.addJoy(joy);
      if (!quit && n >= 5) api.addCommunity(1);
      api.save();
      $('mz-btns').innerHTML = '';
      $('mz-tip').textContent = '';
      $('mz-canvas').classList.add('hidden');
      const e = $('mz-end');
      e.innerHTML =
        '<div class="stars">' + (stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆') + '</div>' +
        '<h2>' + (quit ? 'יצאתם מהמאפייה' : n ? 'עברו 18 דקות — ' + n + ' מצות כשרות!' : 'עברו 18 דקות...') + '</h2>' +
        '<ul class="mz-stats"><li><span>מצות כשרות</span><b>' + n + '</b></li><li><span>נשרפו</span><b>' + st.burnt + '</b></li><li><span>לא נאפו</span><b>' + st.raw + '</b></li><li><span>השיא שלכם</span><b>' + best + (isBest && !quit ? ' 🏆' : '') + '</b></li>' + (!quit && joy ? '<li><span>שמחה</span><b>+' + joy + '</b></li>' : '') + '</ul>' +
        '<p class="mz-note">״ושמרתם את המצות״ — מצה שמורה נשמרת מרגע הקצירה ועד האפייה. ובכל דקה במאפייה — זריזות וזהירות ביחד.</p>' +
        '<div class="btns"><button id="mz-again" class="btn big">עוד סבב</button><button id="mz-out" class="btn ghost">חזרה לעיר</button></div>';
      e.classList.remove('hidden');
      $('mz-again').addEventListener('click', open);
      $('mz-out').addEventListener('click', close);
      if (!quit) {
        if (stars >= 2 && A.cheer) A.cheer();
        else if (A.success) A.success();
      }
    }

    // ---------- ציור ----------
    function loop(now) {
      if (!st) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      raf = requestAnimationFrame(loop);
    }
    function update(dt) {
      if (st && !st.done) {
        st.t += dt;
        if (st.stage === 'holes') {
          st.mark += st.markDir * dt * (0.9 + st.made * 0.06);
          if (st.mark > 1) (st.mark = 1), (st.markDir = -1);
          if (st.mark < 0) (st.mark = 0), (st.markDir = 1);
        }
        if (st.stage === 'oven') {
          st.heat += dt / 2.3;
          if (st.heat >= 1.05) {
            st.burnt++;
            flash('נשרפה בתנור...', false);
            A.crash && A.crash(0.3);
            nextStage();
          }
        }
        if (st.flashT > 0) st.flashT -= dt;
        if (st.t >= LIMIT) finish(false);
        const mins = (Math.min(st.t, LIMIT) / LIMIT) * 18;
        $('mz-clock').textContent = '⏱ ' + Math.floor(mins) + ':' + String(Math.floor((mins % 1) * 60)).padStart(2, '0') + ' / 18:00';
        $('mz-clock').classList.toggle('low', mins > 15);
        $('mz-count').textContent = 'מצות: ' + st.made;
        draw();
      }
    }
    function draw() {
      const Wd = cv.width, Hd = cv.height;
      g.fillStyle = '#3b2a1e';
      g.fillRect(0, 0, Wd, Hd);
      // שולחן עבודה
      g.fillStyle = '#c9a77a';
      g.fillRect(0, Hd * 0.62, Wd, Hd * 0.38);
      g.fillStyle = '#b08d60';
      for (let x = 0; x < Wd; x += 40) g.fillRect(x, Hd * 0.62, 2, Hd * 0.38);
      // ארבע התחנות — מימין לשמאל, כמו בעברית: לישה בימין, התנור בשמאל
      g.direction = 'ltr';
      const xs = [560, 400, 240, 80];
      STAGES.forEach((s, i) => {
        const on = st.stage === s;
        g.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,0.35)';
        g.font = 'bold 18px Rubik, Arial';
        g.textAlign = 'center';
        g.fillText(RTL((i + 1) + '. ' + NAMES[s]), xs[i], 30);
        if (i < 3) {
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.fillText('◀', (xs[i] + xs[i + 1]) / 2, 30);
        }
      });
      // התנור (בצד שמאל — העברית זורמת מימין לשמאל)
      g.fillStyle = '#2a1a12';
      g.beginPath();
      g.arc(xs[3], 170, 70, Math.PI, 0);
      g.lineTo(xs[3] + 70, 190);
      g.lineTo(xs[3] - 70, 190);
      g.fill();
      const fire = st.stage === 'oven' ? 0.6 + Math.sin(performance.now() / 90) * 0.2 : 0.35;
      g.fillStyle = 'rgba(255,' + (120 + fire * 80) + ',40,' + fire + ')';
      g.beginPath();
      g.arc(xs[3], 185, 45, Math.PI, 0);
      g.fill();
      // המצה בתחנה הנוכחית
      const i = STAGES.indexOf(st.stage), cx = xs[i], cy = 150;
      if (st.stage === 'knead') {
        const r = 22 + st.prog * 18;
        g.fillStyle = '#f3e6c4';
        g.beginPath();
        g.ellipse(cx, cy + 20, r * 1.15, r * 0.8, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)';
        for (let k = 0; k < 6; k++) g.fillRect(cx - 20 + ((k * 13 + st.prog * 40) % 40), cy + 8 + (k % 3) * 8, 4, 3);
      } else if (st.stage === 'roll') {
        const r = 30 + st.prog * 38;
        g.fillStyle = '#f0dfb5';
        g.beginPath();
        g.ellipse(cx, cy + 20, r, r * 0.55, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#8b5a2b';
        const ox = st.side * 22;
        g.fillRect(cx - 50 + ox, cy + 8, 100, 10);
        g.fillStyle = '#5a3a1a';
        g.fillRect(cx - 62 + ox, cy + 10, 12, 6);
        g.fillRect(cx + 50 + ox, cy + 10, 12, 6);
      } else if (st.stage === 'holes') {
        g.fillStyle = '#f0dfb5';
        g.beginPath();
        g.ellipse(cx, cy + 20, 68, 38, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#8a6a3a';
        for (let rr = 0; rr < st.rows; rr++) for (let k = -4; k <= 4; k++) g.fillRect(cx + k * 13, cy + 6 + rr * 12, 3, 3);
        // סרגל התזמון
        const bx = cx - 90, by = 228, bw = 180, z = zoneOf();
        g.fillStyle = '#222';
        g.fillRect(bx, by, bw, 14);
        g.fillStyle = '#3ecf72';
        g.fillRect(bx + z[0] * bw, by, (z[1] - z[0]) * bw, 14);
        g.fillStyle = '#ffffff';
        g.fillRect(bx + st.mark * bw - 2, by - 4, 4, 22);
      } else if (st.stage === 'oven') {
        const h = Math.min(1, st.heat);
        const c = h < 0.62 ? [240, 223, 181] : h < 0.84 ? [214, 160, 80] : [70, 40, 20];
        g.fillStyle = 'rgb(' + c.join(',') + ')';
        g.beginPath();
        g.ellipse(cx, 175, 52, 14, 0, 0, Math.PI * 2);
        g.fill();
        const bx = cx - 90, by = 228, bw = 180;
        g.fillStyle = '#222';
        g.fillRect(bx, by, bw, 14);
        g.fillStyle = '#d4a017';
        g.fillRect(bx + 0.62 * bw, by, 0.22 * bw, 14);
        g.fillStyle = h > 0.84 ? '#e74c3c' : '#ffffff';
        g.fillRect(bx, by + 3, h * bw, 8);
      }
      // מצות מוכנות בצד
      for (let k = 0; k < Math.min(st.made, 12); k++) {
        g.fillStyle = '#d6a050';
        g.beginPath();
        g.ellipse(30 + (k % 6) * 22, Hd - 30 - Math.floor(k / 6) * 10, 18, 5, 0, 0, Math.PI * 2);
        g.fill();
      }
      // הודעה קופצת
      if (st.flash && st.flashT > 0) {
        g.globalAlpha = Math.min(1, st.flashT * 2);
        g.font = 'bold 26px Rubik, Arial';
        g.textAlign = 'center';
        g.fillStyle = st.flash.good ? '#3ecf72' : '#ff6b6b';
        g.fillText(RTL(st.flash.text), Wd / 2, 80);
        g.globalAlpha = 1;
      }
    }

    // ---------- כניסה מהעיר ----------
    return {
      spot,
      open,
      get active() {
        return !!st;
      },
      // לבדיקות אוטומטיות
      get state() {
        return st;
      },
      zone: () => (st ? zoneOf() : null),
      tick: (dt) => update(dt),
      interactable(player) {
        if (Math.hypot(player.x - spot.x, player.z - spot.z) > 1.9) return null;
        return { label: '🫓 להיכנס למאפיית המצות' + (S().matzahBest ? ' (שיא: ' + S().matzahBest + ')' : ''), x: spot.x, z: spot.z };
      },
    };
  };
})();
