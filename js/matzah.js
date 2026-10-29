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
      '<canvas id="mz-canvas" width="1280" height="600"></canvas>' +
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
        puff(XS[0] + (Math.random() - 0.5) * 30, 196, 5, 'rgba(255,250,235,0.9)');
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
          puff(80, 182, 14, '#ffd27a', 60);
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
      // משימת פסח (אם פעילה) מקבלת את תוצאת הסבב
      if (api.onResult) api.onResult(n, quit);
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
    // ---------- ציור: מאפייה מאוירת (רקע קבוע מוכן מראש + חלקים זזים) ----------
    const LW = 640, LH = 300, SC = 2; // קואורדינטות לוגיות, מצוירות פי 2 לחדות
    const XS = [560, 400, 240, 80]; // לישה (ימין) → תנור (שמאל)
    const TABLE_Y = 196;
    const parts = []; // חלקיקי קמח וניצוצות
    function puff(x, y, n, col, up) {
      for (let k = 0; k < n; k++)
        parts.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -(up || 30) - Math.random() * 50, life: 0.6 + Math.random() * 0.5, col, r: 1.5 + Math.random() * 2.5 });
    }
    let bg = null;
    function buildBg() {
      bg = document.createElement('canvas');
      bg.width = LW * SC;
      bg.height = LH * SC;
      const c = bg.getContext('2d');
      c.scale(SC, SC);
      const rnd = G.rng(18);
      // קיר אבן חמים
      const wall = c.createLinearGradient(0, 0, 0, TABLE_Y);
      wall.addColorStop(0, '#4a3223');
      wall.addColorStop(1, '#6b4a33');
      c.fillStyle = wall;
      c.fillRect(0, 0, LW, LH);
      for (let y = 46; y < TABLE_Y; y += 14)
        for (let x = (y / 14) % 2 ? -14 : 0; x < LW; x += 28) {
          c.fillStyle = 'rgba(0,0,0,' + (0.06 + rnd() * 0.08) + ')';
          c.fillRect(x + 1, y + 1, 26, 12);
          c.fillStyle = 'rgba(255,220,180,' + rnd() * 0.05 + ')';
          c.fillRect(x + 2, y + 2, 24, 3);
        }
      // קורת עץ בתקרה
      const beam = c.createLinearGradient(0, 0, 0, 40);
      beam.addColorStop(0, '#2a1a10');
      beam.addColorStop(1, '#4a2e1a');
      c.fillStyle = beam;
      c.fillRect(0, 0, LW, 38);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x < LW; x += 3) if (rnd() < 0.3) c.fillRect(x, 4 + rnd() * 28, 2 + rnd() * 14, 1);
      // חלון עם אור יום
      const wx = 300, wy = 52;
      c.fillStyle = '#2a1a10';
      c.fillRect(wx - 4, wy - 4, 78, 66);
      const sky = c.createLinearGradient(0, wy, 0, wy + 58);
      sky.addColorStop(0, '#9fd3ff');
      sky.addColorStop(1, '#fdf0c8');
      c.fillStyle = sky;
      c.fillRect(wx, wy, 70, 58);
      c.fillStyle = '#2a1a10';
      c.fillRect(wx + 33, wy, 4, 58);
      c.fillRect(wx, wy + 27, 70, 4);
      const ray = c.createLinearGradient(wx, wy, wx + 60, TABLE_Y);
      ray.addColorStop(0, 'rgba(255,240,200,0.18)');
      ray.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = ray;
      c.beginPath();
      c.moveTo(wx, wy + 58);
      c.lineTo(wx + 70, wy + 58);
      c.lineTo(wx + 130, TABLE_Y);
      c.lineTo(wx + 10, TABLE_Y);
      c.fill();
      // מדף עם שקי קמח וכד מים
      c.fillStyle = '#3a2414';
      c.fillRect(420, 104, 200, 7);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(420, 111, 200, 4);
      const sack = (x, label) => {
        const sg = c.createLinearGradient(x, 0, x + 40, 0);
        sg.addColorStop(0, '#e8dcc0');
        sg.addColorStop(1, '#bfae8a');
        c.fillStyle = sg;
        c.beginPath();
        c.moveTo(x + 4, 104);
        c.quadraticCurveTo(x - 2, 80, x + 8, 66);
        c.lineTo(x + 32, 66);
        c.quadraticCurveTo(x + 42, 80, x + 36, 104);
        c.closePath();
        c.fill();
        c.fillStyle = '#8a6a3a';
        c.fillRect(x + 12, 62, 16, 5);
        c.fillStyle = '#7b4a12';
        c.font = 'bold 8px Rubik, Arial';
        c.textAlign = 'center';
        c.fillText(RTL(label), x + 20, 90);
      };
      sack(436, 'קמח');
      sack(482, 'שמור');
      c.fillStyle = '#9c5a2a';
      c.beginPath();
      c.ellipse(560, 92, 16, 13, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(553, 72, 14, 10);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(551, 84, 4, 12);
      c.fillStyle = '#fff4d8';
      c.font = 'bold 7px Rubik, Arial';
      c.fillText(RTL('מים שלנו'), 560, 96);
      // תנור אבן (בצד שמאל)
      const ox = XS[3];
      const dome = c.createRadialGradient(ox, 150, 10, ox, 150, 90);
      dome.addColorStop(0, '#8a6a52');
      dome.addColorStop(1, '#4a3626');
      c.fillStyle = dome;
      c.beginPath();
      c.moveTo(ox - 78, TABLE_Y);
      c.bezierCurveTo(ox - 78, 70, ox + 78, 70, ox + 78, TABLE_Y);
      c.closePath();
      c.fill();
      for (let r = 0; r < 6; r++)
        for (let k = 0; k < 9; k++) {
          const a = Math.PI + (k / 8) * Math.PI, rr = 60 - r * 9;
          c.fillStyle = 'rgba(0,0,0,0.12)';
          c.fillRect(ox + Math.cos(a) * rr - 5, 168 + Math.sin(a) * rr * 0.95 - 3, 10, 5);
        }
      // פתח התנור
      c.fillStyle = '#140a05';
      c.beginPath();
      c.moveTo(ox - 40, TABLE_Y);
      c.bezierCurveTo(ox - 40, 132, ox + 40, 132, ox + 40, TABLE_Y);
      c.closePath();
      c.fill();
      // שולחן עבודה מעץ עם קמח
      const tb = c.createLinearGradient(0, TABLE_Y, 0, LH);
      tb.addColorStop(0, '#c9a06a');
      tb.addColorStop(1, '#8a6238');
      c.fillStyle = tb;
      c.fillRect(0, TABLE_Y, LW, LH - TABLE_Y);
      c.fillStyle = '#e6c68f';
      c.fillRect(0, TABLE_Y, LW, 3);
      c.strokeStyle = 'rgba(80,45,15,0.35)';
      c.lineWidth = 1;
      for (let y = TABLE_Y + 10; y < LH; y += 9 + rnd() * 6) {
        c.beginPath();
        c.moveTo(0, y);
        for (let x = 0; x <= LW; x += 40) c.lineTo(x, y + Math.sin(x * 0.03 + y) * 1.5);
        c.stroke();
      }
      for (let k = 0; k < 420; k++) {
        c.fillStyle = 'rgba(255,250,235,' + (0.15 + rnd() * 0.35) + ')';
        const fx = 380 + rnd() * 250, fy = TABLE_Y + 4 + rnd() * 60;
        c.fillRect(fx, fy, 1 + rnd() * 2, 1);
      }
      // סל המצות המוכנות (ליד התנור)
      c.fillStyle = '#7a4e22';
      c.beginPath();
      c.ellipse(178, 268, 46, 14, 0, 0, Math.PI * 2);
      c.fill();
    }
    function chalk(x, y, text, on) {
      const w = 92, h = 24;
      g.fillStyle = on ? '#2f4a3a' : '#2a2a28';
      g.strokeStyle = on ? '#ffd23f' : '#6b4a2b';
      g.lineWidth = on ? 3 : 2;
      g.beginPath();
      if (g.roundRect) g.roundRect(x - w / 2, y - h / 2, w, h, 4);
      else g.rect(x - w / 2, y - h / 2, w, h);
      g.fill();
      g.stroke();
      g.fillStyle = on ? '#ffd23f' : 'rgba(240,235,220,0.75)';
      g.font = 'bold 13px Rubik, Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(RTL(text), x, y + 1);
    }
    function matzaShape(x, y, rx, ry, cookT, holesRows) {
      // מצה עגולה: לפי מידת האפייה — בהירה → זהובה עם כוויות → שרופה
      const base = cookT < 0.62 ? [244, 228, 190] : cookT < 0.84 ? [222, 172, 96] : [70, 42, 22];
      const gr = g.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 2, x, y, rx);
      gr.addColorStop(0, 'rgb(' + base.map((v) => Math.min(255, v + 18)).join(',') + ')');
      gr.addColorStop(1, 'rgb(' + base.map((v) => v - 22).join(',') + ')');
      g.fillStyle = gr;
      g.beginPath();
      // שפה לא מושלמת — עבודת יד
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2, wob = 1 + Math.sin(a * 5 + x) * 0.04;
        const px = x + Math.cos(a) * rx * wob, py = y + Math.sin(a) * ry * wob;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.fill();
      if (cookT >= 0.62) {
        g.fillStyle = cookT < 0.84 ? 'rgba(90,50,20,0.55)' : 'rgba(20,10,5,0.6)';
        for (let k = 0; k < 9; k++) {
          const a = k * 2.4 + x, rr = (k % 3) * 0.28 + 0.15;
          g.beginPath();
          g.ellipse(x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr, 3.5, 2, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
      if (holesRows) {
        g.fillStyle = 'rgba(110,75,35,0.8)';
        for (let r = 0; r < holesRows; r++) {
          const yy = y - ry * 0.45 + r * ry * 0.45;
          for (let k = -5; k <= 5; k++) {
            const xx = x + k * rx * 0.16;
            if (Math.hypot((xx - x) / rx, (yy - y) / ry) < 0.9) g.fillRect(xx - 1, yy - 1, 2, 2);
          }
        }
      }
    }
    function draw() {
      if (!bg) buildBg();
      const t = performance.now() / 1000;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(bg, 0, 0);
      g.setTransform(SC, 0, 0, SC, 0, 0);
      g.direction = 'ltr';
      // מנורה תלויה עם הילה חמה
      const lg = g.createRadialGradient(470, 48, 2, 470, 48, 120);
      lg.addColorStop(0, 'rgba(255,214,140,0.35)');
      lg.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = lg;
      g.fillRect(350, 0, 240, 200);
      g.fillStyle = '#2a1a10';
      g.fillRect(469, 0, 2, 38);
      g.fillStyle = '#c9a227';
      g.beginPath();
      g.moveTo(458, 48);
      g.lineTo(482, 48);
      g.lineTo(476, 38);
      g.lineTo(464, 38);
      g.fill();
      g.fillStyle = '#fff1c4';
      g.beginPath();
      g.arc(470, 50, 4, 0, Math.PI * 2);
      g.fill();
      // שעון קיר: 18 הדקות
      const prog = Math.min(1, st.t / LIMIT);
      g.fillStyle = '#f4ead2';
      g.strokeStyle = '#3a2414';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(240, 78, 26, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = prog > 0.83 ? 'rgba(220,60,50,0.55)' : 'rgba(214,160,80,0.45)';
      g.beginPath();
      g.moveTo(240, 78);
      g.arc(240, 78, 24, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      g.fill();
      g.strokeStyle = '#3a2414';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(240, 78);
      g.lineTo(240 + Math.sin(prog * Math.PI * 2) * 20, 78 - Math.cos(prog * Math.PI * 2) * 20);
      g.stroke();
      g.fillStyle = '#3a2414';
      g.font = 'bold 9px Rubik, Arial';
      g.textAlign = 'center';
      g.fillText('18', 240, 62);
      // אש בתנור
      const ox = XS[3], hot = st.stage === 'oven' ? 1 : 0.6;
      for (let k = 0; k < 7; k++) {
        const fx = ox - 30 + k * 10, fh = (18 + Math.sin(t * 9 + k * 1.7) * 6 + (k % 2) * 6) * hot;
        const fg = g.createLinearGradient(0, TABLE_Y - fh, 0, TABLE_Y);
        fg.addColorStop(0, 'rgba(255,220,90,0)');
        fg.addColorStop(0.4, 'rgba(255,170,40,0.9)');
        fg.addColorStop(1, 'rgba(200,50,10,0.95)');
        g.fillStyle = fg;
        g.beginPath();
        g.moveTo(fx - 6, TABLE_Y - 2);
        g.quadraticCurveTo(fx, TABLE_Y - fh * 1.6, fx + 6, TABLE_Y - 2);
        g.fill();
      }
      const glow = g.createRadialGradient(ox, 175, 5, ox, 175, 90);
      glow.addColorStop(0, 'rgba(255,140,40,' + (0.28 * hot + Math.sin(t * 13) * 0.03) + ')');
      glow.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = glow;
      g.fillRect(ox - 100, 80, 200, 140);
      if (Math.random() < 0.25 * hot) parts.push({ x: ox - 20 + Math.random() * 40, y: TABLE_Y - 8, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 40, life: 0.8, col: '#ffb347', r: 1.3 });
      // שלטי התחנות (לוח גיר)
      STAGES.forEach((s, i) => chalk(XS[i], 24 + 0, (i + 1) + '. ' + NAMES[s], st.stage === s));
      // ספוט על התחנה הפעילה
      const i = STAGES.indexOf(st.stage), cx = XS[i];
      const sp = g.createRadialGradient(cx, TABLE_Y + 8, 4, cx, TABLE_Y + 8, 80);
      sp.addColorStop(0, 'rgba(255,240,200,0.22)');
      sp.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = sp;
      g.fillRect(cx - 90, TABLE_Y - 70, 180, 160);
      // הבצק בתחנה הפעילה
      if (st.stage === 'knead') {
        const r = 22 + st.prog * 16, squash = 1 + Math.abs(Math.sin(st.prog * 30)) * 0.12;
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(cx, TABLE_Y + 22, r * 1.2, 6, 0, 0, Math.PI * 2);
        g.fill();
        const dg = g.createRadialGradient(cx - 8, TABLE_Y - 2, 3, cx, TABLE_Y + 8, r * 1.3);
        dg.addColorStop(0, '#fffaf0');
        dg.addColorStop(1, '#e2cfa4');
        g.fillStyle = dg;
        g.beginPath();
        for (let k = 0; k <= 20; k++) {
          const a = (k / 20) * Math.PI * 2, lump = 1 + Math.sin(a * 4 + st.prog * 9) * 0.07;
          const px = cx + Math.cos(a) * r * 1.15 * squash * lump, py = TABLE_Y + 8 + Math.sin(a) * r * 0.7 / squash * lump;
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.fill();
        // ידיים לשות
        const hand = (hx, hy) => {
          g.fillStyle = '#e8b98f';
          g.beginPath();
          g.ellipse(hx, hy, 11, 8, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#ffffff';
          g.fillRect(hx - 9, hy - 22, 18, 14);
        };
        const pump = Math.sin(st.prog * 30) * 4;
        hand(cx - 18, TABLE_Y - 4 + pump);
        hand(cx + 18, TABLE_Y - 4 - pump);
        // סרגל לישה
        bar(cx, TABLE_Y + 46, st.prog, '#f3d38a');
      } else if (st.stage === 'roll') {
        const r = 30 + st.prog * 34;
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.beginPath();
        g.ellipse(cx, TABLE_Y + 22, r, 7, 0, 0, Math.PI * 2);
        g.fill();
        matzaShape(cx, TABLE_Y + 14, r, r * 0.38, 0, 0);
        const px = cx + st.side * 18;
        const rp = g.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 12);
        rp.addColorStop(0, '#c78a4a');
        rp.addColorStop(0.5, '#a0662e');
        rp.addColorStop(1, '#6b3e1f');
        g.fillStyle = rp;
        g.fillRect(px - 46, TABLE_Y + 2, 92, 11);
        g.fillStyle = '#5a3216';
        g.fillRect(px - 60, TABLE_Y + 4, 14, 7);
        g.fillRect(px + 46, TABLE_Y + 4, 14, 7);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(px - 44, TABLE_Y + 3, 88, 2);
        bar(cx, TABLE_Y + 46, st.prog, '#f3d38a');
      } else if (st.stage === 'holes') {
        matzaShape(cx, TABLE_Y + 14, 66, 26, 0, st.rows);
        // גלגל הניקוב (רדל) נע לאורך המצה
        const wx = cx - 60 + st.mark * 120, wy = TABLE_Y + 14 - 12 + st.rows * 12;
        g.fillStyle = '#5a3216';
        g.fillRect(wx - 2, wy - 30, 4, 24);
        g.fillStyle = '#c0c0c0';
        g.beginPath();
        g.arc(wx, wy - 4, 7, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#7a7a7a';
        g.lineWidth = 1;
        for (let k = 0; k < 8; k++) {
          const a = k * 0.785 + t * 8;
          g.beginPath();
          g.moveTo(wx, wy - 4);
          g.lineTo(wx + Math.cos(a) * 9, wy - 4 + Math.sin(a) * 9);
          g.stroke();
        }
        // סרגל תזמון
        const bw = 150, bx = cx - bw / 2, by = TABLE_Y + 46, z = zoneOf();
        frame(bx, by, bw);
        g.fillStyle = '#3ecf72';
        g.fillRect(bx + z[0] * bw, by, (z[1] - z[0]) * bw, 10);
        g.fillStyle = '#ffffff';
        g.fillRect(bx + st.mark * bw - 2, by - 4, 4, 18);
      } else if (st.stage === 'oven') {
        const h = Math.min(1, st.heat);
        // מרדה (כף עץ) מכניסה את המצה לתנור
        g.fillStyle = '#8b5a2b';
        g.fillRect(ox + 30, TABLE_Y - 12, 120, 5);
        matzaShape(ox, TABLE_Y - 14, 34, 9, h, 3);
        // מדחום אפייה
        const bw = 150, bx = 240 - bw / 2, by = TABLE_Y + 46;
        frame(bx, by, bw);
        g.fillStyle = 'rgba(212,160,23,0.85)';
        g.fillRect(bx + 0.62 * bw, by, 0.22 * bw, 10);
        const hg = g.createLinearGradient(bx, 0, bx + bw, 0);
        hg.addColorStop(0, '#fff4d8');
        hg.addColorStop(0.62, '#ffb347');
        hg.addColorStop(1, '#e74c3c');
        g.fillStyle = hg;
        g.fillRect(bx, by + 2, h * bw, 6);
        g.fillStyle = '#fff';
        g.font = 'bold 10px Rubik, Arial';
        g.textAlign = 'center';
        g.fillText(RTL('זהובה ✓'), bx + 0.73 * bw, by - 6);
      }
      // הסל: מצות מוכנות נערמות
      for (let k = 0; k < Math.min(st.made, 14); k++) matzaShape(178 + ((k % 3) - 1) * 16, 262 - Math.floor(k / 3) * 5 - (k % 3 === 1 ? 2 : 0), 22, 6, 0.75, 0);
      // חלקיקים
      const dt = 1 / 60;
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(k, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt;
        g.globalAlpha = Math.min(1, p.life * 2);
        g.fillStyle = p.col;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      // הודעה קופצת עם קו מתאר
      if (st.flash && st.flashT > 0) {
        g.globalAlpha = Math.min(1, st.flashT * 2);
        g.font = 'bold 26px Rubik, Arial';
        g.textAlign = 'center';
        g.lineWidth = 5;
        g.strokeStyle = 'rgba(20,10,5,0.85)';
        g.strokeText(RTL(st.flash.text), LW / 2 + 40, 128);
        g.fillStyle = st.flash.good ? '#5ef08f' : '#ff7b7b';
        g.fillText(RTL(st.flash.text), LW / 2 + 40, 128);
        g.globalAlpha = 1;
      }
      // וינייטה רכה
      const vg = g.createRadialGradient(LW / 2, LH / 2, LH * 0.35, LW / 2, LH / 2, LW * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      g.fillStyle = vg;
      g.fillRect(0, 0, LW, LH);
    }
    function frame(bx, by, bw) {
      g.fillStyle = 'rgba(20,10,5,0.8)';
      g.fillRect(bx - 3, by - 3, bw + 6, 16);
      g.fillStyle = '#2a1a10';
      g.fillRect(bx, by, bw, 10);
    }
    function bar(cx, by, p, col) {
      const bw = 120, bx = cx - bw / 2;
      frame(bx, by, bw);
      g.fillStyle = col;
      g.fillRect(bx, by + 1, bw * Math.min(1, p), 8);
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
