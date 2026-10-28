// אירועים דינמיים ברחוב (ממסמך האפיון): מישהו בשכונה צריך עזרה — מופיע ליד השחקן כשאין משימה פעילה
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeEvents = function (api) {
    const { scene, W, A, player, van } = api;
    if (!W.paths || !W.paths.length) return null;
    const ACT = api.isTouch ? 'כפתור הפעולה' : 'E';
    const lam = (c) => new T.MeshLambertMaterial({ color: c });
    const rnd = Math.random;

    // דמויות ואביזרים לאירועים (נוצרים פעם אחת ומוסתרים)
    const NP = {
      yaakov: api.addNPC({ id: 'ev_yaakov', name: 'יעקב', role: 'מחפש סידור', x: 0, z: 0, look: { shirt: 0xdfe6ee, pants: 0x3b3b44, skin: 0xe2b088, hair: 0x777777, kippah: 0x222222 } }),
      haim: api.addNPC({ id: 'ev_haim', name: 'חיים', role: 'בעל חנות', x: 0, z: 0, look: { shirt: 0xf3efe2, apron: 0x9c6b3c, pants: 0x4b3b2b, skin: 0xc98e62, cap: 0x2e7d4f } }),
      nachman: api.addNPC({ id: 'ev_nachman', name: 'נחמן', role: 'מהניידת של ברסלב', x: 0, z: 0, look: { shirt: 0xffffff, pants: 0x2b2b2b, skin: 0xe2b088, kippah: 0xffffff, beard: 0x5a3a1a, tzitzit: true } }),
      david: api.addNPC({ id: 'ev_david', name: 'דוד', role: 'פתח חנות חדשה', x: 0, z: 0, look: { shirt: 0x2e86de, pants: 0x2c3e50, skin: 0xe8c0a0, hair: 0x3a2a1a } }),
      zaken: api.addNPC({ id: 'ev_zaken', name: 'סבא שלמה', role: 'מחכה לאוטובוס', x: 0, z: 0, look: { shirt: 0xffffff, jacket: 0x4a4a55, pants: 0x3b3b44, skin: 0xe2b088, kippah: 0x222222, beard: 0xeeeeee } }),
      levi: api.addNPC({ id: 'ev_levi', name: 'משפחת לוי', role: 'חדשים בשכונה', x: 0, z: 0, look: { shirt: 0x7fb3d5, pants: 0x2c3e50, skin: 0xf0c8a0, hair: 0x4a2f1b } }),
    };
    for (const k in NP) NP[k].hidden = true;
    const boxes = [];
    for (let i = 0; i < 3; i++) {
      const b = new T.Group();
      const m = new T.Mesh(new T.BoxGeometry(0.75, 0.5, 0.6), lam(0x9c6b3c));
      m.position.y = 0.25;
      m.castShadow = true;
      const top = new T.Mesh(new T.BoxGeometry(0.65, 0.12, 0.5), lam([0xe74c3c, 0x27ae60, 0xf1c40f][i]));
      top.position.y = 0.55;
      b.add(m, top);
      b.visible = false;
      scene.add(b);
      boxes.push(b);
    }
    const truck = G.makeDriveCar(0xf2f2ee);
    truck.group.scale.set(1.25, 1.35, 1.6);
    truck.group.visible = false;
    scene.add(truck.group);
    const truckBoxes = new T.Group();
    for (let i = 0; i < 4; i++) {
      const m = new T.Mesh(new T.BoxGeometry(0.6, 0.45, 0.5), lam(0xa9825a));
      m.position.set((i % 2) * 0.7 - 0.35, 0.22 + ((i / 2) | 0) * 0.46, 0);
      m.castShadow = true;
      truckBoxes.add(m);
    }
    truckBoxes.visible = false;
    scene.add(truckBoxes);

    let ev = null, nextT = 45, doneCount = 0, onQuestDone = null;
    const freeAt = (x, z) => !W.collide(x, z, 0.7).hit;
    function pickSpot(minD, maxD) {
      const list = W.pathsNear ? W.pathsNear(player.x, player.z) : W.paths;
      if (!list.length) return null;
      for (let k = 0; k < 60; k++) {
        const p = list[(rnd() * list.length) | 0];
        const pt = p.pts[(rnd() * p.pts.length) | 0];
        const d = Math.hypot(pt[0] - player.x, pt[1] - player.z);
        if (d > minD && d < maxD && freeAt(pt[0], pt[1])) return { x: pt[0], z: pt[1] };
      }
      return null;
    }
    function show(n, x, z, rot) {
      n.hidden = false;
      n.x = x;
      n.z = z;
      n.rot = n.rotT = rot || 0;
      n.def.rot = rot || 0;
      n.ctrl = null;
      n.evIcon = 'event';
    }
    function clear() {
      if (!ev) return;
      for (const k in NP) {
        NP[k].hidden = true;
        NP[k].evIcon = undefined;
        NP[k].nodes = null;
      }
      for (const b of boxes) b.visible = false;
      if (ev.type === 'mezuzah' && ev.state !== 'done') mezMesh.visible = false;
      trempBeam.visible = false;
      if (ev.type === 'breslev') clearBreslev();
      truck.group.visible = truckBoxes.visible = false;
      ev = null;
    }
    function reward(joy, comm, text) {
      api.addJoy(joy);
      if (comm) api.addCommunity(comm);
      A.success();
      doneCount++;
      api.toast(text + ' +' + joy + ' שמחה' + (comm ? ' · +' + comm + ' קשרים' : ''), 'gold');
      const n = ev && NP[ev.npc];
      if (n) {
        n.evIcon = 'ok';
        n.nodes = { a: { s: 'npc', t: 'תודה רבה! שתהיה לך שבת שלום.' } };
      }
      ev.state = 'done';
      ev.ttl = 25;
      api.save();
    }

    // ---------- 1. סידור ----------
    function startSiddur() {
      const s = pickSpot(40, 140);
      if (!s) return false;
      ev = { type: 'siddur', npc: 'yaakov', state: 'ask', ttl: 160, x: s.x, z: s.z };
      show(NP.yaakov, s.x, s.z, rnd() * 6);
      NP.yaakov.nodes = {
        a: {
          s: 'npc', t: 'סליחה, אתה במקרה... רציתי להתפלל מנחה, ושכחתי את הסידור בבית. יש לך אולי?',
          c: [
            { t: 'יש לי סידורים בטנק המבצעים — אני מביא לך!', fx: () => { ev.state = 'fetch'; api.toast('קחו סידור מהטנק (גשו לטנק ולחצו ' + ACT + ')'); } },
            { t: 'בית הכנסת קרוב — אבל אביא לך מהטנק, יותר מהר.', fx: () => { ev.state = 'fetch'; } },
          ],
        },
      };
      return true;
    }
    // ---------- 2. ארגזים לחנות ----------
    function startBoxes() {
      const shops = (W.shops || []).filter((s) => {
        const d = Math.hypot(s.x - player.x, s.z - player.z);
        return d > 35 && d < 180;
      });
      if (!shops.length) return false;
      const sh = shops[(rnd() * shops.length) | 0];
      ev = { type: 'boxes', npc: 'haim', state: 'ask', ttl: 180, x: sh.x, z: sh.z, shop: sh, left: 3 };
      show(NP.haim, sh.x + sh.ux * 1.6, sh.z + sh.uz * 1.6, sh.ang);
      boxes.forEach((b, i) => {
        b.position.set(sh.x - sh.ux * (1 + i * 0.9) + sh.nx * 0.8, 0, sh.z - sh.uz * (1 + i * 0.9) + sh.nz * 0.8);
        b.rotation.y = sh.ang + (rnd() - 0.5) * 0.4;
        b.visible = false;
      });
      NP.haim.nodes = {
        a: {
          s: 'npc', t: 'אוף, המשלוח הגיע והעובד שלי חולה. שלושה ארגזים כבדים על המדרכה... יש מצב לעזרה?',
          c: [{ t: 'בטח! אני מכניס אותם.', fx: () => { ev.state = 'carry'; boxes.forEach((b) => (b.visible = true)); api.toast('הכניסו את שלושת הארגזים (' + ACT + ' ליד כל ארגז)'); } }],
        },
      };
      boxes.forEach((b) => (b.visible = true));
      return true;
    }
    // ---------- 3. משפחה חדשה ----------
    function startFamily() {
      const s = pickSpot(45, 160);
      if (!s) return false;
      const r = W.nearestRoad ? W.nearestRoad(s.x, s.z, 40) : null;
      ev = { type: 'family', npc: 'levi', state: 'ask', ttl: 180, x: s.x, z: s.z };
      show(NP.levi, s.x, s.z, rnd() * 6);
      if (r && r.d < 14) {
        truck.group.position.set(r.x - r.dz * 1.6, 0, r.z + r.dx * 1.6);
        truck.group.rotation.y = Math.atan2(r.dx, r.dz);
        truck.group.visible = true;
        truckBoxes.position.set(s.x + 1.2, 0, s.z + 0.8);
        truckBoxes.visible = true;
      }
      NP.levi.nodes = {
        a: { s: 'npc', t: 'שלום! עברנו השבוע לשכונה, עם שלושה ילדים ואלף ארגזים. אנחנו עוד לא מכירים פה אף אחד...', go: 'b' },
        b: {
          s: 'npc', t: 'תגיד, יש פה בכלל קהילה? משהו לשבת?',
          c: [
            { t: 'בואו לסעודת שבת בבית חב״ד — יש מקום לכולם, גם לילדים.', fx: () => reward(8, 2, 'משפחת לוי באה לשבת!') },
            { t: 'אני אכיר לכם את משה — הוא מכיר את כל השכונה.', fx: () => reward(6, 2, 'משפחת לוי קיבלה חיבוק מהשכונה!') },
          ],
        },
      };
      return true;
    }

    // ---------- 4. הניידת של ברסלב: נוסעים איתם ומשמחים שלוש התקהלויות ----------
    // הכול בצניעות: הרוקדים והקהל — גברים בלבד
    const DANCE_LOOKS = [
      { shirt: 0xffffff, pants: 0x222222, skin: 0xe8c0a0, kippah: 0xffffff, beard: 0x3a2a1a, tzitzit: true },
      { shirt: 0xffffff, pants: 0x2b2b2b, skin: 0xd9a27a, kippah: 0xffffff, hair: 0x222222, tzitzit: true },
      { shirt: 0xf5f5f5, pants: 0x1f1f1f, skin: 0xf0c8a0, kippah: 0xffffff, beard: 0x8a6a3a, tzitzit: true },
      { shirt: 0xffffff, pants: 0x333333, skin: 0xc98e62, kippah: 0xffffff, beard: 0x222222, tzitzit: true },
    ];
    const CROWD_LOOKS = [
      { shirt: 0x3d7dd8, pants: 0x2f3e5c, skin: 0xf0c8a0, hair: 0x4a2f1b },
      { shirt: 0xe85d2a, pants: 0x2d3a4a, skin: 0xc98e62, cap: 0x1f3f8f },
      { shirt: 0x2ecc71, pants: 0x222222, skin: 0xf2c6a2, hair: 0x6b4423 },
      { shirt: 0xffffff, jacket: 0x2b2b33, pants: 0x2b2b33, skin: 0xe8b98f, hat: 'fedora', beard: 0xdddddd },
      { shirt: 0xf3efe2, pants: 0x4b3b2b, skin: 0xe2b088, kippah: 0x1b3a8a, hair: 0x8a8a8a },
      { shirt: 0x8fb3d9, pants: 0x2c3e50, skin: 0xd9a27a, hair: 0x333333, kippah: 0x222222 },
    ];
    let dancers = null, crowds = null;
    function people() {
      if (dancers) return;
      const mk = (lk) => {
        const p = G.makePerson(lk);
        p.group.visible = false;
        p.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(p.group);
        return p;
      };
      dancers = DANCE_LOOKS.map(mk);
      crowds = [0, 1, 2].map(() => CROWD_LOOKS.map(mk));
    }
    function roadSpot(from, minD, maxD, avoid) {
      // רק כבישים בטווח (בעיר גדולה הגרלה מכל העיר כמעט אף פעם לא נופלת קרוב)
      const roads = (W.roadList || []).filter((r) => r.cls !== 'path' && r.t !== 'service' && r.w >= 6 && r.pts.some((p) => Math.abs(p[0] - from.x) < maxD + 40 && Math.abs(p[1] - from.z) < maxD + 40));
      for (let k = 0; k < 400 && roads.length; k++) {
        const r = roads[(rnd() * roads.length) | 0];
        const i = (rnd() * (r.pts.length - 1)) | 0;
        const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 14) continue;
        const t = 0.3 + rnd() * 0.4, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const d = Math.hypot(x - from.x, z - from.z);
        if (d < minD || d > maxD || Math.abs(x) > W.HALF - 50 || Math.abs(z) > W.HALF - 50) continue;
        if (avoid && avoid.some((o) => Math.hypot(o.x - x, o.z - z) < 90)) continue;
        const ux = (bx - ax) / L, uz = (bz - az) / L, sd = rnd() < 0.5 ? 1 : -1, nx = -uz * sd, nz = ux * sd;
        let off = 0;
        for (const o of [3.2, 2.6, 4.2]) if (!W.collide(x + nx * (r.w / 2 + o), z + nz * (r.w / 2 + o), 1.2).hit) { off = o; break; }
        if (!off) continue;
        const cx = x + nx * (r.w / 2 + off), cz = z + nz * (r.w / 2 + off);
        return { x: x + nx * 1.7, z: z + nz * 1.7, h: Math.atan2(ux, uz), cx, cz, nx, nz, ux, uz, name: r.name };
      }
      return null;
    }
    function placeCrowd(i, st) {
      crowds[i].forEach((p, k) => {
        const a = (k / crowds[i].length) * Math.PI * 2 + 0.4;
        const x = st.cx + Math.cos(a) * 3.3 + st.nx * 0.6, z = st.cz + Math.sin(a) * 3.3 + st.nz * 0.6;
        p.group.position.set(x, 0, z);
        p.group.rotation.y = Math.atan2(st.cx - x, st.cz - z);
        p.group.visible = true;
        p.ph = rnd() * 6;
      });
    }
    function startBreslev() {
      people();
      const at = roadSpot(player, 35, 150);
      if (!at) return false;
      const stops = [];
      let from = at;
      for (let i = 0; i < 3; i++) {
        const s = roadSpot(from, 90, 260, stops.concat([at]));
        if (!s) return false;
        stops.push(s);
        from = s;
      }
      const bv = api.addVehicle('breslev', 'breslev', at.x, at.z, at.h);
      bv.locked = true;
      ev = { type: 'breslev', npc: 'nachman', state: 'ask', ttl: 240, x: at.x, z: at.z, bv, stops, i: 0, at };
      // נחמן עומד בין הניידת למדרכה (לא צמוד לקירות)
      show(NP.nachman, at.x + at.nx * 2.5 + at.ux * 1.5, at.z + at.nz * 2.5 + at.uz * 1.5, Math.atan2(-at.nx, -at.nz));
      stops.forEach((st, i) => placeCrowd(i, st));
      NP.nachman.nodes = {
        a: { s: 'npc', t: 'נ נח נחמ נחמן מאומן! שליח, יופי שבאת! אנחנו יוצאים עכשיו לשמח את העיר — שלוש תחנות, ריקודים ושמחה גדולה.', go: 'b' },
        b: {
          s: 'npc', t: 'מצווה גדולה להיות בשמחה תמיד! בא איתנו בניידת?',
          c: [
            { t: 'בטח! שמחה של יהודי — זה הכי חב״די שיש. עולה!', fx: boardBreslev },
            { t: 'עוד רגע, אני מסיים משהו', fx: () => api.toast('הניידת של ברסלב מחכה לך — מסומנת במפה') },
          ],
        },
      };
      return true;
    }
    function boardBreslev() {
      const bv = ev.bv;
      NP.nachman.hidden = true;
      NP.nachman.evIcon = undefined;
      bv.locked = false;
      api.enterVehicle(bv);
      bv.autoMsg = 'נוסעים עם החבר׳ה! יורדים בסוף הסיבוב 🎶';
      // ברדיו הרגיל שקט — מתנגן רק השיר שלהם (ואם הקובץ חסר: ניגון ריקוד)
      const S = api.S;
      A.kol(false);
      S.radio = A.bresFailed ? 3 : 0;
      A.setStation(S.radio);
      api.radioLabel('♪ נח נחמן מאומן — מהרמקול של ברסלב');
      api.toast('עלית לניידת של ברסלב! נוסעים לתחנה הראשונה 🎶', 'gold');
      ev.ttl = 600;
      driveTo(0);
    }
    function driveTo(i) {
      const st = ev.stops[i], bv = ev.bv;
      ev.i = i;
      ev.state = 'drive';
      ev.stuck = 0;
      ev.route = (W.route && W.route(bv.x, bv.z, st.x, st.z)) || [[bv.x, bv.z], [st.x, st.z]];
      ev.ri = 1;
      // פונים לכיוון המסלול לפני היציאה
      const nx = ev.route[Math.min(2, ev.route.length - 1)];
      if (Math.abs(bv.v) < 1) bv.h = Math.atan2(nx[0] - bv.x, nx[1] - bv.z);
      bv.auto = autopilot;
    }
    function autopilot(dt, v) {
      const st = ev && ev.stops[ev.i];
      if (!ev || ev.state !== 'drive' || !st) return { throttle: 0, steer: 0, brake: true };
      const R = ev.route;
      while (ev.ri < R.length - 1 && Math.hypot(R[ev.ri][0] - v.x, R[ev.ri][1] - v.z) < 7) ev.ri++;
      const tg = R[ev.ri];
      const dEnd = Math.hypot(st.x - v.x, st.z - v.z);
      if (dEnd < 4) {
        if (Math.abs(v.v) < 0.6) arrive();
        return { throttle: 0, steer: 0, brake: true };
      }
      // תקועים? מקפיצים קצת קדימה במסלול
      ev.stuck = v.blocked > 0 || Math.abs(v.v) < 0.5 ? ev.stuck + dt : 0;
      if (ev.stuck > 3.5) {
        ev.stuck = 0;
        const n = R[Math.min(ev.ri + 1, R.length - 1)];
        v.x = tg[0];
        v.z = tg[1];
        v.h = Math.atan2(n[0] - v.x, n[1] - v.z);
        v.v = 0;
      }
      const diff = G.wrapAngle(Math.atan2(tg[0] - v.x, tg[1] - v.z) - v.h);
      const want = Math.min(11, dEnd * 0.7 + 2) * (Math.abs(diff) > 0.7 ? 0.45 : 1);
      return { throttle: G.clamp((want - v.v) * 0.4, -1, 1), steer: G.clamp(diff * 2.5, -1, 1), brake: false };
    }
    function arrive() {
      const st = ev.stops[ev.i];
      ev.state = 'dance';
      ev.danceT = 0;
      ev.bv.v = 0;
      ev.bv.camLook = { x: st.cx, z: st.cz };
      A.cheer && A.cheer();
      api.toast(['🎉 החבר׳ה יורדים לרקוד!', '🎉 עוד תחנה — עוד ריקוד!', '🎉 תחנה אחרונה — שמחה גדולה!'][ev.i], 'gold');
      dancers.forEach((p, k) => {
        p.group.visible = true;
        p.from = { x: ev.bv.x + st.nx * 1.4 + st.ux * (k - 1.5) * 0.5, z: ev.bv.z + st.nz * 1.4 + st.uz * (k - 1.5) * 0.5 };
      });
    }
    function updateBreslev(dt) {
      const t = performance.now() / 1000;
      // השיר שלהם: בתוך הניידת ובריקודים — חזק; מבחוץ — לפי המרחק מהרמקול
      const bv = ev.bv;
      let vol = 0;
      if (bv && ev.state !== 'done' && ev.state !== 'end') {
        if (api.drv === bv || ev.state === 'dance') vol = 1;
        else vol = G.clamp(1 - Math.hypot(player.x - bv.x, player.z - bv.z) / 45, 0, 1) * 0.8;
      }
      A.breslev(vol);
      // הקהל מוחא כפיים
      if (crowds)
        crowds.forEach((grp, gi) =>
          grp.forEach((p) => {
            if (!p.group.visible) return;
            const hot = ev.state === 'dance' && ev.i === gi;
            const c = Math.sin(t * (hot ? 9 : 2) + p.ph);
            p.group.position.y = hot ? Math.abs(c) * 0.12 : 0;
            p.armL.rotation.x = p.armR.rotation.x = hot ? -1.2 + c * 0.25 : -0.05;
            p.armL.rotation.z = hot ? -0.5 - c * 0.3 : -0.06;
            p.armR.rotation.z = hot ? 0.5 + c * 0.3 : 0.06;
          })
        );
      if (ev.state !== 'dance') return;
      const st = ev.stops[ev.i];
      ev.danceT += dt;
      const dT = ev.danceT;
      dancers.forEach((p, k) => {
        const a = (k / dancers.length) * Math.PI * 2 + dT * 1.6;
        const tx = st.cx + Math.cos(a) * 1.5, tz = st.cz + Math.sin(a) * 1.5;
        let x = tx, z = tz;
        const out = dT < 1.6 ? dT / 1.6 : dT > 12 ? Math.max(0, 1 - (dT - 12) / 1.4) : 1;
        if (out < 1) {
          x = p.from.x + (tx - p.from.x) * out;
          z = p.from.z + (tz - p.from.z) * out;
        }
        const bob = G.animatePerson(p, dT * 9 + k, 1);
        p.group.position.set(x, bob + (out >= 1 ? Math.abs(Math.sin(dT * 7 + k)) * 0.3 : 0), z);
        p.group.rotation.y = out >= 1 ? a + Math.PI : Math.atan2(tx - x, tz - z);
        if (out >= 1) {
          p.armL.rotation.x = p.armR.rotation.x = -2.7 + Math.sin(dT * 7 + k) * 0.35;
          p.armL.rotation.z = -0.3;
          p.armR.rotation.z = 0.3;
        }
      });
      if (dT > 4 && !ev.cheered) {
        ev.cheered = true;
        A.cheer && A.cheer();
      }
      if (dT > 13.4) {
        dancers.forEach((p) => (p.group.visible = false));
        ev.cheered = false;
        ev.bv.camLook = null;
        api.addJoy(4);
        api.toast('השכונה שמחה! +4 שמחה');
        if (ev.i < 2) driveTo(ev.i + 1);
        else finishBreslev();
      }
    }
    function finishBreslev() {
      const bv = ev.bv, st = ev.stops[2];
      bv.auto = null;
      ev.state = 'end';
      if (api.drv === bv) api.exitVehicle();
      bv.locked = true;
      show(NP.nachman, st.cx - st.nx * 1.0 + st.ux * 2, st.cz - st.nz * 1.0 + st.uz * 2, Math.atan2(-st.nx, -st.nz));
      A.breslev(0);
      if (api.S.radio === 3) {
        api.S.radio = 0;
        A.setStation(0);
      }
      reward(12, 3, 'שימחתם את העיר עם החבר׳ה מברסלב!');
      // כשזו משימה של פרק 2 — מודיעים למשימות
      if (ev.quest && onQuestDone) {
        const cb = onQuestDone;
        onQuestDone = null;
        setTimeout(cb, 1500);
      }
      NP.nachman.nodes = { a: { s: 'npc', t: 'אשריך שליח! איזו שמחה! נ נח נחמ נחמן מאומן — ובחב״ד אומרים: ״שמחה פורצת גדר״. נתראה בתחנה הבאה!' } };
    }
    function clearBreslev() {
      A.breslev(0);
      const bv = ev.bv;
      if (bv) {
        bv.auto = null;
        if (api.drv === bv) api.exitVehicle();
        api.removeVehicle(bv);
      }
      if (dancers) dancers.forEach((p) => (p.group.visible = false));
      if (crowds) crowds.forEach((g2) => g2.forEach((p) => (p.group.visible = false)));
    }

    // ---------- 5. מזוזה לחנות החדשה ----------
    const mezMesh = new T.Mesh(new T.BoxGeometry(0.08, 0.32, 0.08), lam(0xd4a017));
    mezMesh.visible = false;
    scene.add(mezMesh);
    function startMezuzah() {
      const shops = (W.shops || []).filter((s) => {
        const d = Math.hypot(s.x - player.x, s.z - player.z);
        return d > 35 && d < 180;
      });
      if (!shops.length) return false;
      const sh = shops[(rnd() * shops.length) | 0];
      // הצד הימני של הפתח, על הקיר
      const door = { x: sh.x - sh.nx * 1.5 + sh.ux * 0.8, z: sh.z - sh.nz * 1.5 + sh.uz * 0.8 };
      ev = { type: 'mezuzah', npc: 'david', state: 'ask', ttl: 200, x: sh.x, z: sh.z, door };
      show(NP.david, sh.x - sh.ux * 1.4, sh.z - sh.uz * 1.4, sh.ang);
      mezMesh.position.set(door.x + sh.nx * 0.05, 1.65, door.z + sh.nz * 0.05);
      mezMesh.rotation.set(0, sh.ang, -0.4);
      NP.david.nodes = {
        a: { s: 'npc', t: 'שלום! פתחתי היום את החנות — חלום של עשר שנים! ...רק דבר אחד חסר: אין מזוזה בכניסה. אמא שלי תהרוג אותי.', go: 'b' },
        b: {
          s: 'npc', t: 'אתה במקרה יודע איפה קונים מזוזה כשרה? היום, לפני הלקוחות הראשונים?',
          c: [
            { t: 'יש לי מזוזה כשרה בטנק — אני מביא ונקבע ביחד!', fx: () => { ev.state = 'fetch'; api.toast('קחו מזוזה מתא המטען של הטנק (' + ACT + ' מאחורי הטנק)'); } },
            { t: 'מזל טוב על החנות! אני כבר חוזר עם מזוזה.', fx: () => { ev.state = 'fetch'; } },
          ],
        },
      };
      return true;
    }
    // ---------- 6. טרמפ למנחה ----------
    function startTremp() {
      const s = pickSpot(50, 170);
      if (!s) return false;
      const sp = W.spots || {};
      const dz = sp.zoneShul || sp.zoneGreat || W.places.chabadDoor;
      if (!dz) return false;
      const dest = { x: dz.x, z: dz.z, name: sp.zoneShul ? 'בית הכנסת' : sp.zoneGreat ? 'בית הכנסת הגדול' : 'בית חב״ד' };
      if (Math.hypot(dest.x - s.x, dest.z - s.z) < 60) return false;
      ev = { type: 'tremp', npc: 'zaken', state: 'ask', ttl: 240, x: s.x, z: s.z, dest };
      show(NP.zaken, s.x, s.z, rnd() * 6);
      NP.zaken.nodes = {
        a: { s: 'npc', t: '(מסתכל בשעון) האוטובוס לא הגיע כבר חצי שעה... ומנחה ב' + dest.name + ' מתחילה עוד מעט. ברגל זה רחוק בשבילי.', go: 'b' },
        b: {
          s: 'npc', t: 'שלושים שנה לא פספסתי מנחה, אתה יודע?',
          c: [{ t: 'בוא, אני לוקח אותך בטנק — מגיעים בזמן!', fx: () => { ev.state = 'pickup'; api.toast('הביאו את הטנק לסבא שלמה ועצרו לידו', 'gold'); } }],
        },
      };
      return true;
    }
    const trempBeam = (() => {
      const g = new T.Group();
      const c = new T.Mesh(new T.CylinderGeometry(4, 4, 8, 24, 1, true), new T.MeshBasicMaterial({ color: 0xb07cff, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      c.position.y = 4;
      const rg = new T.Mesh(new T.RingGeometry(3.65, 4, 40), new T.MeshBasicMaterial({ color: 0xb07cff, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }));
      rg.rotation.x = -Math.PI / 2;
      rg.position.y = 0.22;
      const dc = new T.Mesh(new T.CircleGeometry(3.65, 40), new T.MeshBasicMaterial({ color: 0xb07cff, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide }));
      dc.rotation.x = -Math.PI / 2;
      dc.position.y = 0.21;
      g.add(c, rg, dc);
      g.visible = false;
      scene.add(g);
      return g;
    })();
    function updateTremp() {
      trempBeam.visible = ev.state === 'ride';
      if (ev.state === 'ride') trempBeam.position.set(ev.dest.x, 0, ev.dest.z);
      const n = NP.zaken, d = api.drv;
      if (ev.state === 'pickup' && d === van && Math.abs(van.v) < 2 && Math.hypot(van.x - n.x, van.z - n.z) < 8) {
        ev.state = 'ride';
        n.hidden = true;
        n.evIcon = undefined;
        A.door && A.door('tank');
        api.toast('סבא שלמה עלה לטנק — נוסעים ל' + ev.dest.name + '!', 'gold');
      } else if (ev.state === 'ride' && d === van && Math.abs(van.v) < 2 && Math.hypot(van.x - ev.dest.x, van.z - ev.dest.z) < 11) {
        ev.state = 'arrive';
        show(n, van.x + Math.cos(van.h) * 2.6, van.z - Math.sin(van.h) * 2.6, van.h + Math.PI / 2);
        A.door && A.door('tank');
        reward(8, 1, 'סבא שלמה הגיע למנחה בזמן!');
        n.nodes = { a: { s: 'npc', t: 'הגענו! ובזמן! שלושים ואחת שנה בלי לפספס — בזכותך. תבוא להתפלל איתנו?' } };
      }
    }

    const STARTERS = [startSiddur, startBoxes, startFamily, startBreslev, startMezuzah, startTremp];
    return {
      update(dt, busy) {
        if (ev) {
          if (ev.type === 'breslev') updateBreslev(dt);
          if (ev.type === 'breslev' && (ev.state === 'drive' || ev.state === 'dance')) return;
          if (ev.type === 'tremp') {
            updateTremp();
            if (ev.state === 'ride') return;
          }
          ev.ttl -= dt;
          if (ev.ttl <= 0) {
            if (ev.state !== 'done') api.toast('האירוע בשכונה הסתיים — יהיו עוד הזדמנויות');
            clear();
            nextT = 60 + rnd() * 40;
          }
          return;
        }
        if (busy) return;
        nextT -= dt;
        if (nextT > 0) return;
        nextT = 70 + rnd() * 50;
        const order = STARTERS.slice().sort(() => rnd() - 0.5);
        for (const s of order)
          if (s()) {
            A.chime();
            api.toast('✦ מישהו בשכונה צריך עזרה — מסומן במפה', 'gold');
            break;
          }
      },
      interactables() {
        const out = [];
        if (!ev) return out;
        if (ev.type === 'siddur' && ev.state === 'fetch')
          out.push({ x: van.x - Math.sin(van.h) * 2.9, z: van.z - Math.cos(van.h) * 2.9, r: 2.2, prio: true, label: 'לקחת סידור מתא המטען של הטנק', run: () => { ev.state = 'have'; A.load(); api.toast('יש סידור! חזרה ליעקב'); NP.yaakov.nodes = { a: { s: 'npc', t: 'וואו, הבאת! תודה, תודה. עכשיו אני יכול להתפלל.', end: () => reward(6, 1, 'יעקב התפלל מנחה!') } }; } });
        // אפשר לעלות לניידת גם בלי לדבר קודם עם נחמן
        if (ev.type === 'breslev' && ev.state === 'ask')
          out.push({ x: ev.bv.x, z: ev.bv.z, r: 3.6, prio: true, label: 'לעלות לניידת של ברסלב', run: () => { api.toast('נחמן: ״נ נח נחמ נחמן מאומן! עולים — יוצאים לשמח!״', 'gold'); boardBreslev(); } });
        if (ev.type === 'mezuzah' && ev.state === 'fetch')
          out.push({ x: van.x - Math.sin(van.h) * 3.4, z: van.z - Math.cos(van.h) * 3.4, r: 2.4, prio: true, label: 'לקחת מזוזה מתא המטען של הטנק', run: () => { ev.state = 'have'; A.load(); api.toast('יש מזוזה! קבעו אותה בפתח החנות של דוד, בצד ימין'); } });
        if (ev.type === 'mezuzah' && ev.state === 'have')
          out.push({ x: ev.door.x, z: ev.door.z, r: 2.2, prio: true, label: 'לקבוע את המזוזה (״ברוך... לקבוע מזוזה״)', run: () => { mezMesh.visible = true; A.success(); reward(7, 1, 'דוד: ״עכשיו זאת חנות אמיתית!״'); NP.david.nodes = { a: { s: 'npc', t: 'הלקוח הראשון כבר נכנס! אמא שלי תהיה גאה. תבוא לקפה מתי שתרצה.' } }; } });
        if (ev.type === 'boxes' && ev.state === 'carry')
          boxes.forEach((b) => {
            if (!b.visible) return;
            out.push({
              x: b.position.x, z: b.position.z, r: 1.8, label: 'להכניס ארגז לחנות',
              run: () => {
                b.visible = false;
                ev.left--;
                A.load();
                if (ev.left <= 0) reward(7, 1, 'חיים: ״אלוף! קבל פלאפל על חשבון הבית״');
                else api.toast('עוד ' + ev.left + ' ארגזים');
              },
            });
          });
        return out;
      },
      navTarget() {
        if (!ev || ev.state === 'done') return null;
        if (ev.type === 'siddur' && ev.state === 'fetch') return { x: van.x - Math.sin(van.h) * 2.9, z: van.z - Math.cos(van.h) * 2.9 };
        if (ev.type === 'mezuzah' && ev.state === 'fetch') return { x: van.x - Math.sin(van.h) * 3.4, z: van.z - Math.cos(van.h) * 3.4 };
        if (ev.type === 'mezuzah' && ev.state === 'have') return ev.door;
        if (ev.type === 'tremp' && ev.state === 'ride') return ev.dest;
        if (ev.type === 'breslev') {
          if (ev.state === 'drive') return { x: ev.stops[ev.i].x, z: ev.stops[ev.i].z };
          if (ev.state === 'dance' || ev.state === 'end') return null;
          return { x: ev.bv.x, z: ev.bv.z };
        }
        if (ev.type === 'boxes' && ev.state === 'carry') return boxes.find((b) => b.visible) ? { x: boxes.find((b) => b.visible).position.x, z: boxes.find((b) => b.visible).position.z } : null;
        const n = NP[ev.npc];
        return { x: n.x, z: n.z };
      },
      mapDots(dot) {
        const t = this.navTarget();
        if (t) dot(t.x, t.z, 5, '#b07cff', '#13213f');
        if (ev && ev.type === 'breslev' && ev.state !== 'done') ev.stops.forEach((st, i) => i >= ev.i && dot(st.cx, st.cz, 4, '#ffd200', '#13213f'));
      },
      obstacles(out) {
        if (truck.group.visible) {
          const h = truck.group.rotation.y, fx = Math.sin(h), fz = Math.cos(h);
          for (const k of [-1.8, 0, 1.8]) out.push({ x: truck.group.position.x + fx * k, z: truck.group.position.z + fz * k, r: 1.2 });
        }
      },
      get done() {
        return doneCount;
      },
      get current() {
        return ev;
      },
      force(i) {
        clear();
        return STARTERS[i]();
      },
      // הניידת של ברסלב כמשימה (פרק 2): לא נעלמת עם הזמן, ומודיעה בסוף
      startBreslevQuest(cb) {
        clear();
        if (!startBreslev()) return false;
        ev.quest = true;
        ev.ttl = 1e9;
        onQuestDone = cb;
        A.chime && A.chime();
        return true;
      },
    };
  };
})();
