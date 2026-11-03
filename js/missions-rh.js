// פרק 3 — ראש העין: ״מזוזה לכל דירה״, ״סבא סעדיה מספר״, ״תהלוכת ל״ג בעומר״, ״עשרת הדברות בשבועות״
// ומשימה סודית: ״השומר במגדל אפק״. אותו ממשק כמו js/missions.js (המשחק בוחר לפי העיר)
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeMissionsRH = function (api) {
    const { scene, W, A, player, van, isTouch } = api;
    const ACT = isTouch ? 'כפתור הפעולה' : 'E';
    const S = () => api.S;
    const SP = W.spots || {};
    const lam = (c) => new T.MeshLambertMaterial({ color: c });
    const vanZone = (z, r) => z && Math.hypot(van.x - z.x, van.z - z.z) < (r || z.r || 8);
    const now = () => performance.now() / 1000;
    const SHALOM = 'ר׳ שלום';

    // ================= מצב =================
    const DEF = {
      rh1: () => ({ status: 'locked', timeLeft: 600, elapsed: 0, step: 'yahya', fixed: {}, joy: 0, comm: 0 }),
      rh2: () => ({ status: 'locked', timeLeft: 540, elapsed: 0, step: 'collect', picked: {}, inVan: 0, joy: 0, comm: 0 }),
      rh3: () => ({ status: 'locked', elapsed: 0, step: 'march', said: 0, sayT: 0, lags: 0, lagT: 0, joy: 0, comm: 0 }),
      rh4: () => ({ status: 'locked', timeLeft: 540, elapsed: 0, step: 'gather', joined: {}, read: 0, readT: 0, joy: 0, comm: 0 }),
      rhS: () => ({ status: 'locked', elapsed: 0, step: 'meet', story: 0, storyT: 0, joy: 0, comm: 0 }),
    };
    const QIDS = ['rh1', 'rh2', 'rh3', 'rh4'];
    if (!S().quests) S().quests = {};
    for (const id of [...QIDS, 'rhS']) S().quests[id] = Object.assign(DEF[id](), S().quests[id] || {});
    const q = (id) => S().quests[id];
    const done = (id) => q(id).status === 'complete';
    const activeId = () => [...QIDS, 'rhS'].find((id) => q(id).status === 'active') || null;
    const available = (id) => (id === 'rh1' ? true : done(QIDS[QIDS.indexOf(id) - 1]));
    const nextQuest = () => QIDS.find((id) => !done(id)) || null;
    const TITLES = {
      rh1: 'פרק 3 · משימה 1 · ״מזוזה לכל דירה״',
      rh2: 'פרק 3 · משימה 2 · ״סבא סעדיה מספר״',
      rh3: 'פרק 3 · משימה 3 · ״תהלוכת ל״ג בעומר״',
      rh4: 'פרק 3 · משימה 4 · ״עשרת הדברות בשבועות״',
      rhS: '✦ משימה סודית · ״השומר במגדל אפק״',
    };
    // כל הסיפורים בראש העין קורים באור יום: כשמתחילים משימה בשעה מאוחרת — עוברים לבוקר/צהריים
    function daylight(h) {
      if (S().time < 8 || S().time > 16) {
        S().time = h;
        setTimeout(() => api.toast('☀ יום בהיר בראש העין', 'gold'), 900);
      }
    }

    // ================= אנשים (קהל, ילדים, משפחות) =================
    const ADULTS = [
      { shirt: 0xffffff, pants: 0x2b2b33, skin: 0xb57a4e, kippah: 0x222222, beard: 0x2a2a2a },
      { shirt: 0x8fb3d9, pants: 0x2c3e50, skin: 0xd9a27a, kippah: 0x1b3a8a, hair: 0x333333 },
      { shirt: 0xe84393, pants: 0x2d3436, skin: 0xc98e62, hair: 0x2a1a10 },
      { shirt: 0xf3efe2, pants: 0x4b3b2b, skin: 0xe8c0a0, kippah: 0xffffff, hair: 0x6b4423 },
      { shirt: 0x27ae60, pants: 0x222222, skin: 0xa86b45, hair: 0x111111 },
      { shirt: 0xf39c12, pants: 0x34495e, skin: 0xf0c8a0, cap: 0xd62828 },
      { shirt: 0x9b59b6, pants: 0x2c2c2c, skin: 0xb57a4e, hair: 0x1a1a1a },
      { shirt: 0xffffff, jacket: 0x2b2b33, pants: 0x2b2b33, skin: 0xd9a27a, hat: 'fedora', beard: 0x777777 },
    ];
    const KIDS = [
      { shirt: 0xffd23f, pants: 0x1b3a8a, skin: 0xd9a27a, kippah: 0x1b3a8a, hair: 0x2a1a10 },
      { shirt: 0x3498db, pants: 0x2c3e50, skin: 0xb57a4e, kippah: 0xffffff, hair: 0x111111 },
      { shirt: 0xff7eb3, pants: 0x6b3e8a, skin: 0xf0c8a0, hair: 0x6b4423 },
      { shirt: 0x2ecc71, pants: 0x34495e, skin: 0xc98e62, kippah: 0x222222, hair: 0x1a1a1a },
      { shirt: 0xe74c3c, pants: 0x2b2b33, skin: 0xe8c0a0, hair: 0x8a6a3a },
      { shirt: 0xffffff, pants: 0x1a1a1a, skin: 0xa86b45, kippah: 0x1b3a8a, hair: 0x111111 },
    ];
    function person(look, kid) {
      const p = G.makePerson(look);
      if (kid) p.group.scale.setScalar(0.68);
      p.group.visible = false;
      p.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(p.group);
      return { p, x: 0, z: 0, ph: Math.random() * 6, kid: !!kid, on: false };
    }
    function setOn(m, on) {
      m.on = on;
      m.p.group.visible = on;
    }
    function place(m, x, z, rot) {
      m.x = x;
      m.z = z;
      m.p.group.position.set(x, 0, z);
      if (rot !== undefined) m.p.group.rotation.y = rot;
    }
    // הולך לעבר נקודה; מחזיר את המרחק שנשאר
    function walkTo(m, tx, tz, sp, dt, t) {
      const d = Math.hypot(tx - m.x, tz - m.z);
      const st = Math.min(d, sp * dt);
      if (d > 0.05) {
        m.x += ((tx - m.x) / d) * st;
        m.z += ((tz - m.z) / d) * st;
        m.p.group.rotation.y = Math.atan2(tx - m.x, tz - m.z);
      }
      const bob = G.animatePerson(m.p, t * (m.kid ? 9 : 7) + m.ph, d > 0.3 ? 1 : 0);
      m.p.group.position.set(m.x, bob, m.z);
      return d;
    }
    function idle(m, t, faceX, faceZ) {
      G.animatePerson(m.p, t * 2 + m.ph, 0);
      m.p.group.position.set(m.x, 0, m.z);
      if (faceX !== undefined) m.p.group.rotation.y = Math.atan2(faceX - m.x, faceZ - m.z);
    }
    function cheer(m, t, i) {
      const bob = G.animatePerson(m.p, t * 9 + m.ph, 1);
      m.p.group.position.set(m.x, bob + Math.abs(Math.sin(t * 7 + i)) * 0.25, m.z);
      m.p.armL.rotation.x = m.p.armR.rotation.x = -2.6 + Math.sin(t * 7 + i) * 0.3;
    }
    // שובל ההליכה של השליח — מי שהולך אחריו הולך בעקבותיו
    let trail = [];
    function resetTrail() {
      trail = [];
      const fx = Math.sin(player.rot || 0), fz = Math.cos(player.rot || 0);
      for (let k = 0; k < 60; k++) trail.push([player.x - fx * k * 0.8, player.z - fz * k * 0.8]);
    }
    function updateTrail() {
      const last = trail[0];
      if (!last || Math.hypot(player.x - last[0], player.z - last[1]) > 0.8) {
        trail.unshift([player.x, player.z]);
        if (trail.length > 260) trail.pop();
      }
    }
    function follow(list, dt, t, start, spacing, sp) {
      list.forEach((m, i) => {
        const idx = Math.min(trail.length - 2, start + Math.floor(i / 3) * spacing);
        const side = ((i % 3) - 1) * 0.9;
        const a = trail[idx], b = trail[Math.max(0, idx - 1)];
        const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
        walkTo(m, a[0] - (dz / L) * side, a[1] + (dx / L) * side, sp, dt, t);
      });
    }

    // ================= סימון מקום עצירה לטנק: עמוד אור + טבעת =================
    const beamMat = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const ringMat = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide });
    function makeBeam(r) {
      const g = new T.Group();
      const c = new T.Mesh(new T.CylinderGeometry(r, r, 8, 24, 1, true), beamMat);
      c.position.y = 4;
      const rg = new T.Mesh(new T.RingGeometry(r - 0.35, r, 40), ringMat);
      rg.rotation.x = -Math.PI / 2;
      rg.position.y = 0.22;
      g.add(c, rg);
      g.visible = false;
      scene.add(g);
      return { g, rg, at(z) { g.position.set(z.x, 0, z.z); g.visible = true; } };
    }
    const BEAM = makeBeam(4.2);

    // ================= משימה 1: מזוזה לכל דירה =================
    const BLD = SP.mezBldgs || [];
    const FAMILIES = ['משפחת עמר', 'משפחת לוי', 'משפחת חדד', 'משפחת שמעוני'];
    const yahya = api.addNPC({ id: 'rh_yahya', name: 'מורי יחיא', role: 'סופר סת״ם ותיק', x: (SP.yahya || player).x, z: (SP.yahya || player).z, rot: (SP.yahya || {}).rot || 0, look: { shirt: 0xf3efe2, jacket: 0x5d4a36, pants: 0x3b3b44, skin: 0xb57a4e, kippah: 0x1a1a1a, hair: 0xdddddd, beard: 0xf2f2f2 } });
    // מזוזות קבועות על הבניינים (נשארות אחרי המשימה)
    const mezMeshes = BLD.map((b) => {
      const m = new T.Mesh(new T.BoxGeometry(0.07, 0.34, 0.05), lam(0xd4a017));
      const r = b.door.rot, fx = Math.sin(r), fz = Math.cos(r), rx = Math.cos(r), rz = -Math.sin(r);
      m.position.set(b.door.x - fx * 1.0 + rx * 0.85, 1.55, b.door.z - fz * 1.0 + rz * 0.85);
      m.rotation.y = r;
      m.rotation.z = 0.35;
      m.visible = false;
      scene.add(m);
      return m;
    });
    // השכנים שמתאספים בכל בניין
    const neighbors = [];
    for (let i = 0; i < 7; i++) neighbors.push(person(i < 5 ? ADULTS[(i * 3) % ADULTS.length] : KIDS[i % KIDS.length], i >= 5));
    let gathered = -1, cheerT = 0;
    function nearestBldg() {
      const st = q('rh1');
      let best = -1, bd = 1e9;
      BLD.forEach((b, i) => {
        if (st.fixed[i]) return;
        const d = Math.hypot(b.door.x - player.x, b.door.z - player.z);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    }
    function gatherAt(i) {
      gathered = i;
      const b = BLD[i];
      neighbors.forEach((m, k) => {
        // באים מכמה כיוונים, מהבניין ומהרחוב
        const a = (k / neighbors.length) * Math.PI * 2;
        place(m, b.crowd.x + Math.cos(a) * 14, b.crowd.z + Math.sin(a) * 14);
        if (W.collide(m.x, m.z, 0.4).hit) place(m, b.door.x, b.door.z);
        setOn(m, true);
      });
      api.toast('השכנים של ' + FAMILIES[i] + ' יורדים לכניסה — קביעת מזוזה! 🏠', 'gold');
    }
    function crowdSpot(i, k) {
      const b = BLD[i], r = b.door.rot, fx = Math.sin(r), fz = Math.cos(r), rx = Math.cos(r), rz = -Math.sin(r);
      const row = Math.floor(k / 4), col = (k % 4) - 1.5;
      return [b.door.x + fx * (2.2 + row * 1.1) + rx * col * 0.95, b.door.z + fz * (2.2 + row * 1.1) + rz * col * 0.95];
    }
    function fixMezuzah(i) {
      const st = q('rh1');
      if (st.fixed[i]) return;
      st.fixed[i] = true;
      mezMeshes[i].visible = true;
      cheerT = 4.5;
      A.success();
      A.cheer && A.cheer();
      api.addJoy(8);
      api.addCommunity(1);
      const n = Object.keys(st.fixed).length;
      api.toast('״ברוך אתה ה׳... אשר קדשנו במצוותיו וצוונו לקבוע מזוזה״ — אמן! (' + n + '/' + BLD.length + ') +8 שמחה', 'gold');
      api.save();
      if (n >= BLD.length) setTimeout(() => completeRh1('done'), 3500);
    }
    function dlgFix(i) {
      const b = BLD[i];
      const where = b.street ? ' ברחוב ' + b.street : '';
      return {
        a: { s: 'narr', t: 'שכנים עומדים בחצי עיגול מול הכניסה' + where + '. ילדים מחזיקים טלפונים לצלם, מישהו הביא עוגה.', go: 'b' },
        b: { s: 'npc', t: ['רק עברנו לפה השבוע, הארגזים עוד בסלון... ומזוזה ראשונה — זה הדבר הראשון שאמא שלי שאלה.', 'אצלנו בבניין כולם חדשים. אף אחד לא מכיר אף אחד — עד עכשיו!', 'אבא שלי גר בשכונה הוותיקה. כשאספר לו שמורי יחיא כתב את המזוזה שלנו — הוא לא יאמין.', 'בניין חדש, מעלית חדשה, הכול חדש. טוב שיש משהו אחד שהוא ישן כמו העם שלנו.'][i % 4], go: 'c' },
        c: { s: 'npc', t: 'אז... איך עושים את זה? בצד ימין של הכניסה, נכון?', c: [{ t: 'בצד ימין, בשליש העליון, ונוטה פנימה. כולם אומרים אחריי: ״ברוך אתה...״', end: () => fixMezuzah(i) }] },
      };
    }
    function startRh1() {
      S().quests.rh1 = Object.assign(DEF.rh1(), { status: 'active' });
      daylight(10);
      A.success();
      api.toast('״מזוזה לכל דירה״ — קודם למורי יחיא בשכונת הרמב״ם, ואז לבניינים החדשים!', 'gold');
      api.save();
    }
    function dlgYahya() {
      const st = q('rh1');
      if (activeId() === 'rh1' && st.step === 'yahya')
        return {
          a: { s: 'narr', t: 'בחדר קטן בשכונת הרמב״ם, ליד שולחן עץ ישן, יושב מורי יחיא עם זכוכית מגדלת. ריח של קלף ודיו.', go: 'b' },
          b: { s: 'npc', t: 'אה, השליח של שלום! בוא, בוא. ארבע מזוזות — כתבתי אותן בעצמי, אות אחרי אות. אות אחת חסרה, והמזוזה פסולה.', go: 'c' },
          c: { s: 'npc', t: 'שישים שנה אני כותב. את המזוזה הראשונה שלי קבעתי בצריף במעברה, פה, כשראש העין הייתה אוהלים. עכשיו הן הולכות לבניינים של שמונה קומות...', c: [{ t: 'והן ישמרו על המשפחות החדשות, כמו ששמרו עליכם.', go: 'd' }] },
          d: { s: 'npc', t: '(עוטף בנייר בעדינות) ״ושמרו על הבית — בצאתך ובבואך״. לך, בני. ותגיד להם שמורי יחיא מברך.', end: () => { st.step = 'deliver'; A.load && A.load(); api.toast('קיבלת 4 מזוזות! ארבעה בניינים מסומנים במפה — סעו בטנק', 'gold'); api.save(); } },
        };
      if (done('rh1')) return { a: { s: 'npc', t: 'שמעתי שכל השכונה החדשה ירדה לכניסה! ככה זה מזוזה — היא מחברת.' } };
      return { a: { s: 'npc', t: '(מרים את הראש מהקלף) שלום, שלום. אני באמצע אות ״למד״ — הכי גבוהה מכולן.' } };
    }
    function completeRh1(reason) {
      const st = q('rh1');
      if (st.status !== 'active') return;
      st.status = 'complete';
      neighbors.forEach((m) => setOn(m, false));
      gathered = -1;
      const n = Object.keys(st.fixed).length;
      api.addJoy(8);
      api.save();
      api.results({
        stars: n >= 4 ? (st.timeLeft > 120 ? 3 : 2) : n >= 2 ? 2 : 1,
        title: reason === 'time' ? 'נגמר הזמן — אבל מזוזות כבר על הדלתות' : 'מזוזה לכל דירה!',
        note: '״וכתבתם על מזוזות ביתך ובשעריך״ — ובראש העין, הקלף של מורי יחיא מהשכונה הוותיקה שומר על הבניינים החדשים.',
        rows: [['בניינים', n + ' מתוך ' + BLD.length], ['זמן', api.fmtTime(600 - Math.max(0, st.timeLeft))], ['שמחה', '+' + st.joy], ['קשרים', '+' + st.comm]],
        changes: ['השכנים בבניינים החדשים מכירים זה את זה', 'סבא סעדיה רוצה לספר את הסיפור שלו...'],
      });
    }

    // ================= משימה 2: סבא סעדיה מספר =================
    const PICK = SP.saadiaPickups || [];
    const COUNTS = [5, 3, 2];
    const TOTAL = COUNTS.slice(0, PICK.length).reduce((a, b) => a + b, 0);
    const saadia = api.addNPC({ id: 'rh_saadia', name: 'סבא סעדיה', role: 'עלה ב״על כנפי נשרים״', x: (SP.saadia || player).x, z: (SP.saadia || player).z, rot: (SP.saadia || {}).rot || 0, look: { shirt: 0xf3efe2, jacket: 0x5d4a36, pants: 0x3b3b44, skin: 0xa86b45, kippah: 0x2b2b2b, hair: 0xeeeeee, beard: 0xf2f2f2 } });
    // ממתינים בכל נקודת איסוף
    const waiting = PICK.map((p, i) => {
      const list = [];
      for (let k = 0; k < COUNTS[i]; k++) list.push(person(k === COUNTS[i] - 1 && i === 2 ? KIDS[k] : ADULTS[(i * 3 + k) % ADULTS.length], false));
      return list;
    });
    const audience = waiting.flat();
    let boarding = -1;
    // מי שכבר נכנס לטנק — לא מופיע שוב בנקודת האיסוף
    const aboard = new Set();
    function waitPos(i, k) {
      const p = PICK[i], r = p.rot, rx = Math.cos(r), rz = -Math.sin(r);
      return [p.x + rx * (k - (COUNTS[i] - 1) / 2) * 1.0, p.z + rz * (k - (COUNTS[i] - 1) / 2) * 1.0];
    }
    function startRh2() {
      S().quests.rh2 = Object.assign(DEF.rh2(), { status: 'active' });
      aboard.clear();
      boarding = -1;
      daylight(13);
      A.success();
      api.toast('״סבא סעדיה מספר״ — אוספים ' + TOTAL + ' אנשים משלוש נקודות, לפני מנחה!', 'gold');
      api.save();
    }
    function boardAt(i) {
      const st = q('rh2');
      if (st.picked[i]) return;
      st.picked[i] = true;
      boarding = i;
      st.inVan += COUNTS[i];
      A.door && A.door('tank');
      api.toast('עולים לטנק: ' + COUNTS[i] + ' מ' + PICK[i].name + '. בטנק: ' + st.inVan + '/' + TOTAL, 'gold');
      if (st.inVan >= TOTAL) setTimeout(() => api.toast('כולם בטנק! לבית הכנסת ״שם ועבר״ — סבא סעדיה מחכה', 'gold'), 1600);
      api.save();
    }
    // הסיפור — עובדות אמיתיות על העלייה מתימן ועל ראשית ראש העין
    function storyNodes() {
      return {
        a: { s: 'narr', t: 'כולם יושבים על ספסלי העץ מול בית הכנסת. סבא סעדיה מסדר את הכיפה, מחייך, ומחכה שיהיה שקט.', go: 'b' },
        b: { s: 'npc', t: 'נולדתי בתימן. אלפיים שנה היו שם יהודים — ובכל הזמן הזה, בכל תפילה, ביקשנו לחזור לציון.', go: 'c' },
        c: { s: 'npc', t: 'השלטון שם לא נתן לנו לצאת. אז הלכנו ברגל — שבועות, דרך הרים ומדבר — עד עדן, בדרום.', go: 'd' },
        d: { s: 'npc', t: 'ליד עדן חיכה לנו מחנה ״חאשד״. הוא נבנה ל־500 איש. בשיא היו בו כמעט 13,000. חום, צפיפות, מחלות... והמון תקווה.', go: 'e' },
        e: { s: 'npc', t: 'ואז הגיעו המטוסים. 1949, 1950 — כמעט 50 אלף יהודים, בערך 380 טיסות. קראו לזה ״על כנפי נשרים״, ויש שאמרו ״מרבד הקסמים״.', go: 'f' },
        f: { s: 'npc', t: 'רובנו לא ראינו מטוס בחיים. אבל אבא שלי לא פחד. הוא אמר: ככה כתוב בתורה — ״ואשא אתכם על כנפי נשרים ואביא אתכם אלי״.', go: 'g' },
        g: { s: 'npc', t: 'והביאו אותנו לפה. מחנה צבאי בריטי ישן — צריפים, אוהלים, ״מעברה״. מזה צמחה ראש העין. אחד הצריפים הבריטיים עוד עומד, והיום הוא בית למורשת יהודי תימן.', go: 'h' },
        h: { s: 'npc', t: '(מסתכל על הצעירים) ואתם — אתם ההמשך. אז קומו, ילדים. הגיע זמן מנחה — בואו נתפלל, בניגון של תימן.', end: startMincha },
      };
    }
    function arriveSaadia() {
      const st = q('rh2');
      st.step = 'story';
      // יורדים מהטנק ומתיישבים בחצי עיגול מול סבא סעדיה
      const s = SP.saadia || saadia;
      const r = s.rot || 0;
      audience.forEach((m, k) => {
        const a = r + Math.PI + ((k / Math.max(1, audience.length - 1)) - 0.5) * 2.2;
        place(m, s.x + Math.sin(r) * 3.2 + Math.sin(a) * 2.6, s.z + Math.cos(r) * 3.2 + Math.cos(a) * 2.6);
        setOn(m, true);
      });
      A.door && A.door('tank');
      api.say({ id: 'rh_saadia', def: saadia.def, x: saadia.x, z: saadia.z, rot: saadia.rot, p: saadia.p, nodes: storyNodes() });
    }
    let minchaT = 0;
    function startMincha() {
      const st = q('rh2');
      st.step = 'mincha';
      minchaT = 0;
      if (W.placeLights.shemVaever) W.placeLights.shemVaever.visible = true;
      api.toast('🙏 ״אשרי יושבי ביתך...״ — מנחה בבית הכנסת ״שם ועבר״, בניגון תימני', 'gold');
    }
    function completeRh2(reason) {
      const st = q('rh2');
      if (st.status !== 'active') return;
      st.status = 'complete';
      audience.forEach((m) => setOn(m, false));
      api.addJoy(12);
      api.addCommunity(3);
      api.save();
      const brought = reason === 'time' ? st.inVan : TOTAL;
      api.results({
        stars: reason === 'time' ? 1 : st.timeLeft > 150 ? 3 : 2,
        title: reason === 'time' ? 'מנחה התחילה — עם מי שהספיק להגיע' : 'סבא סעדיה סיפר',
        note: '״ואשא אתכם על כנפי נשרים ואביא אתכם אלי״ (שמות יט, ד). כמעט 50 אלף יהודי תימן עלו בשנים 1949–1950, ורבים מהם בנו את ראש העין.',
        rows: [['הגיעו לשמוע', brought + ' מתוך ' + TOTAL], ['זמן', api.fmtTime(540 - Math.max(0, st.timeLeft))]],
        changes: ['הצעירים מהשכונות החדשות קובעים לבוא שוב לסבא סעדיה', 'ל״ג בעומר מתקרב — ר׳ שלום מתכנן תהלוכה...'],
      }, 600);
    }

    // ================= משימה 3: תהלוכת ל״ג בעומר =================
    const PESUKIM = [
      'תורה צוה לנו משה, מורשה קהלת יעקב',
      'שמע ישראל, ה׳ אלוקינו, ה׳ אחד',
      'בכל דור ודור חייב אדם לראות את עצמו כאילו הוא יצא ממצרים',
      'כל ישראל יש להם חלק לעולם הבא',
      'כי קרוב אליך הדבר מאד, בפיך ובלבבך לעשותו',
      'והנה ה׳ נצב עליו, ומלא כל הארץ כבודו, ומביט עליו',
      'בראשית ברא אלוקים את השמים ואת הארץ',
      'ושננתם לבניך ודברת בם',
      'יגעת ומצאת — תאמין',
      'ואהבת לרעך כמוך — רבי עקיבא אומר: זה כלל גדול בתורה',
      'וזה כל האדם ותכלית בריאתו: לעשות לו יתברך דירה בתחתונים',
      'ישמח ישראל בעושיו',
    ];
    const marchers = [];
    for (let i = 0; i < 4; i++) marchers.push(person(ADULTS[(i * 2 + 1) % ADULTS.length], false));
    for (let i = 0; i < 10; i++) marchers.push(person(KIDS[i % KIDS.length], true));
    // דגלים בידי הילדים
    marchers.forEach((m, i) => {
      if (!m.kid) return;
      const f = new T.Group();
      const pole = new T.Mesh(new T.BoxGeometry(0.03, 0.9, 0.03), lam(0x8b5a2b));
      pole.position.y = 0.45;
      const cloth = new T.Mesh(new T.PlaneGeometry(0.45, 0.3), new T.MeshLambertMaterial({ color: [0x1b6fd8, 0xffffff, 0xffd23f][i % 3], side: T.DoubleSide }));
      cloth.position.set(0.23, 0.78, 0);
      f.add(pole, cloth);
      f.position.set(0, -0.7, 0.06);
      m.p.armR.add(f);
    });
    // המדורה בפארק לב העיר: ערימת עצים, ובשמחה — להבות
    const fireAt = SP.bonfire || { x: player.x + 40, z: player.z };
    const bonfire = new T.Group();
    for (let k = 0; k < 6; k++) {
      const log = new T.Mesh(new T.CylinderGeometry(0.12, 0.14, 2.2, 6), lam(0x6b4423));
      log.rotation.z = 0.9;
      log.rotation.y = (k / 6) * Math.PI;
      log.position.y = 0.55;
      bonfire.add(log);
    }
    const flames = new T.Group();
    const flameCols = [0xff5a1f, 0xff9f1c, 0xffd23f];
    for (let k = 0; k < 5; k++) {
      const f = new T.Mesh(new T.ConeGeometry(0.45 - k * 0.05, 1.6 + (k % 2) * 0.6, 7), new T.MeshBasicMaterial({ color: flameCols[k % 3], transparent: true, opacity: 0.85 }));
      f.position.set(Math.cos(k * 1.3) * 0.25, 1.2, Math.sin(k * 1.3) * 0.25);
      flames.add(f);
    }
    const fireGlow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex('255,150,60'), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    fireGlow.scale.set(6, 6, 1);
    fireGlow.position.y = 1.4;
    flames.add(fireGlow);
    flames.visible = false;
    bonfire.add(flames);
    bonfire.position.set(fireAt.x, 0, fireAt.z);
    scene.add(bonfire);
    let fireT = 0;
    const headDist = () => (marchers[0] ? Math.hypot(marchers[0].x - player.x, marchers[0].z - player.z) : 0);
    let lastMoveT = 0;
    function placeMarchers() {
      resetTrail();
      marchers.forEach((m, i) => {
        const a = trail[Math.min(trail.length - 1, 4 + Math.floor(i / 3) * 3)];
        place(m, a[0] + ((i % 3) - 1) * 0.9, a[1]);
        setOn(m, true);
      });
    }
    function startRh3() {
      S().quests.rh3 = Object.assign(DEF.rh3(), { status: 'active' });
      daylight(16);
      placeMarchers();
      A.success();
      api.setRadio(1);
      api.toast('🔥 תהלוכת ל״ג בעומר! הובילו את הילדים והמשפחות ברגל למדורה בפארק לב העיר — ואומרים בדרך את 12 הפסוקים', 'gold');
      api.save();
    }
    function sayPasuk(st) {
      const i = st.said++;
      api.toast('🗣 פסוק ' + (i + 1) + ': ״' + PESUKIM[i] + '״', 'gold');
      A.soft && A.soft();
    }
    function rh3Update(dt, t) {
      const st = q('rh3');
      updateTrail();
      if (player.spd > 0.5) lastMoveT = t;
      if (st.step === 'march') {
        follow(marchers, dt, t, 5, 3, 4.2);
        const far = headDist() > 22;
        if (far) {
          st.lagT += dt;
          if (st.lagT > 1.5 && !st.lagWarn) {
            st.lagWarn = true;
            st.lags++;
            api.toast('🐢 הילדים נשארו מאחור! חכו להם', '');
          }
        } else if (st.lagT > 0) {
          st.lagT = 0;
          st.lagWarn = false;
        }
        // פסוק כל 9 שניות של הליכה ביחד (בערך שתי דקות עד המדורה)
        if (!far && t - lastMoveT < 1.5 && st.said < PESUKIM.length) {
          st.sayT += dt;
          if (st.sayT > 9) {
            st.sayT = 0;
            sayPasuk(st);
          }
        }
        if (Math.hypot(player.x - fireAt.x, player.z - fireAt.z) < 12 && headDist() < 18) {
          st.step = 'fire';
          fireT = 0;
          flames.visible = true;
          A.cheer && A.cheer();
          api.toast('🔥 הגעתם למדורה! מדליקים — ' + (st.said < PESUKIM.length ? 'ומסיימים את הפסוקים מסביב לאש' : 'וכל 12 הפסוקים נאמרו בדרך!'), 'gold');
        }
      } else if (st.step === 'fire') {
        fireT += dt;
        // הפסוקים שנשארו — מסביב למדורה, אחד אחרי השני
        if (st.said < PESUKIM.length) {
          st.sayT += dt;
          if (st.sayT > 1.8) {
            st.sayT = 0;
            sayPasuk(st);
          }
        } else if (!st.doneT) st.doneT = fireT;
        marchers.forEach((m, i) => {
          const a = (i / marchers.length) * Math.PI * 2 + fireT * 0.9;
          const R = m.kid ? 3.4 : 4.6;
          walkTo(m, fireAt.x + Math.cos(a) * R, fireAt.z + Math.sin(a) * R, 5, dt, t);
          if (st.said >= PESUKIM.length) cheer(m, t, i);
        });
        if (st.doneT && fireT - st.doneT > 7) completeRh3();
      }
    }
    function completeRh3() {
      const st = q('rh3');
      if (st.status !== 'active') return;
      st.status = 'complete';
      if (S().radio === 1) api.setRadio(0);
      marchers.forEach((m) => setOn(m, false));
      api.addJoy(15);
      api.addCommunity(3);
      api.save();
      api.results({
        stars: st.lags === 0 ? 3 : st.lags <= 2 ? 2 : 1,
        title: 'תהלוכת ל״ג בעומר!',
        note: 'את 12 הפסוקים ביקש הרבי שילדים ידעו בעל פה — וחצי מהם הוא הציג בתהלוכת ל״ג בעומר.',
        rows: [['פסוקים', PESUKIM.length + '/12'], ['פעמים שהילדים נשארו מאחור', String(st.lags)], ['זמן', api.fmtTime(st.elapsed)]],
        changes: ['המדורה בפארק לב העיר דולקת', 'שבועות מתקרב — ר׳ שלום רוצה שכולם ישמעו את עשרת הדברות'],
      }, 600);
    }

    // ================= משימה 4: עשרת הדברות בשבועות (ברגל — חג) =================
    const HOMES = SP.shavuotHomes || [];
    const FAM = [
      { id: 'rh_sharabi', name: 'משפחת שרעבי', size: 3, look: { shirt: 0xffffff, pants: 0x1a1a1a, skin: 0xb57a4e, kippah: 0xffffff, beard: 0x2a2a2a } },
      { id: 'rh_tzadok', name: 'משפחת צדוק', size: 4, look: { shirt: 0xffffff, pants: 0x2b2b33, skin: 0xc98e62, kippah: 0x1b3a8a, hair: 0x1a1a1a } },
      { id: 'rh_levi', name: 'משפחת לוי', size: 2, look: { shirt: 0xffffff, pants: 0x34495e, skin: 0xe8c0a0, kippah: 0x222222, hair: 0x6b4423 } },
      { id: 'rh_gamliel', name: 'משפחת גמליאל', size: 3, look: { shirt: 0xffffff, pants: 0x2b2b2b, skin: 0xa86b45, kippah: 0xffffff, hair: 0x111111, beard: 0x333333 } },
    ].slice(0, HOMES.length);
    FAM.forEach((f, i) => {
      const h = HOMES[i];
      f.n = api.addNPC({ id: f.id, name: f.name, role: 'חג שמח!', x: h.x, z: h.z, rot: h.rot, look: f.look });
      f.n.hidden = true;
      // בני המשפחה (בבגדים לבנים לחג)
      f.members = [];
      for (let k = 0; k < f.size - 1; k++) f.members.push(person(Object.assign({}, KIDS[(i + k) % KIDS.length], { shirt: 0xffffff }), k > 0 || i % 2 === 0));
      f.walker = person(f.look, false);
    });
    const followers = () => FAM.filter((f, i) => q('rh4').joined[i]).flatMap((f) => [f.walker, ...f.members]);
    const DIBROT = ['אנכי ה׳ אלוקיך', 'לא יהיה לך אלוהים אחרים על פני', 'לא תשא את שם ה׳ אלוקיך לשוא', 'זכור את יום השבת לקדשו', 'כבד את אביך ואת אמך', 'לא תרצח', 'לא תנאף', 'לא תגנוב', 'לא תענה ברעך עד שקר', 'לא תחמוד'];
    function startRh4() {
      S().quests.rh4 = Object.assign(DEF.rh4(), { status: 'active' });
      daylight(9.5);
      resetTrail();
      A.success();
      api.toast('חג שבועות שמח! בלי רכב היום — אוספים ברגל ארבע משפחות לבית הכנסת ״אמת ושלום״ 🌾', 'gold');
      api.save();
    }
    function joinFamily(i) {
      const st = q('rh4');
      st.joined[i] = true;
      const f = FAM[i];
      f.n.hidden = true;
      place(f.walker, f.n.x, f.n.z, f.n.rot);
      setOn(f.walker, true);
      f.members.forEach((m, k) => {
        place(m, f.n.x + (k + 1) * 0.7, f.n.z);
        setOn(m, true);
      });
      api.addJoy(5);
      api.addCommunity(1);
      A.success();
      const n = Object.keys(st.joined).length;
      api.toast(f.name + ' מצטרפת! (' + n + '/' + FAM.length + ')' + (n >= FAM.length ? ' — כולם איתך, לבית הכנסת!' : ''), 'gold');
      api.save();
    }
    function dlgFamily(i) {
      const f = FAM[i];
      const lines = [
        ['חג שמח! ...עשרת הדברות? אבא שלי היה לוקח אותי כל שנה. השנה חשבתי לוותר, הילדים קטנים.', 'דווקא בגלל הילדים! הרבי ביקש שגם התינוקות ישמעו.'],
        ['חג שמח, שליח! אנחנו גרים פה רק חצי שנה, לא יודעים אפילו איפה בית הכנסת.', 'בדיוק בשביל זה באתי — הולכים ביחד.'],
        ['חג שמח! עשינו לילה של לימוד, אני קצת עייף...', 'עשרה פסוקים, עשר דקות — ואתה עומד שוב בהר סיני.'],
        ['חג שמח! סבתא אמרה שבתימן כל הקהילה עמדה יחד בעשרת הדברות.', 'אז גם פה — כל הקהילה, יחד.'],
      ][i % 4];
      return {
        a: { s: 'npc', t: lines[0], c: [{ t: lines[1], go: 'b' }] },
        b: { s: 'npc', t: '(קורא לתוך הבית) ילדים! נעליים! הולכים לשמוע עשרת הדברות!', end: () => joinFamily(i) },
      };
    }
    function shulDoor() {
      return SP.emetDoor || player;
    }
    function startReading() {
      const st = q('rh4');
      st.step = 'reading';
      st.readT = 0;
      if (W.placeLights.emetShul) W.placeLights.emetShul.visible = true;
      const d = shulDoor(), r = d.rot || 0, fx = Math.sin(r), fz = Math.cos(r), rx = Math.cos(r), rz = -Math.sin(r);
      followers().forEach((m, k) => {
        const row = Math.floor(k / 5), col = (k % 5) - 2;
        place(m, d.x + fx * (2.5 + row * 1.2) + rx * col * 0.9, d.z + fz * (2.5 + row * 1.2) + rz * col * 0.9);
      });
      api.toast('📜 כולם עומדים. קריאת עשרת הדברות — כמו במעמד הר סיני', 'gold');
    }
    function rh4Update(dt, t) {
      const st = q('rh4');
      updateTrail();
      if (st.step === 'gather') {
        follow(followers(), dt, t, 3, 2, 6.5);
        // כל המשפחות איתך ומגיעים לדלת — הקריאה מתחילה (עם פחות משפחות: בוחרים בדלת)
        const d = shulDoor();
        if (Object.keys(st.joined).length >= FAM.length && Math.hypot(player.x - d.x, player.z - d.z) < 6) startReading();
      } else if (st.step === 'reading') {
        st.readT += dt;
        const d = shulDoor();
        followers().forEach((m) => idle(m, t, d.x, d.z));
        if (st.read < DIBROT.length && st.readT > 2.6) {
          st.readT = 0;
          api.toast('📜 ' + (st.read + 1) + '. ״' + DIBROT[st.read] + '״', 'gold');
          st.read++;
          A.soft && A.soft();
        }
        if (st.read >= DIBROT.length && st.readT > 3) completeRh4('done');
      }
    }
    function completeRh4(reason) {
      const st = q('rh4');
      if (st.status !== 'active') return;
      st.status = 'complete';
      followers().forEach((m) => setOn(m, false));
      const n = Object.keys(st.joined).length;
      api.addJoy(15);
      api.addCommunity(3);
      api.save();
      api.results({
        stars: reason === 'time' ? 1 : n >= FAM.length ? 3 : n >= 2 ? 2 : 1,
        title: reason === 'time' ? 'הקריאה התחילה — עם מי שהגיע' : 'עשרת הדברות בשבועות!',
        note: 'פרק 3 הושלם. ראש העין — עיר אחת: הוותיקים מהמעברה והמשפחות מהשכונות החדשות עמדו יחד, כמו בהר סיני — ״כאיש אחד בלב אחד״.',
        rows: [['משפחות שהגיעו', n + ' מתוך ' + FAM.length], ['רכב', 'אף אחד — חג!'], ['זמן', api.fmtTime(540 - Math.max(0, st.timeLeft))]],
        changes: ['בבית הכנסת ״אמת ושלום״ מתפללים גם משפחות מהשכונות החדשות', 'ר׳ שלום מספר על מישהו שיושב לבד ליד מגדל אפק...'],
      }, 600);
    }

    // ================= משימה סודית: השומר במגדל אפק =================
    const AF = SP.afek || { x: player.x + 30, z: player.z + 30, rot: 0 };
    const avraham = api.addNPC({ id: 'rh_avraham', name: 'אברהם', role: 'יושב ליד מגדל אפק', x: AF.x, z: AF.z, rot: AF.rot || 0, look: { shirt: 0xd9cfb8, jacket: 0x4b5a3a, pants: 0x3b3b44, skin: 0xa86b45, cap: 0x4b5a3a, hair: 0xdddddd, beard: 0xe0e0e0 } });
    avraham.hidden = true;
    const AV_STORIES = [
      'הגענו מעדן בחורף. בצריפים במעברה הגשם נכנס מכל חור. סעדיה ואני ישנו באותו צריף.',
      'היינו הולכים יחד לתלמוד תורה. הוא תמיד ידע את הפסוקים בעל פה, ואני תמיד העתקתי ממנו.',
      'אחר כך התחתנו, עברנו, החיים... חמישים שנה לא דיברנו. בגלל שטות. אני אפילו לא זוכר על מה.',
      'כל יום אני בא למגדל. מפה רואים את כל העיר — את המקום שבו עמדה המעברה. מחפש משהו שאיבדתי.',
    ];
    function dlgAvraham() {
      const st = q('rhS');
      if (done('rhS')) return { a: { s: 'npc', t: 'אני כבר לא יושב פה לבד. כל ערב אני וסעדיה — שש־בש ותהילים.' } };
      if (st.step !== 'meet') return { a: { s: 'npc', t: 'אני מוכן. רק... תיסע לאט. הלב שלי כבר נוסע מהר.' } };
      return {
        a: { s: 'narr', t: 'ליד חומות מגדל אפק, על ספסל אבן, יושב איש מבוגר עם כובע בד. הוא מסתכל על העיר שמתחת.', c: [{ t: 'לשבת לידו ולהסתכל ביחד', go: 'b' }, { t: 'שלום! אתה בסדר?', go: 'b' }] },
        b: { s: 'npc', t: 'מפה רואים הכול. שם, איפה שהבניינים הגבוהים — שם היו האוהלים שלנו. אני אברהם. הייתי בן שבע כשהמטוס נחת.', c: [{ t: 'שמעתי עליך. יש מישהו בשכונת הרמב״ם שמספר על אותו מטוס...', go: 'c' }] },
        c: { s: 'npc', t: '(שותק) ...סעדיה. אתה מכיר את סעדיה. חמישים שנה. הוא בטח לא רוצה לראות אותי.', c: [{ t: 'הוא מספר עליך כל פעם. ״אברהם שהעתיק ממני את הפסוקים״.', go: 'd' }] },
        d: { s: 'npc', t: '(צוחק ובוכה בבת אחת) הוא זוכר... טוב. קח אותי אליו. אבל אתה מקשיב לסיפורים של זקן בדרך.', end: () => { st.step = 'ride'; api.toast('הביאו את הטנק לאברהם ואספו אותו', 'gold'); api.save(); } },
      };
    }
    function startSecretRH() {
      S().quests.rhS = Object.assign(DEF.rhS(), { status: 'active' });
      daylight(15);
      avraham.hidden = false;
      api.toast('״השומר במגדל אפק״ — בלי שעון. רק להקשיב.', 'gold');
      api.save();
    }
    function arriveSecretRH() {
      const st = q('rhS');
      st.step = 'done';
      const s = SP.saadia || saadia;
      avraham.x = avraham.def.x = s.x + Math.sin((s.rot || 0) + 1.2) * 1.6;
      avraham.z = avraham.def.z = s.z + Math.cos((s.rot || 0) + 1.2) * 1.6;
      avraham.rot = avraham.rotT = Math.atan2(saadia.x - avraham.x, saadia.z - avraham.z);
      avraham.hidden = false;
      api.say({
        id: 'rh_saadia', def: saadia.def, x: saadia.x, z: saadia.z, rot: saadia.rot, p: saadia.p,
        nodes: {
          a: { s: 'narr', t: 'אברהם יורד מהטנק לאט. סבא סעדיה מרים את הראש מהספר — ומפסיק לזוז.', go: 'b' },
          b: { s: 'npc', t: '...אברהם? אברהם מהצריף?', go: 'c' },
          c: { s: 'narr', t: 'שני זקנים עומדים זה מול זה. אחד מהם אומר בשקט: ״ואשא אתכם על כנפי נשרים״. השני ממשיך: ״ואביא אתכם אלי״.', go: 'd' },
          d: { s: 'npc', t: '(מחבק אותו) חמישים שנה, אחי. חמישים שנה. ...תיכנס. יש מנחה, ויש לך מקום לידי. תמיד היה.', end: completeSecretRH },
        },
      });
    }
    function completeSecretRH() {
      const st = q('rhS');
      st.status = 'complete';
      api.addJoy(20);
      api.addCommunity(3);
      api.save();
      api.results({
        title: 'השומר במגדל אפק',
        note: '״הנה מה טוב ומה נעים שבת אחים גם יחד״ — לפעמים שליחות היא פשוט להחזיר שני חברים לאותו ספסל.',
        rows: [['שעון', 'לא היה'], ['אברהם וסעדיה', 'שוב ביחד']],
        changes: ['אברהם מתפלל מעכשיו בבית הכנסת ״שם ועבר״', 'במגדל אפק כבר לא יושבים לבד'],
      }, 1500);
    }

    // ================= ר׳ שלום: הצעות, רמזים וטלפון =================
    const OFFER = {
      rh1: () => ({
        a: { s: 'npc', t: (S().flags.rhMet ? '' : 'ברוך הבא לראש העין! אני שלום, השליח פה. ר׳ מנחם סיפר עליך נפלאות. ') + 'תראה: במזרח העיר נבנות שכונות חדשות — כל שבוע עוד משפחות נכנסות. ובמערב, השכונות הוותיקות של העולים מתימן.', go: 'b', fx: () => (S().flags.rhMet = true) },
        b: { s: 'npc', t: 'מורי יחיא, הסופר הוותיק מהרמב״ם, כתב ארבע מזוזות לארבעה בניינים חדשים. תאסוף אותן ממנו ותקבע — בכל בניין השכנים יורדים לכניסה. עשר דקות, לפני שהמובילים מסיימים.', c: [{ t: 'יוצא למורי יחיא!', fx: startRh1 }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'מורי יחיא לא הולך לשום מקום — הוא שם שישים שנה.' },
      }),
      rh2: () => ({
        a: { s: 'npc', t: 'סבא סעדיה, ליד בית הכנסת ״שם ועבר״, עלה ב״על כנפי נשרים״. יש לו סיפור שכל ילד בעיר צריך לשמוע — אבל הצעירים מהשכונות החדשות לא מכירים אותו בכלל.', go: 'b' },
        b: { s: 'npc', t: 'שלוש נקודות איסוף, ' + TOTAL + ' אנשים — כולם בטנק. תביא אותם אליו לפני מנחה.', c: [{ t: 'יוצא לאסוף!', fx: startRh2 }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'סעדיה מחכה על הספסל. הוא תמיד מחכה.' },
      }),
      rh3: () => ({
        a: { s: 'npc', t: 'ל״ג בעומר! הילדים והמשפחות כבר מתאספים פה, מול בית חב״ד — עם דגלים.', go: 'b' },
        b: { s: 'npc', t: 'אתה מוביל את התהלוכה, ברגל, עד המדורה בפארק לב העיר — בערך שתי דקות הליכה. ובדרך אומרים יחד את 12 הפסוקים. לאט, שהקטנים יעמדו בקצב!', c: [{ t: 'יוצאים בשמחה!', fx: startRh3 }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'הילדים מחכים עם הדגלים.' },
      }),
      rh4: () => ({
        a: { s: 'npc', t: 'חג שמח! שבועות — היום שבו קיבלנו את התורה. הרבי ביקש שכל יהודי, גם התינוקות, ישמע את עשרת הדברות בבית הכנסת.', go: 'b' },
        b: { s: 'npc', t: 'היום חג — בלי רכב. ארבע משפחות גרות קרוב לבית הכנסת ״אמת ושלום״. תעבור אצלן ברגל ותביא אותן. הקריאה מתחילה בעוד תשע דקות.', c: [{ t: 'הולך לאסוף!', fx: startRh4 }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'חג שמח! המשפחות מחכות.' },
      }),
    };
    const SECRET_OFFER = () => ({
      a: { s: 'npc', t: 'שליח, יש עוד משהו. כל אחר צהריים, ליד מגדל אפק, יושב איש מבוגר — אברהם. גם הוא מהמעברה, כמו סבא סעדיה.', go: 'b' },
      b: { s: 'npc', t: 'אין פה שעון ואין פרס. רק... תעלה אליו? סימנתי לך במפה.', c: [{ t: 'אני בדרך.', fx: startSecretRH }, { t: 'אחר כך', fx: () => (q('rhS').status = 'idle') }] },
    });
    const HINT = {
      rh1: () => {
        const st = q('rh1');
        if (st.step === 'yahya') return 'סעו למורי יחיא בשכונת הרמב״ם (הקו במפה) ודברו איתו.';
        if (gathered >= 0 && !st.fixed[gathered]) return 'השכנים בכניסה! גשו לדלת ולחצו ' + ACT + ' כדי לקבוע את המזוזה.';
        return 'סעו לבניין הבא (הקו במפה). כשמגיעים — השכנים יורדים לכניסה.';
      },
      rh2: () => {
        const st = q('rh2');
        if (st.step === 'collect') return st.inVan >= TOTAL ? 'כולם בטנק! סעו לבית הכנסת ״שם ועבר״ ועצרו בטבעת.' : 'סעו לנקודת האיסוף הבאה ועצרו בטבעת. בטנק: ' + st.inVan + '/' + TOTAL + '.';
        if (st.step === 'story') return 'מקשיבים לסבא סעדיה...';
        return 'מנחה. 🙏';
      },
      rh3: () => (q('rh3').step === 'march' ? 'הובילו את התהלוכה ברגל למדורה בפארק לב העיר. כשהולכים ביחד — אומרים את הפסוקים.' : '🔥 מסביב למדורה!'),
      rh4: () => {
        const st = q('rh4');
        const n = Object.keys(st.joined).length;
        if (st.step === 'reading') return 'עשרת הדברות.';
        if (n < FAM.length) return 'גשו ברגל למשפחה הבאה (הקו במפה). ' + (n ? 'או — לבית הכנסת ״אמת ושלום״ עם מי שכבר איתך.' : '');
        return 'כולם איתך! לבית הכנסת ״אמת ושלום״.';
      },
      rhS: () => ({ meet: 'אברהם יושב ליד מגדל אפק. בלי לחץ — פשוט לשבת לידו.', ride: 'הביאו את הטנק לאברהם ואספו אותו.', drive: 'סעו לאט לבית הכנסת ״שם ועבר״, ותקשיבו לסיפורים.', done: '' }[q('rhS').step]),
    };
    function mosheDialog() {
      const a = activeId();
      if (!a && done('rh4') && (q('rhS').status === 'idle' || q('rhS').status === 'locked')) return SECRET_OFFER();
      if (a) return { a: { s: 'npc', t: HINT[a]() + (q(a).timeLeft !== undefined ? ' נשארו ' + api.fmtTime(q(a).timeLeft) + '.' : '') } };
      const nx = nextQuest();
      if (nx && available(nx)) return OFFER[nx]();
      return { a: { s: 'npc', t: 'שליח, ראית? מזוזות בבניינים החדשים, צעירים אצל סבא סעדיה, תהלוכה, ושבועות של כל העיר' + (done('rhS') ? ' — ואפילו אברהם וסעדיה שוב ביחד' : '') + '. ראש העין היא עיר אחת. הדרך לפתח תקווה מסומנת במפה — ותבוא לבקר!', c: [{ t: 'עוד קצת פה' }, { t: '🚐 נוסעים לפתח תקווה', fx: () => api.goCity('pt') }] } };
    }
    function mosheIcon() {
      if (activeId()) return 'hint';
      const nx = nextQuest();
      if (!nx && q('rhS').status !== 'complete') return 'mission';
      return nx && available(nx) ? 'mission' : null;
    }

    // ================= אינטראקציות =================
    function interactables() {
      const a = activeId(), out = [];
      if (a === 'rh1' && q('rh1').step === 'deliver' && gathered >= 0 && !q('rh1').fixed[gathered] && !api.drv) {
        const b = BLD[gathered];
        out.push({ x: b.door.x, z: b.door.z, r: 2.6, label: 'לקבוע מזוזה בכניסה לבניין', run: () => api.say({ id: 'rh_res', def: { name: FAMILIES[gathered], role: 'דיירים חדשים' }, x: b.door.x, z: b.door.z, rot: b.door.rot, nodes: dlgFix(gathered) }) });
      }
      if (a === 'rh4' && q('rh4').step === 'gather') {
        const n = Object.keys(q('rh4').joined).length, d = shulDoor();
        if (n > 0 && n < FAM.length) out.push({ x: d.x, z: d.z, r: 4, label: 'להתחיל את הקריאה עם ' + n + ' משפחות (או לאסוף עוד)', run: startReading });
      }
      return out;
    }
    function vanAction() {
      const a = activeId();
      if (a === 'rh2') {
        const st = q('rh2');
        if (st.step === 'collect') {
          for (let i = 0; i < PICK.length; i++) if (!st.picked[i] && vanZone(PICK[i].road, 11)) return { label: 'לאסוף ' + COUNTS[i] + ' אנשים מ' + PICK[i].name, run: () => boardAt(i) };
          if (st.inVan >= TOTAL && vanZone(SP.zoneSaadia, 11)) return { label: 'להוריד את כולם ליד סבא סעדיה', run: arriveSaadia };
        }
      }
      if (a === 'rhS') {
        const st = q('rhS');
        if (st.step === 'ride' && Math.hypot(avraham.x - van.x, avraham.z - van.z) < 12)
          return { label: 'לאסוף את אברהם', run: () => { st.step = 'drive'; st.storyT = 10; A.door && A.door('tank'); api.toast('אברהם עלה לטנק. נוסעים לאט לבית הכנסת ״שם ועבר״', 'gold'); api.save(); }, x: avraham.x, z: avraham.z };
        if (st.step === 'drive' && vanZone(SP.zoneSaadia, 11)) return { label: 'להוריד את אברהם ליד סבא סעדיה', run: arriveSecretRH };
      }
      return null;
    }
    function npcDialog(n) {
      if (n.id === 'rh_yahya') return dlgYahya();
      if (n.id === 'rh_saadia') {
        if (activeId() === 'rh2') return { a: { s: 'npc', t: 'אני מחכה, בני. ' + TOTAL + ' נשמות — שיהיה מניין, ועוד קצת.' } };
        if (done('rh2')) return { a: { s: 'npc', t: 'הצעירים באו שוב אתמול! אחד מהם שאל אותי איך אומרים ״שלום״ בתימנית. (צוחק) ״סלאם״, אמרתי לו — כמו בכל מקום.' } };
        return { a: { s: 'npc', t: 'שלום, שלום. שב רגע — אתה רוצה לשמוע סיפור? ...אה, אין לך זמן. אף אחד אין לו זמן היום.' } };
      }
      if (n.id === 'rh_avraham') return dlgAvraham();
      const fi = FAM.findIndex((f) => f.id === n.id);
      if (fi >= 0) {
        if (activeId() === 'rh4' && !q('rh4').joined[fi]) return dlgFamily(fi);
        return { a: { s: 'npc', t: 'חג שמח!' } };
      }
      return null;
    }
    function iconFor(n) {
      const a = activeId();
      if (n.id === 'rh_yahya' && a === 'rh1' && q('rh1').step === 'yahya') return 'alert';
      if (n.id === 'rh_avraham' && a === 'rhS' && q('rhS').step === 'meet') return 'star';
      if (a === 'rh4' && FAM.some((f, i) => f.id === n.id && !q('rh4').joined[i])) return 'alert';
      return null;
    }
    function nearestOf(list) {
      let best = null, bd = 1e9;
      for (const p of list) {
        const d = Math.hypot(p.x - player.x, p.z - player.z);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      return best;
    }
    function navTarget() {
      const a = activeId();
      if (a === 'rh1') {
        const st = q('rh1');
        if (st.step === 'yahya') return yahya;
        const i = gathered >= 0 && !st.fixed[gathered] ? gathered : nearestBldg();
        return i >= 0 ? (gathered === i && !api.drv ? BLD[i].door : BLD[i].zone) : null;
      }
      if (a === 'rh2') {
        const st = q('rh2');
        if (st.step !== 'collect') return null;
        if (st.inVan >= TOTAL) return SP.zoneSaadia;
        return nearestOf(PICK.filter((p, i) => !st.picked[i]).map((p) => p.road));
      }
      if (a === 'rh3') return q('rh3').step === 'march' ? fireAt : null;
      if (a === 'rh4') {
        const st = q('rh4');
        if (st.step !== 'gather') return null;
        const left = FAM.filter((f, i) => !st.joined[i]).map((f) => f.n);
        return left.length ? nearestOf(left) : shulDoor();
      }
      if (a === 'rhS') {
        const st = q('rhS');
        return st.step === 'drive' ? SP.zoneSaadia : st.step === 'done' ? null : avraham;
      }
      const nx = nextQuest();
      if (!a && ((nx && available(nx)) || q('rhS').status === 'idle')) return api.npcById.moshe;
      return null;
    }
    function mapDots(dot) {
      const t = navTarget();
      if (t) dot(t.x, t.z, 5, 'rgba(255,210,63,0.9)', '#13213f');
      const a = activeId();
      if (a === 'rh1' && q('rh1').step === 'deliver') BLD.forEach((b, i) => !q('rh1').fixed[i] && dot(b.x, b.z, 4, '#f3d38a', '#13213f'));
      if (a === 'rh2' && q('rh2').step === 'collect') PICK.forEach((p, i) => !q('rh2').picked[i] && dot(p.x, p.z, 4, '#f3d38a', '#13213f'));
      if (a === 'rh4') FAM.forEach((f, i) => !q('rh4').joined[i] && dot(f.n.x, f.n.z, 4, '#f3d38a', '#13213f'));
    }
    function trackerHTML() {
      const a = activeId();
      if (a) {
        const st = q(a);
        let h = '<div class="tr-title">' + TITLES[a] + '</div>';
        if (st.timeLeft !== undefined) {
          const tl = Math.max(0, st.timeLeft);
          h += '<div class="tr-timer' + (tl < 60 ? ' low' : '') + '">⏱ ' + api.fmtTime(tl) + '</div>';
        }
        h += '<ul class="tr-list">';
        const row = (label, state, cls) => (h += '<li class="' + (cls || '') + '"><span>' + label + '</span><em>' + state + '</em></li>');
        if (a === 'rh1') {
          row('מזוזות ממורי יחיא', st.step === 'yahya' ? 'ממתינות' : '✓ בטנק', st.step === 'yahya' ? '' : 'ok');
          BLD.forEach((b, i) => row(FAMILIES[i] + (b.street ? ' <small>' + b.street + '</small>' : ''), st.fixed[i] ? '✓ נקבעה' : 'ממתינים', st.fixed[i] ? 'ok' : ''));
        } else if (a === 'rh2') {
          PICK.forEach((p, i) => row(p.name + ' <small>' + COUNTS[i] + ' אנשים</small>', st.picked[i] ? '✓ בטנק' : 'מחכים', st.picked[i] ? 'ok' : ''));
          row('בטנק', st.inVan + '/' + TOTAL, st.inVan >= TOTAL ? 'ok' : '');
        } else if (a === 'rh3') {
          const d = Math.round(headDist());
          row('12 הפסוקים', st.said + '/12', st.said >= 12 ? 'ok' : '');
          row('הילדים', st.step === 'fire' ? '🔥 במדורה' : d > 22 ? 'מאחור! ' + d + ' מ׳' : 'צמודים · ' + d + ' מ׳', st.step === 'fire' || d <= 22 ? 'ok' : 'later');
        } else if (a === 'rh4') {
          FAM.forEach((f, i) => row(f.name, st.joined[i] ? '✓ איתך' : 'בבית', st.joined[i] ? 'ok' : ''));
          if (st.step === 'reading') row('עשרת הדברות', st.read + '/10', st.read >= 10 ? 'ok' : '');
        } else if (a === 'rhS') {
          h += '</ul><div class="tr-obj">' + HINT.rhS() + '</div>';
          return h;
        }
        return h + '</ul><div class="tr-obj">' + HINT[a]() + '</div>';
      }
      const nx = nextQuest();
      if (nx) return '<div class="tr-title">' + TITLES[nx] + '</div><div class="tr-obj">דברו עם <b>' + SHALOM + '</b> ליד בית חב״ד ראש העין <span class="ic blue">!</span></div>';
      if (q('rhS').status !== 'complete') return '<div class="tr-title">' + TITLES.rhS + '</div><div class="tr-obj">' + SHALOM + ' רוצה לספר לך משהו. דברו איתו ליד בית חב״ד.</div>';
      return '<div class="tr-title done">✓ פרק 3 הושלם!</div><div class="tr-obj">ראש העין — עיר אחת. גם אברהם וסעדיה שוב ביחד.</div>';
    }

    // ================= עדכון =================
    const M = {
      rain: 0,
      caller: { id: 'moshe', name: SHALOM, role: 'בטלפון 📞' },
      callerIntro: 'שליח! מדבר שלום מראש העין. ',
      onGain(kind, n) {
        const a = activeId();
        if (a) q(a)[kind === 'joy' ? 'joy' : 'comm'] += n;
      },
      // בזמן משימה השעון עומד — כך הכול קורה באור יום
      timeRate() {
        return activeId() ? 0 : 2;
      },
      driveMods() {
        return { max: 1, grip: 1 };
      },
      // בתהלוכה הולכים בקצב של הילדים
      walkMax() {
        return activeId() === 'rh3' && q('rh3').step === 'march' ? 3.6 : null;
      },
      noVehicles() {
        const a = activeId();
        if (a === 'rh3') return 'בתהלוכה הולכים ברגל, עם הילדים 🙂';
        if (a === 'rh4') return 'חג שבועות — היום הולכים ברגל 🙂';
        return null;
      },
      obstacles(out) {
        for (const m of neighbors) if (m.on) out.push({ x: m.x, z: m.z, r: 0.35 });
        for (const m of audience) if (m.on && q('rh2').step !== 'collect') out.push({ x: m.x, z: m.z, r: 0.35 });
      },
      fadePoints() {
        return [];
      },
      canUpgrade() {
        return false;
      },
      callOffer() {
        if (activeId()) return null;
        const nx = nextQuest();
        // הפגישה הראשונה פנים אל פנים; התהלוכה והחג מתחילים ליד בית חב״ד (ברגל) — לא בטלפון
        if (nx === 'rh1' && !S().flags.rhMet) return null;
        if (nx === 'rh3' || nx === 'rh4') return null;
        if (!nx && q('rhS').status === 'locked') return { id: 'rhS', nodes: SECRET_OFFER() };
        return nx && available(nx) ? { id: nx, nodes: OFFER[nx]() } : null;
      },
      update(dt) {
        const a = activeId(), t = now();
        yahya.hidden = false;
        saadia.hidden = false;
        if (a) {
          const st = q(a);
          st.elapsed += dt;
          if (st.timeLeft !== undefined && !(a === 'rh2' && st.step !== 'collect') && !(a === 'rh4' && st.step === 'reading')) st.timeLeft -= dt;
        }
        // משימה 1: השכנים מתאספים כשמגיעים לבניין
        if (a === 'rh1') {
          const st = q('rh1');
          if (st.step === 'deliver') {
            const p = api.drv || player;
            if (gathered >= 0 && !st.fixed[gathered]) {
              // התרחקתם מהבניין בלי לקבוע — השכנים חוזרים הביתה
              const b = BLD[gathered];
              if (Math.hypot(b.door.x - p.x, b.door.z - p.z) > 45) {
                neighbors.forEach((m) => setOn(m, false));
                gathered = -1;
              }
            } else if (cheerT <= 0) {
              const i = BLD.findIndex((b, k) => !st.fixed[k] && Math.hypot(b.door.x - p.x, b.door.z - p.z) < 26);
              if (i >= 0) gatherAt(i);
            }
          }
          if (st.timeLeft <= 0) {
            api.toast('המובילים סיימו — נגמר הזמן!', 'gold');
            completeRh1('time');
          }
        }
        if (gathered >= 0) {
          cheerT -= dt;
          const b = BLD[gathered];
          neighbors.forEach((m, k) => {
            if (!m.on) return;
            if (cheerT > 0) cheer(m, t, k);
            else {
              const [tx, tz] = crowdSpot(gathered, k);
              if (walkTo(m, tx, tz, 3.2, dt, t) < 0.2) idle(m, t, b.door.x, b.door.z);
            }
          });
          // אחרי השמחה — כל אחד חוזר הביתה
          if (q('rh1').fixed[gathered] && cheerT <= 0) {
            neighbors.forEach((m) => setOn(m, false));
            gathered = -1;
          }
        }
        // משימה 2: מחכים בנקודות האיסוף; עולים לטנק
        const st2 = q('rh2');
        waiting.forEach((list, i) => {
          list.forEach((m, k) => {
            const show = a === 'rh2' && st2.step === 'collect' && !aboard.has(m) && (!st2.picked[i] || boarding === i);
            if (!show) {
              if (m.on && !(a === 'rh2' && st2.step !== 'collect')) setOn(m, false);
              return;
            }
            if (!m.on) {
              const [x, z] = waitPos(i, k);
              place(m, x, z, PICK[i].rot);
              setOn(m, true);
            }
            if (boarding === i) {
              // הולכים לדלת של הטנק ונכנסים
              const dx = van.x + Math.cos(van.h) * 1.6, dz = van.z - Math.sin(van.h) * 1.6;
              if (walkTo(m, dx, dz, 4, dt, t) < 0.6) {
                setOn(m, false);
                aboard.add(m);
              }
            } else idle(m, t, PICK[i].road.x, PICK[i].road.z);
          });
          if (boarding === i && list.every((m) => aboard.has(m))) boarding = -1;
        });
        if (a === 'rh2') {
          if (st2.step === 'story') audience.forEach((m) => idle(m, t, saadia.x, saadia.z));
          if (st2.step === 'mincha') {
            minchaT += dt;
            audience.forEach((m) => idle(m, t, (SP.saadiaDoor || saadia).x, (SP.saadiaDoor || saadia).z));
            if (minchaT > 7) completeRh2('done');
          }
          if (st2.step === 'collect' && st2.timeLeft <= 0) {
            api.toast('הגיע זמן מנחה — מתחילים עם מי שהגיע!', 'gold');
            completeRh2('time');
          }
        }
        // משימה 3: התהלוכה
        if (a === 'rh3') rh3Update(dt, t);
        else if (!done('rh3')) flames.visible = false;
        else {
          flames.visible = true;
        }
        if (flames.visible) flames.children.forEach((f, k) => { if (f.isMesh) f.scale.set(1, 0.8 + Math.abs(Math.sin(t * 9 + k * 1.7)) * 0.45, 1); });
        // משימה 4: החג
        if (a === 'rh4') {
          rh4Update(dt, t);
          FAM.forEach((f, i) => {
            const st = q('rh4');
            f.n.hidden = !!st.joined[i];
            if (!st.joined[i]) f.members.forEach((m, k) => {
              if (!m.on) {
                place(m, f.n.x + Math.cos(f.n.rot) * (k + 1) * 0.8, f.n.z - Math.sin(f.n.rot) * (k + 1) * 0.8, f.n.rot);
                setOn(m, true);
              }
              idle(m, t);
            });
          });
          if (q('rh4').step === 'gather' && q('rh4').timeLeft <= 0) {
            if (Object.keys(q('rh4').joined).length) startReading();
            else {
              api.toast('הקריאה בתורה התחילה...', 'gold');
              completeRh4('time');
            }
          }
        } else FAM.forEach((f) => (f.n.hidden = true));
        // משימה סודית
        if (a === 'rhS') {
          const st = q('rhS');
          avraham.hidden = st.step === 'drive';
          if (st.step === 'drive') {
            st.storyT += dt;
            if (st.story < AV_STORIES.length && st.storyT > 14 && Math.abs(van.v) > 2) {
              st.storyT = 0;
              const s = AV_STORIES[st.story++];
              api.toast('אברהם: ״' + s + '״');
              if (G.voice) G.voice.speak(s, 'rh_avraham', 'אברהם');
            }
          }
        } else if (done('rhS')) {
          // אחרי המשימה: אברהם יושב ליד סעדיה
          const s = SP.saadia || saadia;
          avraham.x = avraham.def.x = s.x + Math.sin((s.rot || 0) + 1.2) * 1.6;
          avraham.z = avraham.def.z = s.z + Math.cos((s.rot || 0) + 1.2) * 1.6;
          avraham.hidden = false;
        } else avraham.hidden = true;
      },
      visuals(dt, t) {
        const a = activeId();
        let z = null;
        if (a === 'rh1' && q('rh1').step === 'deliver' && api.drv === van) {
          const i = nearestBldg();
          if (i >= 0 && gathered !== i) z = BLD[i].zone;
        }
        if (a === 'rh2' && q('rh2').step === 'collect') z = q('rh2').inVan >= TOTAL ? SP.zoneSaadia : nearestOf(PICK.filter((p, i) => !q('rh2').picked[i]).map((p) => p.road));
        if (a === 'rhS' && q('rhS').step === 'drive') z = SP.zoneSaadia;
        if (z) BEAM.at(z);
        else BEAM.g.visible = false;
        BEAM.rg.scale.setScalar(1 + Math.sin((t || now()) * 4) * 0.05);
      },
      activeQuest() {
        return activeId();
      },
      mosheDialog,
      mosheIcon,
      npcDialog,
      iconFor,
      interactables,
      vanAction,
      navTarget,
      mapDots,
      trackerHTML,
    };
    // ממשיכים משימה שהייתה באמצע כשנסגר המשחק
    (function resume() {
      BLD.forEach((b, i) => (mezMeshes[i].visible = !!q('rh1').fixed[i]));
      const a = activeId();
      if (a === 'rh2' && q('rh2').step !== 'collect') q('rh2').step = 'collect';
      if (a === 'rh3') {
        q('rh3').step = 'march';
        placeMarchers();
      }
      if (a === 'rh4') {
        if (q('rh4').step === 'reading') q('rh4').step = 'gather';
        resetTrail();
        FAM.forEach((f, i) => {
          if (!q('rh4').joined[i]) return;
          place(f.walker, player.x + 1, player.z + 1);
          setOn(f.walker, true);
          f.members.forEach((m) => {
            place(m, player.x + 1.5, player.z + 1.5);
            setOn(m, true);
          });
        });
      }
      if (a === 'rhS' && q('rhS').step === 'done') q('rhS').step = 'drive';
      if (a) setTimeout(() => api.toast('ממשיכים מאיפה שעצרנו: ' + TITLES[a], 'gold'), 1200);
    })();
    return M;
  };
})();
