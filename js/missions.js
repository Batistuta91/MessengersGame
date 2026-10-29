// משימות 2–4 והמשימה הסודית: ״איפה המניין?״, ״בלי קבלה״, ״האור הגדול״, ״השליח שלא מוותר״
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeMissions = function (api) {
    const { scene, W, A, player, van, npcById, isTouch } = api;
    const ACT = isTouch ? 'כפתור הפעולה' : 'E';
    const S = () => api.S;
    const dist2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
    const vanNear = () => S().inVan || dist2(player, van.x, van.z) < (W.city ? 24 : 14);
    const stopped = () => Math.abs(van.v) < 2.5;

    // ================= מצב =================
    const DEF = {
      m2: () => ({ status: 'locked', timeLeft: 270, elapsed: 0, pass: { avraham: 'waiting', shimon: 'waiting' }, eta: {}, byVan: 0, volUsed: 0, joy: 0, comm: 0 }),
      m3: () => ({ status: 'locked', timeLeft: 360, elapsed: 0, cargo: [], delivered: {}, wrong: 0, trips: 0, rainOn: false, floodTip: false, joy: 0, comm: 0 }),
      m4: () => ({ status: 'locked', timeLeft: 420, elapsed: 0, step: 'load', menorah: 'home', gen: 'home', cables: [false, false, false], fuseBy: null, fuseEta: 0, late: false, joy: 0, comm: 0 }),
      secret: () => ({ status: 'locked', callT: 0 }),
    };
    const QIDS = ['m2', 'm3', 'm4'];
    if (!S().quests) S().quests = {};
    for (const id of [...QIDS, 'secret']) S().quests[id] = Object.assign(DEF[id](), S().quests[id] || {});
    const q = (id) => S().quests[id];
    const done = (id) => q(id).status === 'complete';
    const activeId = () => [...QIDS, 'secret'].find((id) => q(id).status === 'active') || null;
    function available(id) {
      const s = S();
      if (id === 'm2') return s.mission.status === 'complete' && s.chabadLevel >= 2;
      if (id === 'm3') return done('m2');
      if (id === 'm4') return done('m3');
      if (id === 'secret') return done('m4') && s.community >= 6;
      return false;
    }
    const nextQuest = () => QIDS.find((id) => !done(id)) || null;
    const TITLES = { m2: 'משימה 2 · ״איפה המניין?״', m3: 'משימה 3 · ״בלי קבלה״', m4: 'משימה 4 · ״האור הגדול״', secret: '✦ משימה סודית · ״השליח שלא מוותר״' };

    // ================= מיקומים: מהעיר האמיתית (W.spots) או מהעיר הישנה =================
    const SP = W.spots || {};
    const R4 = Math.PI / 4;
    const P = {
      avraham: SP.avraham || { x: 51.6, z: 47.6, rot: R4 }, shimon: SP.shimon || { x: 59.5, z: -56.6, rot: R4 },
      alon: SP.alon || { x: -50.5, z: 31, rot: R4 }, maya: SP.maya || { x: -46, z: 31, rot: R4 }, zalman: SP.zalman || { x: -47.5, z: -41, rot: R4 },
      zalmanAfter: SP.zalmanAfter || { x: -13.9, z: -6.6, rot: R4 },
      zoneShul: SP.zoneShul || { x: 24.5, z: -1.5, r: 6 }, zoneDorm: SP.zoneDorm || { x: -48, z: 34.5, r: 6.5 }, zonePlaza: SP.zonePlaza || { x: 18, z: 10.5, r: 6 },
      shulDoor: SP.shulDoor || { x: 24.5, z: -7.5 },
      menorah: SP.menorah || { x: 18, z: 18, rot: R4 },
      genPlaced: SP.genPlaced || { x: 15.7, z: 20.2 }, genHome: SP.genHome || { x: 56.4, z: -47.2, rot: 0 },
      crate: SP.crate || { x: -7.6, z: -7.0, rot: 0 },
      juncs: SP.juncs || [{ x: 15.6, z: 16.9 }, { x: 20.4, z: 16.9 }, { x: 18.3, z: 20.6 }],
      kitchen: SP.kitchen || { x: -19.5, z: -8.5 }, kiosk: SP.kiosk || { x: 61, z: -57.3 },
      helperRoi: SP.helperRoi || { from: { x: 23, z: 13.5 }, to: { x: 20.6, z: 16.2 } },
      helperDaniel: SP.helperDaniel || { from: { x: 19.4, z: 21.8 }, to: { x: 19.2, z: 20.2 } },
      crowd: SP.crowd || [[21.6, 16.8], [22.9, 18.3], [21.8, 19.5], [24.2, 16.6], [24.6, 18.5], [23.8, 19.6], [26.2, 17.3], [17, 14.4], [19.2, 14.3], [18.1, 12.8], [16.7, 12.4], [19.5, 12.5]].map(([x, z]) => ({ x, z })),
    };
    const MX = P.menorah.x, MZ = P.menorah.z;

    // ================= דמויות חדשות =================
    const NEW_NPCS = [
      { id: 'avraham', name: 'אברהם', role: 'הסבא מהפארק', ...P.avraham,
        look: { shirt: 0xffffff, jacket: 0x5d5d6b, pants: 0x3b3b44, skin: 0xe8c0a0, kippah: 0x222222, hair: 0xdddddd, beard: 0xeeeeee } },
      { id: 'shimon', name: 'שמעון', role: 'הנהג התקוע', ...P.shimon,
        look: { shirt: 0x8fb3d9, pants: 0x2c3e50, skin: 0xd9a27a, hair: 0x333333, kippah: 0x1b3a8a } },
      { id: 'alon', name: 'אלון', role: 'סטודנט, ״הבאר״', ...P.alon,
        look: { shirt: 0xf39c12, pants: 0x34495e, skin: 0xf0c8a0, hair: 0x6b4423 } },
      { id: 'maya', name: 'מאיה', role: 'סטודנטית, ״הבאר״', ...P.maya,
        look: { shirt: 0xe84393, pants: 0x2d3436, skin: 0xf5d6b8, hair: 0x2b1b10 } },
      { id: 'zalman', name: 'ר׳ זלמן', role: 'החזן מהבניין בקצה', ...P.zalman,
        look: { shirt: 0xffffff, jacket: 0x3a3a3a, pants: 0x2b2b2b, skin: 0xe6c2a6, hat: 'fedora', beard: 0xf0f0f0 } },
    ];
    for (const d of NEW_NPCS) api.addNPC(d);
    const N = (id) => npcById[id];
    const home = (n) => {
      n.x = n.def.x;
      n.z = n.def.z;
      n.rot = n.rotT = n.def.rot || 0;
      n.ctrl = null;
    };
    function walkTo(n, tx, tz, speed, onArrive) {
      n.walkSpeed = speed * 1.6;
      n.ctrl = (dt) => {
        const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
        if (d < 0.15) {
          n.ctrl = null;
          if (onArrive) onArrive();
          return false;
        }
        const s = Math.min(d, speed * dt);
        n.x += (dx / d) * s;
        n.z += (dz / d) * s;
        n.rotT = Math.atan2(dx, dz);
        return true;
      };
    }
    function hold(n, x, z, faceX, faceZ) {
      n.x = x;
      n.z = z;
      n.ctrl = () => {
        n.rotT = Math.atan2(faceX - n.x, faceZ - n.z);
        return false;
      };
    }

    // ================= עזרים חזותיים =================
    const lam = (c, e) => new T.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const beamMat = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const beamRingMat = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide });
    function makeBeam(r) {
      const g = new T.Group();
      const c = new T.Mesh(new T.CylinderGeometry(r, r, 8, 24, 1, true), beamMat);
      c.position.y = 4;
      const rg = new T.Mesh(new T.RingGeometry(r - 0.3, r, 32), beamRingMat);
      rg.rotation.x = -Math.PI / 2;
      rg.position.y = 0.12;
      g.add(c, rg);
      g.visible = false;
      scene.add(g);
      return g;
    }
    const ZONES = {
      shul: Object.assign({ label: 'בית הכנסת' }, P.zoneShul),
      dorm: Object.assign({ label: 'הבאר' }, P.zoneDorm),
      plaza: Object.assign({ label: 'רחבת השחר' }, P.zonePlaza),
    };
    for (const k in ZONES) ZONES[k].beam = makeBeam(k === 'plaza' ? 3.2 : 3.6);
    const inZone = (z) => Math.hypot(van.x - z.x, van.z - z.z) < z.r;

    // מטען על גג הטנק
    const cargoGroup = new T.Group();
    cargoGroup.position.y = van.m.roofY || 2.3;
    van.m.body.add(cargoGroup);
    const CARGO_LOOK = {
      challah: [0.7, 0.3, 0.5, 0xc98a3a], candles: [0.4, 0.4, 0.4, 0xffffff], juice: [0.5, 0.5, 0.4, 0x7b1e3a], cholent: [0.9, 0.6, 0.9, 0x555555],
      bamba: [0.5, 0.4, 0.3, 0xf1c40f], energy: [0.3, 0.5, 0.3, 0x2ecc71], menorah: [0.8, 0.5, 2.6, 0xd4a017], gen: [1.1, 0.8, 0.8, 0xf1c40f],
    };
    function syncCargo() {
      while (cargoGroup.children.length) cargoGroup.remove(cargoGroup.children[0]);
      const items = [];
      if (q('m3').status === 'active') items.push(...q('m3').cargo);
      if (q('m4').menorah === 'van') items.push('menorah');
      if (q('m4').gen === 'van') items.push('gen');
      let z = -1.6;
      for (const id of items) {
        const [w, h, d, c] = CARGO_LOOK[id];
        const m = new T.Mesh(new T.BoxGeometry(w, h, d), lam(c));
        m.castShadow = true;
        if (id === 'menorah') m.position.set(-0.45, h / 2, -0.6);
        else if (id === 'gen') m.position.set(0.4, h / 2, -1.2);
        else {
          m.position.set(0, h / 2, z + d / 2);
          z += d + 0.15;
        }
        cargoGroup.add(m);
      }
    }

    // גשם
    const RAIN_N = 700;
    const rainPos = new Float32Array(RAIN_N * 6);
    const rainGeo = new T.BufferGeometry();
    rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
    const rainMat = new T.LineBasicMaterial({ color: 0xc8d8ee, transparent: true, opacity: 0, depthWrite: false });
    const rainLines = new T.LineSegments(rainGeo, rainMat);
    rainLines.frustumCulled = false;
    rainLines.visible = false;
    scene.add(rainLines);
    const drops = [];
    for (let i = 0; i < RAIN_N; i++) drops.push({ x: (Math.random() - 0.5) * 90, y: Math.random() * 30, z: (Math.random() - 0.5) * 90, v: 26 + Math.random() * 10 });
    const floodMat = new T.MeshBasicMaterial({ color: 0x4f86c6, transparent: true, opacity: 0, depthWrite: false });
    const flood = new T.Mesh(new T.PlaneGeometry(80, 7.6), floodMat);
    flood.rotation.x = -Math.PI / 2;
    flood.position.set(0, 0.07, 0);
    flood.visible = false;
    scene.add(flood);
    const inFlood = (v) => (W.isFlooded ? W.isFlooded(v.x, v.z) : Math.abs(v.z) < 4.3 && Math.abs(v.x) < 40);
    const floodView = W.floodMesh || flood;

    // אורות בבית הכנסת אחרי מניין
    const shulLights = W.shulLights || W.makeLights([20.6, 4.6, -7.75], [28.4, 4.6, -7.75], 10);
    shulLights.visible = false;

    // ---------- חנוכייה, גנרטור, ארגז וכבלים ----------
    const gold = lam(0xd4a017, { emissive: 0x3a2a00 });
    function makeMenorah() {
      const g = new T.Group();
      const add = (geo, mat, x, y, z, rz) => {
        const m = new T.Mesh(geo, mat);
        m.position.set(x, y, z);
        if (rz) m.rotation.z = rz;
        m.castShadow = true;
        g.add(m);
        return m;
      };
      add(new T.BoxGeometry(1.8, 0.3, 1.1), lam(0x8a6a2a), 0, 0.15, 0);
      add(new T.BoxGeometry(1.0, 0.4, 0.7), gold, 0, 0.5, 0);
      add(new T.BoxGeometry(0.26, 4.4, 0.26), gold, 0, 2.9, 0);
      const SP = 0.62, TOP = 4.6;
      const flames = [];
      const flameGeo = new T.BoxGeometry(0.14, 0.28, 0.14);
      const flameMat = new T.MeshBasicMaterial({ color: 0xffc04a });
      const glowMat = new T.SpriteMaterial({ map: G.glowTex('255,190,90'), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
      const cup = (x, y) => {
        add(new T.BoxGeometry(0.32, 0.18, 0.32), gold, x, y, 0);
        const f = add(flameGeo, flameMat, x, y + 0.24, 0);
        f.castShadow = false;
        f.visible = false;
        const gl = new T.Sprite(glowMat);
        gl.scale.set(1.3, 1.3, 1);
        gl.position.set(x, y + 0.3, 0);
        gl.visible = false;
        g.add(gl);
        flames.push({ f, gl, x, y });
      };
      cup(0, TOP + 0.7);
      add(new T.BoxGeometry(0.2, 0.7, 0.2), gold, 0, TOP + 0.35, 0);
      for (const side of [1, -1])
        for (let i = 1; i <= 4; i++) {
          const L = Math.SQRT2 * i * SP;
          add(new T.BoxGeometry(0.14, L, 0.14), gold, (side * i * SP) / 2, TOP - (i * SP) / 2, 0, -side * Math.PI / 4);
        }
      for (let i = 4; i >= 1; i--) cup(i * SP, TOP);
      for (let i = 1; i <= 4; i++) cup(-i * SP, TOP);
      g.scale.setScalar(1.3);
      g.rotation.y = Math.PI / 4;
      return { g, flames };
    }
    const menorah = makeMenorah();
    menorah.g.position.set(MX, 0, MZ);
    menorah.g.rotation.y = P.menorah.rot || 0;
    menorah.g.visible = false;
    scene.add(menorah.g);
    const genAt = P.genPlaced;
    function makeGenerator() {
      const g = new T.Group();
      const b = new T.Mesh(new T.BoxGeometry(1.3, 0.9, 0.9), lam(0xf1c40f));
      b.position.y = 0.6;
      b.castShadow = true;
      const p = new T.Mesh(new T.BoxGeometry(0.6, 0.4, 0.02), lam(0x333333));
      p.position.set(0, 0.7, 0.46);
      const f = new T.Mesh(new T.BoxGeometry(1.4, 0.15, 1.0), lam(0x444444));
      f.position.y = 0.1;
      g.add(b, p, f);
      return g;
    }
    const genHome = makeGenerator();
    genHome.position.set(P.genHome.x, 0, P.genHome.z);
    genHome.rotation.y = P.genHome.rot || 0;
    scene.add(genHome);
    const genPlaced = makeGenerator();
    genPlaced.position.set(genAt.x, 0, genAt.z);
    genPlaced.visible = false;
    scene.add(genPlaced);
    const crate = new T.Group();
    const crBox = new T.Mesh(new T.BoxGeometry(1.0, 0.9, 1.8), lam(0x9c6b3c));
    crBox.position.y = 0.45;
    crBox.castShadow = true;
    const crSign = new T.Mesh(new T.PlaneGeometry(0.9, 0.35), new T.MeshLambertMaterial({ map: G.textTex('חנוכייה', { w: 64, h: 24, size: 14, bg: '#9c6b3c', fg: '#ffd23f', border: null }) }));
    crSign.position.set(0.51, 0.55, 0);
    crSign.rotation.y = Math.PI / 2;
    crate.add(crBox, crSign);
    crate.position.set(P.crate.x, 0, P.crate.z);
    crate.rotation.y = (P.crate.rot || 0) + Math.PI / 2;
    scene.add(crate);
    const JUNCS = P.juncs;
    const juncLights = [];
    const juncGroup = new T.Group();
    juncGroup.visible = false;
    scene.add(juncGroup);
    const cableMat = new T.LineBasicMaterial({ color: 0x111111 });
    const cables = [];
    JUNCS.forEach((j, i) => {
      const post = new T.Mesh(new T.BoxGeometry(0.35, 0.8, 0.35), lam(0x666666));
      post.position.set(j.x, 0.4, j.z);
      post.castShadow = true;
      const li = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 0.2), new T.MeshBasicMaterial({ color: 0xff3b3b }));
      li.position.set(j.x, 0.9, j.z);
      juncGroup.add(post, li);
      juncLights.push(li);
      const pts = [new T.Vector3(genAt.x, 0.15, genAt.z), new T.Vector3(j.x, 0.15, j.z), new T.Vector3(MX, 0.15, MZ)];
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), cableMat);
      line.visible = false;
      scene.add(line);
      cables.push(line);
    });
    // ניצוצות חגיגיים
    const sparkMats = [0xffd23f, 0xff8c42, 0x6ec6ff, 0xffffff].map((c) => new T.SpriteMaterial({ color: c, transparent: true, depthWrite: false }));
    const sparks = [];
    for (let i = 0; i < 40; i++) {
      const s = new T.Sprite(sparkMats[i % 4]);
      s.scale.set(0.22, 0.22, 1);
      s.visible = false;
      scene.add(s);
      sparks.push({ s, life: 0, vx: 0, vy: 0, vz: 0 });
    }
    function burst(x, y, z, n) {
      for (let i = 0; i < n; i++) {
        const sp = sparks.find((p) => p.life <= 0);
        if (!sp) return;
        sp.life = 1.2 + Math.random() * 0.6;
        sp.vx = (Math.random() - 0.5) * 3;
        sp.vy = 2 + Math.random() * 3;
        sp.vz = (Math.random() - 0.5) * 3;
        sp.s.position.set(x, y, z);
        sp.s.visible = true;
      }
    }

    // ================= שליחת תוצאות =================
    function finish(id, ok, data) {
      const st = q(id);
      st.status = ok ? 'complete' : 'failed';
      data.rows = (data.rows || []).concat([['שמחה ושליחות', '+' + st.joy], ['קשרים חדשים', '+' + st.comm]]);
      api.save();
      api.results(data, data.delay !== undefined ? data.delay : 1200);
    }
    const timeRow = (st, total) => ['זמן', api.fmtTime(total - Math.max(0, st.timeLeft))];

    // =====================================================================
    // משימה 2 — ״איפה המניין?״
    // =====================================================================
    const PASS = ['avraham', 'shimon'];
    function startM2() {
      const st = Object.assign(q('m2'), DEF.m2(), { status: 'active' });
      S().time = 16;
      for (const id of PASS) {
        const n = N(id);
        n.hidden = false;
        home(n);
      }
      A.success();
      api.toast('המשימה התחילה: ״איפה המניין?״ — חסרים שניים למניין!', 'gold');
      api.save();
      return st;
    }
    const volAvail = () => S().volunteers - q('m2').volUsed;
    function pickup(id) {
      const st = q('m2');
      st.pass[id] = 'inVan';
      st.byVan++;
      N(id).hidden = true;
      A.load();
      api.toast(N(id).def.name + ' עלה לטנק!' + (S().radio ? ' (ומזמזם עם הניגון)' : ''), 'gold');
      if (S().radio) api.addJoy(2);
      api.save();
    }
    function dropoff() {
      const st = q('m2');
      let k = 0;
      for (const id of PASS)
        if (st.pass[id] === 'inVan') {
          st.pass[id] = 'walking';
          const n = N(id);
          n.hidden = false;
          n.x = van.x + 1.5 + k;
          n.z = van.z - 2.5;
          k += 0.8;
          walkTo(n, P.shulDoor.x + (k - 1.2) * 0.6, P.shulDoor.z, 2.5, () => {
            n.hidden = true;
            arriveM2(id);
          });
        }
      A.click();
    }
    function sendVolunteer(id) {
      const st = q('m2');
      st.volUsed++;
      st.pass[id] = 'volunteer';
      st.eta[id] = st.elapsed + 70;
      N(id).hidden = true;
      api.toast('מתנדב יצא ללוות את ' + N(id).def.name + ' — יגיעו לבית הכנסת בעוד כדקה', 'gold');
      api.save();
    }
    function arriveM2(id) {
      const st = q('m2');
      if (st.status !== 'active') return;
      st.pass[id] = 'arrived';
      api.addJoy(8);
      const c = PASS.filter((p) => st.pass[p] === 'arrived').length;
      api.toast(N(id).def.name + ' הגיע לבית הכנסת! ' + (8 + c) + '/10', 'gold');
      A.chime();
      if (c === 2) completeM2('done');
      else api.save();
    }
    function completeM2(reason) {
      const st = q('m2');
      if (st.status !== 'active') return;
      const c = PASS.filter((p) => st.pass[p] === 'arrived').length;
      for (const id of PASS) {
        N(id).hidden = true;
        N(id).ctrl = null;
      }
      const ok = c >= 1;
      const changes = [];
      if (c === 2) {
        shulLights.visible = true;
        api.addCommunity(2);
        S().volunteers++;
        changes.push('בית הכנסת מואר — יש מניין קבוע לשבת', 'שמעון הצטרף כמתנדב 🙋');
      } else if (c === 1) {
        api.addCommunity(1);
        changes.push('תשעה מתפללים — כמעט! בשבוע הבא ינסו שוב');
      }
      const stars = c === 2 ? (st.timeLeft >= 60 ? 3 : 2) : 1;
      finish('m2', ok, {
        stars: ok ? stars : 0,
        title: c === 2 ? 'יש מניין!' : ok ? 'השקיעה הגיעה — חסר עוד אחד' : 'השקיעה הגיעה — המניין לא התאסף',
        note: c === 2 ? '״ברוכים הבאים!״ — עשרה אנשים, תפילה אחת. אברהם בוכה מהתרגשות.' : ok ? '' : 'אפשר לנסות שוב — דברו עם משה.',
        rows: [['מתפללים', 8 + c + '/10'], ['נאספו בטנק', st.byVan], ['מתנדבים שנשלחו', st.volUsed], timeRow(st, 270)],
        changes,
      });
    }
    const M2_LINES = {
      avraham: 'שבת שלום! ברגליים שלי עד בית הכנסת? זה ייקח לי עד מוצאי שבת...',
      shimon: 'האוטו מת לי באמצע הדרך! ואני עוד הבטחתי לגבאי שאגיע למניין...',
    };
    function dlgPassenger(id) {
      const st = q('m2');
      const c = [{ t: 'חכה כאן — אני מביא את הטנק ואוסף אותך' }];
      if (volAvail() > 0) c.push({ t: 'אשלח מתנדב שילווה אותך ברגל (לוקח כדקה)', fx: () => sendVolunteer(id) });
      return { a: { s: 'npc', t: M2_LINES[id] + (st.pass[id] === 'waiting' ? '' : ''), c } };
    }

    // =====================================================================
    // משימה 3 — ״בלי קבלה״
    // =====================================================================
    const ITEMS = {
      challah: { name: 'חלות', slots: 1, need: true },
      candles: { name: 'נרות שבת', slots: 1, need: true },
      juice: { name: 'מיץ ענבים', slots: 1, need: true },
      cholent: { name: 'סיר צ׳ולנט', slots: 2, need: true },
      bamba: { name: 'במבה', slots: 1, need: false },
      energy: { name: 'משקה אנרגיה', slots: 1, need: false },
    };
    const NEEDED = ['challah', 'candles', 'juice', 'cholent'];
    const CAP = 4;
    const cargoSlots = () => q('m3').cargo.reduce((s, id) => s + ITEMS[id].slots, 0);
    function startM3() {
      Object.assign(q('m3'), DEF.m3(), { status: 'active' });
      S().time = 14.5;
      A.success();
      api.toast('המשימה התחילה: ״בלי קבלה״ — שולחן שבת לסטודנטים!', 'gold');
      api.save();
    }
    function addItem(id) {
      const st = q('m3');
      if (st.cargo.includes(id) || st.delivered[id]) return 'dup';
      if (cargoSlots() + ITEMS[id].slots > CAP) return 'full';
      st.cargo.push(id);
      A.load();
      syncCargo();
      api.save();
      return 'ok';
    }
    function dlgShop(intro, offers) {
      if (!vanNear()) return { a: { s: 'npc', t: intro + ' אבל איפה תשים את זה? תביא את הטנק קרוב יותר.' } };
      const nodes = {};
      const choices = offers
        .map((id) => ({
          t: ITEMS[id].name + (ITEMS[id].slots > 1 ? ' (תופס 2 מקומות)' : ''), go: 'r',
          fx: () => {
            const res = addItem(id);
            nodes.r.t = res === 'ok' ? ITEMS[id].name + ' — בטנק! (' + cargoSlots() + '/' + CAP + ' מקומות)' : res === 'full' ? 'הטנק מלא! תמסור קודם את מה שיש — ותחזור.' : 'את זה כבר לקחת 🙂';
          },
        }))
        .concat([{ t: 'זהו, תודה!', go: 'bye' }]);
      nodes.a = { s: 'npc', t: intro + ' מה לארוז?', c: choices };
      nodes.r = { s: 'npc', t: '', go: 'a2' };
      nodes.a2 = { s: 'npc', t: 'עוד משהו?', c: choices };
      nodes.bye = { s: 'npc', t: 'שבת שלום לסטודנטים!' };
      return nodes;
    }
    function deliver() {
      const st = q('m3');
      st.trips++;
      let good = 0;
      const wrong = [];
      for (const id of st.cargo) {
        if (ITEMS[id].need) {
          st.delivered[id] = true;
          good++;
        } else wrong.push(ITEMS[id].name);
      }
      st.wrong += wrong.length;
      st.cargo = [];
      syncCargo();
      A.chime();
      if (good) api.addJoy(4 * good);
      const have = NEEDED.filter((id) => st.delivered[id]).length;
      api.toast('הסטודנטים קיבלו ' + good + ' פריטים! (' + have + '/4)', 'gold');
      if (wrong.length) setTimeout(() => api.toast('מאיה: ״' + wrong.join(' ו') + '? חמוד, אבל זה שולחן שבת 😄״'), 900);
      if (have === 4) completeM3('done');
      else api.save();
    }
    function completeM3(reason) {
      const st = q('m3');
      if (st.status !== 'active') return;
      st.rainOn = false;
      const have = NEEDED.filter((id) => st.delivered[id]).length;
      const ok = have >= 3;
      const changes = [];
      if (ok) {
        W.dormTable.visible = true;
        api.addCommunity(2);
        changes.push('שולחן שבת ערוך מול ״הבאר״, עם נרות ונורות');
        if (have === 4) {
          S().volunteers++;
          changes.push('אלון הסטודנט הצטרף כמתנדב 🙋');
        } else changes.push('חסר פריט אחד — אבל הסטודנטים אלתרו');
      }
      st.cargo = [];
      syncCargo();
      const stars = have === 4 ? (st.wrong === 0 && st.timeLeft >= 60 ? 3 : 2) : 1;
      finish('m3', ok, {
        stars: ok ? stars : 0,
        title: have === 4 ? 'שולחן שבת ערוך!' : ok ? 'שבת נכנסה — כמעט הכול על השולחן' : 'שבת נכנסה — השולחן נשאר ריק',
        note: have === 4 ? '״שבת שלום!״ — עשרים סטודנטים, שולחן אחד, ואף קבלה.' : ok ? '' : 'אפשר לנסות שוב — דברו עם משה.',
        rows: [['מצרכים שנמסרו', have + '/4'], ['נסיעות', st.trips], ['פריטים מיותרים', st.wrong], timeRow(st, 360)],
        changes,
      });
    }

    // =====================================================================
    // משימה 4 — ״האור הגדול״
    // =====================================================================
    function startM4() {
      Object.assign(q('m4'), DEF.m4(), { status: 'active' });
      S().time = 15;
      resetM4Visuals();
      A.success();
      api.toast('המשימה התחילה: ״האור הגדול״ — חנוכייה ענקית בכיכר!', 'gold');
      api.save();
    }
    function resetM4Visuals() {
      const st = q('m4');
      const placed = st.status === 'complete' || st.menorah === 'placed';
      menorah.g.visible = placed;
      crate.visible = st.menorah === 'home';
      genHome.visible = st.gen === 'home';
      genPlaced.visible = st.status === 'complete' || st.gen === 'placed';
      const cablesStage = st.status === 'complete' || (st.menorah === 'placed' && st.gen === 'placed');
      juncGroup.visible = cablesStage && st.status !== 'complete';
      cables.forEach((c, i) => {
        c.visible = st.status === 'complete' || (cablesStage && st.cables[i]);
        juncLights[i].material.color.set(st.cables[i] || st.status === 'complete' ? 0x3ecf72 : 0xff3b3b);
      });
      const lit = st.status === 'complete';
      for (const f of menorah.flames) f.f.visible = f.gl.visible = lit;
      syncCargo();
    }
    function loadM4(what) {
      const st = q('m4');
      if (!vanNear()) {
        api.toast('צריך את הטנק קרוב כדי להעמיס');
        return;
      }
      st[what] = 'van';
      A.load();
      if (what === 'gen' && S().mission.targets.roi === 'accepted') api.toast('רועי עזר להעמיס את הגנרטור — ״בשביל חנוכה? בכיף!״', 'gold');
      else api.toast(what === 'menorah' ? 'החנוכייה על הטנק!' : 'הגנרטור על הטנק!', 'gold');
      resetM4Visuals();
      api.save();
    }
    function unloadM4() {
      const st = q('m4');
      if (st.menorah === 'van') st.menorah = 'placed';
      if (st.gen === 'van') st.gen = 'placed';
      A.load();
      if (st.menorah === 'placed' && st.gen === 'placed') {
        st.step = 'cables';
        api.toast('הכול בכיכר! עכשיו לחבר שלושה כבלים לנקודות החיבור', 'gold');
      } else api.toast('נפרק בכיכר. חסר עוד ' + (st.menorah !== 'placed' ? 'החנוכייה' : 'הגנרטור'));
      resetM4Visuals();
      api.save();
    }
    function connect(i) {
      const st = q('m4');
      st.cables[i] = true;
      A.click();
      A.chime();
      if (st.cables.every(Boolean)) {
        st.step = 'light';
        api.toast('כל הכבלים מחוברים! גשו לחנוכייה ולחצו ' + ACT + ' להדלקה', 'gold');
      } else api.toast('כבל מחובר (' + st.cables.filter(Boolean).length + '/3)');
      resetM4Visuals();
      api.save();
    }
    function tryLight() {
      const st = q('m4');
      if (st.step === 'light') {
        st.step = 'fault';
        A.fail();
        menorah.flames.forEach((f) => (f.f.visible = f.gl.visible = true));
        setTimeout(() => {
          menorah.flames.forEach((f) => (f.f.visible = f.gl.visible = false));
          burst(MX, 5.5, MZ, 14);
          api.say({ phone: true, def: { name: 'בזזזט!', role: 'תקלה ברגע האחרון' }, x: MX, z: MZ, nodes: dlgFault() });
        }, 450);
        return;
      }
      if (st.step === 'fix') startCeremony();
    }
    function dlgFault() {
      const s = S();
      const c = [];
      if (s.mission.targets.roi === 'accepted') c.push({ t: 'להתקשר לרועי מתחנת הדלק — יש לו נתיכים', fx: () => sendHelper('roi', 22) });
      if (s.mission.targets.daniel === 'accepted') c.push({ t: 'לבקש מדניאל — המשרד שלו קרוב', fx: () => sendHelper('daniel', 14) });
      c.push({ t: 'לנסוע בעצמי לדוכן בתחנת הדלק ולקנות נתיך', fx: () => { q('m4').step = 'shop'; api.toast('סעו לדוכן בתחנת הדלק וקנו נתיך'); } });
      return { a: { s: 'narr', t: 'הפיוז נשרף והחנוכייה כבתה! האנשים כבר בדרך... צריך נתיך חדש, ומהר.', c } };
    }
    function sendHelper(id, secs) {
      const st = q('m4');
      st.fuseBy = id;
      st.fuseEta = st.elapsed + secs;
      st.step = 'wait';
      N(id).hidden = true;
      api.toast((id === 'roi' ? 'רועי' : 'דניאל') + ' בדרך עם נתיך! (' + secs + ' שניות)', 'gold');
      api.addCommunity(1);
    }
    function helperArrives() {
      const st = q('m4');
      const n = N(st.fuseBy);
      n.hidden = false;
      const hp = st.fuseBy === 'roi' ? P.helperRoi : P.helperDaniel;
      n.x = hp.from.x;
      n.z = hp.from.z;
      walkTo(n, hp.to.x, hp.to.z, 3, () => {
        st.step = 'fix';
        api.toast(n.def.name + ' הביא נתיך! גשו לחנוכייה ולחצו ' + ACT, 'gold');
        hold(n, n.x, n.z, MX, MZ);
      });
    }
    let cer = null;
    const CROWD_IDS = ['moshe', 'yossi', 'cohen', 'daniel', 'roi', 'ido', 'avraham', 'shimon', 'alon', 'maya', 'zalman'];
    const CROWD_SPOTS = P.crowd.map((c) => [c.x, c.z]);
    function startCeremony() {
      const st = q('m4');
      st.step = 'ceremony';
      cer = { t: 0, lit: 0 };
      let k = 0;
      for (const id of CROWD_IDS) {
        const n = N(id);
        if (id === 'zalman' && !done('secret')) continue;
        const [x, z] = CROWD_SPOTS[k++ % CROWD_SPOTS.length];
        n.hidden = false;
        hold(n, x, z, MX, MZ);
      }
      api.spawnExtraWalkers();
      api.setRadio(1);
      api.toast('כל השכונה בכיכר! מדליקים...', 'gold');
    }
    function updateCeremony(dt) {
      cer.t += dt;
      const want = Math.min(9, Math.floor(cer.t / 0.75));
      while (cer.lit < want) {
        const f = menorah.flames[cer.lit];
        f.f.visible = f.gl.visible = true;
        A.candle(cer.lit);
        const wp = new T.Vector3();
        f.f.getWorldPosition(wp);
        burst(wp.x, wp.y, wp.z, 3);
        cer.lit++;
        if (cer.lit === 9) {
          api.toast('חג אורים שמח! 🕎', 'gold');
          A.cheer();
        }
      }
      S().time = G.lerp(S().time, 17.9, 1 - Math.exp(-0.8 * dt));
      if (cer.lit === 9 && Math.random() < dt * 4) burst(MX + (Math.random() - 0.5) * 3, 6 + Math.random() * 2, MZ + (Math.random() - 0.5) * 3, 6);
      if (cer.t > 9 * 0.75 + 4) {
        cer = null;
        completeM4('done');
      }
    }
    function releaseCrowd() {
      for (const id of CROWD_IDS) {
        const n = N(id);
        n.hidden = false;
        home(n);
      }
      applyVisibility();
    }
    function completeM4(reason) {
      const st = q('m4');
      if (st.status !== 'active') return;
      const ok = reason === 'done';
      if (ok) api.addCommunity(3);
      st.status = ok ? 'complete' : 'failed';
      resetM4Visuals();
      finish('m4', ok, {
        stars: ok ? (st.late ? 2 : st.timeLeft >= 60 ? 3 : 2) : 0,
        title: ok ? 'האור הגדול!' : 'האנשים הגיעו — אבל החנוכייה לא דלקה',
        note: ok ? '״מעט אור דוחה הרבה חושך״ — וכל העיר ראתה.' : 'אפשר לנסות שוב — דברו עם משה.',
        rows: [['כבלים', q('m4').cables.filter(Boolean).length + '/3'], ['פתרון התקלה', { roi: 'רועי', daniel: 'דניאל' }[st.fuseBy] || (ok ? 'קניתם נתיך' : '—')], timeRow(st, 420)],
        changes: ok ? ['חנוכייה ענקית דולקת בכיכר העיר — כל ערב', 'בית חב״ד יכול להפוך למרכז קהילתי — היכנסו בדלת'] : [],
        onClose: releaseCrowd,
      });
      if (!ok) {
        Object.assign(st, { menorah: 'home', gen: 'home', cables: [false, false, false], step: 'load' });
        resetM4Visuals();
      }
    }

    // =====================================================================
    // משימה סודית — ״השליח שלא מוותר״
    // =====================================================================
    function phoneCall() {
      const s = S();
      const caller = s.mission.targets.cohen === 'accepted' ? { name: 'מר כהן', role: 'בטלפון 📞' } : { name: 'משה', role: 'בטלפון 📞' };
      A.phone();
      api.say({ phone: true, def: caller, x: player.x, z: player.z, nodes: dlgSecretOffer() });
    }
    function dlgSecretOffer() {
      return {
        a: { s: 'npc', t: 'שליח, יש לי בקשה קטנה... יש אדם בקצה השכונה, ר׳ זלמן. גר לבד כבר שנים. פעם היה חזן — היום כמעט אף אחד לא מבקר אותו.', go: 'b' },
        b: {
          s: 'npc', t: 'אין שעון ואין פרס. רק... תעבור אצלו? הוא יושב ליד הכניסה לבניין, ליד הכביש. סימנתי לך במפה.',
          c: [{ t: 'אני בדרך.', fx: startSecret }, { t: 'אחר כך — אני באמצע משהו', fx: () => (q('secret').status = 'idle') }],
        },
      };
    }
    function startSecret() {
      q('secret').status = 'active';
      const z = N('zalman');
      z.hidden = false;
      home(z);
      api.toast('״השליח שלא מוותר״ — בלי שעון. רק ללכת.', 'gold');
      api.save();
    }
    function dlgZalman() {
      if (done('secret')) return { a: { s: 'npc', t: 'שבת שלום, שליח! השבת אני מוביל את ׳לכה דודי׳. תבוא לשמוע?' } };
      return {
        a: {
          s: 'narr', t: 'ר׳ זלמן יושב ליד הכניסה ומביט ברחוב. הוא לא מרים את הראש.',
          c: [{ t: 'להתיישב לידו בשקט', go: 'b' }, { t: 'להתחיל לספר לו על כל הפעילות של בית חב״ד', go: 'a2' }],
        },
        a2: { s: 'narr', t: 'הוא מהנהן בנימוס — אבל נראה שהוא נסגר עוד יותר. אולי צריך פחות לדבר.', go: 'a' },
        b: {
          s: 'npc', t: '...אנשים בדרך כלל לא עוצרים פה. אתה מהטנק עם המוזיקה?',
          c: [{ t: 'כן. רציתי פשוט להכיר אותך.', go: 'c' }, { t: 'כן! רוצה להניח תפילין?', go: 'b2' }],
        },
        b2: { s: 'npc', t: 'אולי... לא עכשיו.', go: 'b' },
        c: {
          s: 'npc', t: 'פעם הייתי חזן. בבית הכנסת הישן, לפני שנסגר. היה לי קול, אתה יודע...',
          c: [{ t: 'ספר לי על זה.', go: 'd' }, { t: 'אצלנו יש מניין עכשיו! תבוא?', go: 'c2' }],
        },
        c2: { s: 'npc', t: 'מניין... כבר מזמן לא הייתי. ממזמן.', go: 'c' },
        d: {
          s: 'npc', t: 'ערבי שבת... כל השכונה הייתה באה. אחרי שאשתי נפטרה — הפסקתי ללכת. ככה זה.',
          c: [{ t: 'אנחנו צריכים חזן. ואני — צריך חבר.', go: 'e' }],
        },
        e: { s: 'npc', t: '(שתיקה ארוכה) ...חזן. אתה יודע, אני עוד זוכר את ׳לכה דודי׳ בנוסח של אבא שלי.', c: [{ t: 'תבוא לשבת הזאת? אני אאסוף אותך בטנק.', go: 'f' }] },
        f: { s: 'npc', t: '...טוב. אבל רק אם תבטיח לבוא שוב — גם בשבוע שאחרי.', c: [{ t: 'מבטיח.', go: 'g' }] },
        g: { s: 'narr', t: 'בפעם הראשונה הוא מחייך.', end: completeSecret },
      };
    }
    function completeSecret() {
      const st = q('secret');
      st.status = 'complete';
      api.addJoy(20);
      api.addCommunity(3);
      const z = N('zalman');
      z.def.x = P.zalmanAfter.x;
      z.def.z = P.zalmanAfter.z;
      z.def.rot = P.zalmanAfter.rot || 0;
      api.save();
      api.results({
        title: 'השליח שלא מוותר',
        note: 'לא כל הצלחה נמדדת במהירות או בכמות. לפעמים מישהו פשוט מחכה שיבואו.',
        rows: [['שעון', 'לא היה'], ['ר׳ זלמן', 'חזר לקהילה']],
        changes: ['ר׳ זלמן מגיע מעכשיו לבית חב״ד', 'בשבת הקרובה הוא מוביל את התפילה'],
        onClose: () => home(z),
      }, 1500);
    }

    // =====================================================================
    // דיאלוג משה (אחרי משימה 1)
    // =====================================================================
    const HINT = {
      m2: () => {
        const st = q('m2');
        if (PASS.some((p) => st.pass[p] === 'inVan')) return 'יש לך נוסעים — סע לבית הכנסת, עצור מול הכניסה ולחץ ' + ACT + '.';
        return 'אברהם בפארק השחר, שמעון בתחנת סונול. עצור לידם עם הטנק ולחץ ' + ACT + ' כדי לאסוף. מתנדב יכול ללוות אחד מהם — אבל זה איטי יותר.';
      },
      m3: () => 'חלות ונרות אצל מר כהן, מיץ ענבים אצל רועי בסונול, הצ׳ולנט במטבח שלנו (שלט ״מטבח שבת״ ליד הדלת). שים לב למקום בטנק — ' + CAP + ' מקומות, והסיר תופס שניים.' + (q('m3').rainOn ? ' ובגשם — עקוף את רחוב הבנים, הוא מוצף.' : ''),
      m4: () => ({
        load: 'הארגז עם החנוכייה מחכה בחצר שלנו, הגנרטור אצל רועי בסונול. מעמיסים — ופורקים ליד רחבת השחר.',
        cables: 'עכשיו שלושה כבלים — לכל נקודת חיבור עם נורה אדומה.',
        light: 'הכול מחובר. לך לחנוכייה ותדליק!',
        fault: 'צריך נתיך!', wait: 'העזרה בדרך. תחזיק מעמד!', arriving: 'הנה הם מגיעים עם הנתיך!', shop: 'סע לדוכן בתחנת סונול וקנה נתיך.', fix: 'יש נתיך — לך לחנוכייה!', ceremony: 'שמח!',
      }[q('m4').step]),
      secret: () => 'ר׳ זלמן מחכה. בלי לחץ.',
    };
    const OFFER = {
      m2: (retry) => ({
        a: { s: 'npc', t: retry ? 'ננסה שוב את המניין? הפעם נתכנן טוב יותר.' : 'שבת מתקרבת! ובבית הכנסת יש רק שמונה מתפללים — חסרים שניים למניין.', go: 'b' },
        b: { s: 'npc', t: 'אברהם הזקן יושב בפארק השחר, והוא כבר לא הולך מהר. ושמעון נתקע בתחנת סונול — האוטו שלו התקלקל.', go: 'c' },
        c: {
          s: 'npc', t: 'אסוף אותם בטנק והורד מול בית הכנסת. אם יש מתנדב פנוי — אפשר לשלוח אותו ללוות אחד מהם, אבל ברגל זה לוקח זמן. ארבע וחצי דקות עד השקיעה.',
          c: [{ t: 'יוצאים לדרך!', fx: startM2 }, { t: 'עוד רגע', go: 'd' }],
        },
        d: { s: 'npc', t: 'אל תתעכב יותר מדי — השמש לא מחכה.' },
      }),
      m3: (retry) => ({
        a: { s: 'npc', t: retry ? 'ננסה שוב את שולחן השבת? הסטודנטים עדיין מחכים.' : 'הסטודנטים שמתאספים ב״הבאר — מקום לצעירים״ עושים שבת ראשונה ביחד — ואין להם כלום. נארגן להם שולחן שבת, בלי קבלה: הכול במתנה.', go: 'b' },
        b: { s: 'npc', t: 'צריך ארבעה דברים: חלות ונרות שבת מהמכולת של מר כהן, מיץ ענבים מרועי בסונול, וסיר צ׳ולנט מהמטבח שלנו.', go: 'c' },
        c: {
          s: 'npc', t: 'בטנק יש ' + CAP + ' מקומות, והסיר תופס שניים — תכנן. ואומרים שיהיה גשם. שש דקות עד כניסת שבת.',
          c: [{ t: 'יוצאים!', fx: startM3 }, { t: 'עוד רגע', go: 'd' }],
        },
        d: { s: 'npc', t: 'אני פה כשתהיה מוכן.' },
      }),
      m4: (retry) => ({
        a: { s: 'npc', t: retry ? 'ננסה שוב את ההדלקה? הפעם החנוכייה תדלק, אני מרגיש.' : 'חנוכה! הערב מדליקים חנוכייה ענקית ברחבת השחר — כל השכונה מוזמנת.', go: 'b' },
        b: { s: 'npc', t: 'הארגז עם החנוכייה מחכה בחצר שלנו, והגנרטור — בתחנת סונול. מעמיסים על הטנק, פורקים ליד הרחבה, מחברים כבלים... ומדליקים.', go: 'c' },
        c: {
          s: 'npc', t: 'יש לך שבע דקות עד שהאנשים מגיעים. ובחנוכה — תמיד יש נס קטן ברגע האחרון.',
          c: [{ t: 'נדליק את העיר!', fx: startM4 }, { t: 'עוד רגע', go: 'd' }],
        },
        d: { s: 'npc', t: 'החנוכייה מחכה.' },
      }),
    };
    const PT_OFFER = () => ({
      a: { s: 'npc', t: 'יש לי בקשה גדולה. ר׳ מנחם, השליח בפתח תקווה, צריך יד: השוק לפני שבת, ביקור חולים בשניידר, ומצות לכל העיר לקראת פסח.', go: 'b' },
      b: {
        s: 'npc', t: 'תיסע אליו עם הטנק? פה בהוד השרון הכול מסודר — ותמיד אפשר לחזור, מתפריט ההשהיה.',
        c: [
          { t: 'יוצא לפתח תקווה!', fx: () => api.travel('pt') },
          { t: 'עוד קצת פה, ואז אסע', fx: () => { S().flags.ptUnlocked = true; api.toast('אפשר לנסוע לפתח תקווה מתפריט ההשהיה (' + (isTouch ? 'כפתור השהיה' : 'Esc') + ')', 'gold'); } },
        ],
      },
    });
    function mosheDialog() {
      const a = activeId();
      if (a) return { a: { s: 'npc', t: HINT[a]() + (a !== 'secret' ? ' נשארו ' + api.fmtTime(q(a).timeLeft) + '.' : '') } };
      const nx = nextQuest();
      if (nx && available(nx)) return OFFER[nx](q(nx).status === 'failed');
      if (q('secret').status === 'idle') return { a: { s: 'npc', t: 'ר׳ זלמן... עוד לא הלכת אליו? אין לחץ — אבל הוא מחכה.', c: [{ t: 'אני הולך עכשיו.', fx: startSecret }, { t: 'עוד מעט' }] } };
      if (S().chabadLevel === 3 && M.canUpgrade(4)) return { a: { s: 'npc', t: 'שמעתי מה עשית בפתח תקווה — השוק, שניידר, והסדר לכל השכונה! הגיע הזמן: נהפוך את בית חב״ד ל״מרכז השליחות הגדול״, בהשראת 770. היכנס בדלת!' } };
      if (S().chabadLevel === 4) return { a: { s: 'npc', t: 'תסתכל על החזית הזאת... 770 בהוד השרון! מכאן יוצאים שלוחים לכל הארץ. ר׳ מנחם שולח ד״ש.' } };
      if (done('m4') && S().flags.ptUnlocked) return { a: { s: 'npc', t: 'ר׳ מנחם מחכה לך בפתח תקווה! נוסעים מתפריט ההשהיה. ' + (S().chabadLevel < 3 ? 'ואל תשכח לשדרג את בית חב״ד למרכז קהילתי — היכנס בדלת.' : 'אני שומר פה על הבית.') } };
      if (done('m4') && S().chabadLevel < 3) return { a: { s: 'npc', t: 'ראית את הכיכר? כל העיר מוארת! עכשיו הזמן להפוך את בית חב״ד למרכז קהילתי — היכנס בדלת.' } };
      if (done('m4') && !done('secret') && S().community < 6) return { a: { s: 'npc', t: 'השכונה מתעוררת. תמשיך להכיר אנשים — לפעמים דווקא השיחה הקטנה פותחת את הדלת הגדולה.' } };
      if (done('secret')) return { a: { s: 'npc', t: 'עשית פה עולם ומלואו, שליח. ר׳ זלמן חזר, יש מניין, יש שולחן שבת ויש אור בכיכר. ועכשיו — ר׳ מנחם מחכה לך בפתח תקווה.' } };
      return { a: { s: 'npc', t: 'איזה שבוע! תסתובב קצת, תגיד שלום לאנשים.' } };
    }
    function mosheIcon() {
      if (activeId()) return 'hint';
      const nx = nextQuest();
      if (nx && available(nx)) return 'mission';
      if (q('secret').status === 'idle') return 'mission';
      if (done('m4') && S().chabadLevel < 3) return 'star';
      if (S().chabadLevel === 3 && M.canUpgrade(4)) return 'star';
      return null;
    }

    // ================= דיאלוגים של דמויות =================
    function npcDialog(n) {
      const id = n.id, a = activeId();
      if (cer && CROWD_IDS.includes(id)) return { a: { s: 'npc', t: 'חג אורים שמח! תראה כמה אור!' } };
      if (id === 'avraham' || id === 'shimon') {
        if (a === 'm2' && q('m2').pass[id] === 'waiting') return dlgPassenger(id);
        return { a: { s: 'npc', t: 'שבת שלום, שליח! תודה על המניין.' } };
      }
      if (id === 'alon' || id === 'maya') {
        if (a === 'm3') {
          const st = q('m3'), left = NEEDED.filter((x) => !st.delivered[x]).map((x) => ITEMS[x].name);
          return { a: { s: 'npc', t: 'אתה מביא לנו שבת? מדהים! עוד חסר: ' + left.join(', ') + '. תעצור עם הטנק מול ״הבאר״.' } };
        }
        if (done('m3')) return { a: { s: 'npc', t: id === 'alon' ? 'השבת הכי טובה שהייתה לנו בהוד השרון. אני בפנים — מתנדב!' : 'הדלקתי נרות שבת בפעם הראשונה. תודה.' } };
        return { a: { s: 'npc', t: 'היי! אנחנו סטודנטים, מתאספים פה ב״הבאר״. השבוע זאת השבת הראשונה שלנו בעיר.' } };
      }
      if (id === 'zalman') return dlgZalman();
      if (a === 'm3' && id === 'cohen') {
        const promised = S().flags.cohenChallot ? 'הבטחתי חלות לשבת — ומה שמבטיחים, מקיימים! ' : '';
        return dlgShop('שבת לסטודנטים? בשמחה, ובלי קבלה! ' + promised, ['challah', 'candles', 'bamba']);
      }
      if (a === 'm3' && id === 'roi') return dlgShop('מיץ ענבים לקידוש של סטודנטים? על חשבון הבית!', ['juice', 'energy']);
      return null;
    }
    function iconFor(n) {
      const a = activeId(), id = n.id;
      if (a === 'm2' && PASS.includes(id) && q('m2').pass[id] === 'waiting') return 'alert';
      if (a === 'm3') {
        const st = q('m3');
        const need = (x) => !st.delivered[x] && !st.cargo.includes(x);
        if (id === 'cohen' && (need('challah') || need('candles'))) return 'alert';
        if (id === 'roi' && need('juice')) return 'alert';
      }
      if (a === 'secret' && id === 'zalman') return 'star';
      return null;
    }

    // ================= אינטראקציות =================
    function vanAction() {
      const a = activeId();
      if (a === 'm2') {
        const st = q('m2');
        for (const id of PASS) {
          const n = N(id);
          if (st.pass[id] === 'waiting' && Math.hypot(n.x - van.x, n.z - van.z) < 7) return { label: 'לאסוף את ' + n.def.name, run: () => pickup(id), x: n.x, z: n.z };
        }
        if (PASS.some((p) => st.pass[p] === 'inVan') && inZone(ZONES.shul)) return { label: 'להוריד את הנוסעים ליד בית הכנסת', run: dropoff };
      }
      if (a === 'm3' && q('m3').cargo.length && inZone(ZONES.dorm)) return { label: 'למסור את המצרכים לסטודנטים', run: deliver };
      if (a === 'm4') {
        const st = q('m4');
        if ((st.menorah === 'van' || st.gen === 'van') && inZone(ZONES.plaza)) return { label: 'לפרוק בכיכר', run: unloadM4 };
      }
      return null;
    }
    function interactables() {
      const a = activeId(), out = [];
      if (a === 'm3') {
        const st = q('m3');
        if (!st.delivered.cholent && !st.cargo.includes('cholent'))
          out.push({
            x: P.kitchen.x, z: P.kitchen.z, r: 2.2, label: 'לקחת את סיר הצ׳ולנט מהמטבח',
            run: () => {
              if (!vanNear()) return api.toast('הסיר כבד! צריך את הטנק קרוב');
              const r = addItem('cholent');
              api.toast(r === 'ok' ? 'סיר הצ׳ולנט בטנק! (' + cargoSlots() + '/' + CAP + ')' : 'אין מקום בטנק — הסיר תופס 2 מקומות. תמסור קודם.', r === 'ok' ? 'gold' : '');
            },
          });
      }
      if (a === 'm4') {
        const st = q('m4');
        if (st.menorah === 'home') out.push({ x: crate.position.x, z: crate.position.z, r: 2.2, label: 'להעמיס את החנוכייה על הטנק', run: () => loadM4('menorah') });
        if (st.gen === 'home') out.push({ x: genHome.position.x, z: genHome.position.z, r: 2.2, label: 'להעמיס את הגנרטור על הטנק', run: () => loadM4('gen') });
        if (st.step === 'cables') JUNCS.forEach((j, i) => { if (!st.cables[i]) out.push({ x: j.x, z: j.z, r: 1.8, label: 'לחבר כבל', run: () => connect(i) }); });
        if (st.step === 'light' || st.step === 'fix') out.push({ x: MX, z: MZ, r: 2.8, label: st.step === 'fix' ? 'להחליף נתיך ולהדליק!' : 'להדליק את החנוכייה', run: tryLight });
        if (st.step === 'shop') out.push({ x: P.kiosk.x, z: P.kiosk.z, r: 2.4, label: 'לקנות נתיך בדוכן', run: () => { st.step = 'fix'; A.load(); api.toast('יש נתיך! חזרה לרחבה — מהר', 'gold'); } });
      }
      return out;
    }

    // ================= ניווט, מפה ומעקב =================
    function navTarget() {
      const a = activeId();
      const near = (list) => {
        let b = null, bd = 1e9;
        for (const p of list) {
          const d = Math.hypot(p.x - player.x, p.z - player.z);
          if (d < bd) {
            bd = d;
            b = p;
          }
        }
        return b;
      };
      if (a === 'm2') {
        const st = q('m2');
        const waiting = PASS.filter((p) => st.pass[p] === 'waiting').map(N);
        const anyIn = PASS.some((p) => st.pass[p] === 'inVan');
        if (anyIn) return near(waiting.concat([ZONES.shul]));
        return near(waiting);
      }
      if (a === 'm3') {
        const st = q('m3');
        const missing = NEEDED.filter((x) => !st.delivered[x] && !st.cargo.includes(x));
        const fits = missing.some((x) => cargoSlots() + ITEMS[x].slots <= CAP);
        if (st.cargo.length && (!missing.length || !fits)) return ZONES.dorm;
        const src = [];
        if (missing.includes('challah') || missing.includes('candles')) src.push(N('cohen'));
        if (missing.includes('juice')) src.push(N('roi'));
        if (missing.includes('cholent')) src.push(P.kitchen);
        return near(src) || (st.cargo.length ? ZONES.dorm : null);
      }
      if (a === 'm4') {
        const st = q('m4');
        if (st.step === 'load') {
          const src = [];
          if (st.menorah === 'home') src.push(crate.position);
          if (st.gen === 'home') src.push(genHome.position);
          if (src.length) return near(src);
          return ZONES.plaza;
        }
        if (st.step === 'cables') return near(JUNCS.filter((j, i) => !st.cables[i]));
        if (st.step === 'shop') return P.kiosk;
        if (st.step === 'light' || st.step === 'fix') return P.menorah;
        return null;
      }
      if (a === 'secret') return N('zalman');
      return null;
    }
    function mapDots(dot) {
      const t = navTarget();
      if (t) dot(t.x, t.z, 5, 'rgba(255,210,63,0.9)', '#13213f');
      if (q('m4').status === 'complete') dot(MX, MZ, 3, '#ffd23f');
    }
    function trackerHTML() {
      const a = activeId();
      if (a) {
        const st = q(a);
        let h = '<div class="tr-title">' + TITLES[a] + '</div>';
        if (a !== 'secret') {
          const tl = Math.max(0, st.timeLeft);
          h += '<div class="tr-timer' + (tl < 60 ? ' low' : '') + '">⏱ ' + api.fmtTime(tl) + '</div>';
        }
        h += '<ul class="tr-list">';
        const row = (label, state, cls) => (h += '<li class="' + (cls || '') + '"><span>' + label + '</span><em>' + state + '</em></li>');
        if (a === 'm2') {
          const L = { waiting: 'ממתין', inVan: 'בטנק 🚐', walking: 'נכנס...', volunteer: 'עם מתנדב · ' + 0, arrived: '✓ הגיע' };
          for (const id of PASS) {
            let s = L[st.pass[id]];
            if (st.pass[id] === 'volunteer') s = 'עם מתנדב · ' + Math.max(0, Math.ceil(st.eta[id] - st.elapsed));
            row(N(id).def.name + ' <small>' + N(id).def.role + '</small>', s, st.pass[id] === 'arrived' ? 'ok' : st.pass[id] === 'volunteer' ? 'later' : '');
          }
          row('מתנדבים פנויים', String(Math.max(0, volAvail())), 'no');
        } else if (a === 'm3') {
          for (const id of NEEDED) row(ITEMS[id].name + (ITEMS[id].slots > 1 ? ' <small>2 מקומות</small>' : ''), st.delivered[id] ? '✓ נמסר' : st.cargo.includes(id) ? 'בטנק 🚐' : 'חסר', st.delivered[id] ? 'ok' : st.cargo.includes(id) ? 'later' : '');
          row('מקום בטנק', cargoSlots() + '/' + CAP, 'no');
        } else if (a === 'm4') {
          const s = st.step;
          const ld = (v) => (v === 'home' ? 'להעמיס' : v === 'van' ? 'בטנק 🚐' : '✓ בכיכר');
          row('חנוכייה', ld(st.menorah), st.menorah === 'placed' ? 'ok' : '');
          row('גנרטור', ld(st.gen), st.gen === 'placed' ? 'ok' : '');
          row('כבלים', st.cables.filter(Boolean).length + '/3', st.cables.every(Boolean) ? 'ok' : '');
          row('הדלקה', { load: '—', cables: '—', light: 'מוכן!', fault: 'תקלה!', wait: 'נתיך בדרך · ' + Math.max(0, Math.ceil(st.fuseEta - st.elapsed)), arriving: 'מגיעים...', shop: 'לקנות נתיך', fix: 'מוכן!', ceremony: '🕎' }[s], s === 'ceremony' ? 'ok' : '');
        } else if (a === 'secret') {
          h += '</ul><div class="tr-obj">בקרו את ר׳ זלמן. בלי שעון — רק ללכת.</div>';
          return h;
        }
        return h + '</ul><div class="tr-obj">' + HINT[a]() + '</div>';
      }
      const nx = nextQuest();
      if (nx) {
        if (!available(nx)) return '<div class="tr-title">' + TITLES[nx] + '</div><div class="tr-obj">נפתח בקרוב</div>';
        return '<div class="tr-title">' + TITLES[nx] + (q(nx).status === 'failed' ? ' <small>(ניסיון נוסף)</small>' : '') + '</div><div class="tr-obj">דברו עם <b>משה</b> ליד בית חב״ד <span class="ic blue">!</span></div>';
      }
      if (q('secret').status === 'idle') return '<div class="tr-title">' + TITLES.secret + '</div><div class="tr-obj">ר׳ זלמן מחכה. משה יודע איפה.</div>';
      let h = '<div class="tr-title done">✓ כל ארבע המשימות הושלמו!</div>';
      if (S().chabadLevel < 3) h += '<div class="tr-obj">היכנסו לבית חב״ד ושדרגו אותו למרכז קהילתי <span class="ic">★</span></div>';
      else if (!done('secret')) h += '<div class="tr-obj">השכונה מתעוררת... אולי עוד מישהו מחכה לכם.</div>';
      else if (S().chabadLevel === 3 && M.canUpgrade(4)) h += '<div class="tr-obj">היכנסו לבית חב״ד ושדרגו ל״מרכז השליחות הגדול״ <span class="ic">★</span></div>';
      else if (S().chabadLevel >= 4) h += '<div class="tr-obj">🏛 770 בהוד השרון! מכאן יוצאים שלוחים לכל הארץ.</div>';
      else if (['pesach', 'pt3'].some((id) => S().quests[id] && S().quests[id].status === 'complete')) h += '<div class="tr-obj">פרק 2 הושלם. ' + (S().chabadLevel < 3 ? 'שדרגו קודם את בית חב״ד למרכז קהילתי.' : '') + '</div>';
      else h += '<div class="tr-obj">פרק 2 מחכה: ר׳ מנחם בפתח תקווה. נוסעים מתפריט ההשהיה (' + (isTouch ? 'כפתור השהיה' : 'Esc') + ').</div>';
      return h;
    }

    // ================= עדכון בכל פריים =================
    let rain = 0, prevJoyQuest = null;
    function applyVisibility() {
      const a = activeId();
      for (const id of PASS) N(id).hidden = !(a === 'm2' && q('m2').pass[id] === 'waiting') && !N(id).ctrl;
      const z = N('zalman');
      z.hidden = !(q('secret').status === 'active' || done('secret'));
      if (done('secret') && z.def.x !== P.zalmanAfter.x) {
        z.def.x = P.zalmanAfter.x;
        z.def.z = P.zalmanAfter.z;
        z.def.rot = P.zalmanAfter.rot || 0;
      }
      if (!cer) {
        if (done('secret')) home(z);
      }
    }
    const M = {
      rain: 0,
      onGain(kind, n) {
        const a = activeId();
        if (a && a !== 'secret') q(a)[kind === 'joy' ? 'joy' : 'comm'] += n;
      },
      timeRate() {
        if (cer) return 0;
        return activeId() && activeId() !== 'secret' ? 0.5 : 2;
      },
      driveMods(v) {
        let max = 1, grip = 1;
        if (rain > 0.3) grip = 0.78;
        if (rain > 0.3 && inFlood(v)) {
          max = 0.28;
          const st = q('m3');
          if (!st.floodTip && st.status === 'active') {
            st.floodTip = true;
            A.splash();
            api.toast('שלולית ענקית! רחוב הבנים מוצף — עקפו ברחובות הצדדיים', 'gold');
          }
        }
        return { max, grip };
      },
      obstacles(out) {
        const st = q('m4');
        if (crate.visible) out.push({ x: crate.position.x, z: crate.position.z, r: 0.8 });
        if (genHome.visible) out.push({ x: genHome.position.x, z: genHome.position.z, r: 0.75 });
        if (menorah.g.visible) out.push({ x: MX, z: MZ, r: 1.2 });
        if (genPlaced.visible) out.push({ x: genAt.x, z: genAt.z, r: 0.75 });
        if (juncGroup.visible) for (const j of JUNCS) out.push({ x: j.x, z: j.z, r: 0.25 });
        return st;
      },
      fadePoints() {
        if (menorah.g.visible && Math.hypot(player.x - MX, player.z - MZ) < 24) return [{ x: MX, z: MZ }];
        return [];
      },
      // משימה חדשה שמשה יכול להציע בטלפון
      callOffer() {
        if (activeId()) return null;
        const nx = nextQuest();
        if (nx && available(nx) && q(nx).status !== 'failed') return { id: nx, nodes: OFFER[nx](false) };
        // אחרי ״האור הגדול״ (ואחרי ר׳ זלמן, אם הגיע תורו): פרק 2 — פתח תקווה
        const sc = q('secret').status;
        if (!nx && !S().flags.ptUnlocked && (sc === 'complete' || sc === 'idle' || !available('secret'))) return { id: 'pt', nodes: PT_OFFER() };
        return null;
      },
      canUpgrade(lv) {
        // דרגה 4: אחרי פרק 2 (הסדר המשותף בסוף משימת המצות; או ספר התורה בשמירות ישנות)
        if (lv === 4) return S().chabadLevel >= 3 && ['pesach', 'pt3'].some((id) => S().quests[id] && S().quests[id].status === 'complete');
        return lv === 3 && done('m4');
      },
      update(dt) {
        const a = activeId();
        if (a && a !== 'secret') {
          const st = q(a);
          if (!(a === 'm4' && cer)) {
            st.elapsed += dt;
            st.timeLeft -= dt;
          }
          if (a === 'm2') {
            for (const id of PASS) if (st.pass[id] === 'volunteer' && st.elapsed >= st.eta[id]) arriveM2(id);
            if (st.timeLeft <= 0 && q('m2').status === 'active') {
              api.toast('השמש שוקעת...', 'gold');
              completeM2('time');
            }
          } else if (a === 'm3') {
            if (!st.rainOn && st.elapsed > 70) {
              st.rainOn = true;
              api.toast('גשם פתאומי! 🌧 רחוב הבנים הולך ומוצף', 'gold');
            }
            if (st.timeLeft <= 0) {
              api.toast('שבת נכנסה!', 'gold');
              completeM3('time');
            }
          } else if (a === 'm4') {
            if (st.step === 'wait' && st.elapsed >= st.fuseEta) {
              st.step = 'arriving';
              helperArrives();
            }
            if (cer) updateCeremony(dt);
            else if (st.timeLeft <= 0) {
              if (['light', 'fault', 'wait', 'arriving', 'shop', 'fix'].includes(st.step)) {
                if (!st.late) {
                  st.late = true;
                  api.toast('האנשים כבר כאן! עוד רגע מדליקים — לא מוותרים', 'gold');
                }
                st.timeLeft = 0;
              } else {
                api.toast('האנשים הגיעו...', 'gold');
                completeM4('time');
              }
            }
          }
        }
        // מזכרת: המשימה הסודית מתקשרת אחרי ״האור הגדול״
        const sc = q('secret');
        if (sc.status === 'locked' && available('secret') && !a && api.mode === 'play') {
          sc.callT += dt;
          if (sc.callT > 20) {
            sc.status = 'calling';
            phoneCall();
          }
        }
        // גשם
        const want = q('m3').status === 'active' && q('m3').rainOn ? 1 : 0;
        rain = G.moveToward(rain, want, dt * 0.25);
        M.rain = rain;
        A.setRain && A.setRain(rain);
      },
      visuals(dt, t) {
        // קרני יעד
        const a = activeId();
        const st2 = q('m2'), st3 = q('m3'), st4 = q('m4');
        ZONES.shul.beam.visible = a === 'm2' && PASS.some((p) => st2.pass[p] === 'inVan');
        ZONES.dorm.beam.visible = a === 'm3' && st3.cargo.length > 0;
        ZONES.plaza.beam.visible = a === 'm4' && (st4.menorah === 'van' || st4.gen === 'van');
        for (const k in ZONES) {
          const z = ZONES[k];
          z.beam.position.set(z.x, 0, z.z);
          z.beam.children[1].scale.setScalar(1 + Math.sin(t * 4) * 0.05);
        }
        beamMat.opacity = 0.16 + Math.sin(t * 3) * 0.05;
        // גשם ושלוליות
        rainLines.visible = rain > 0.01;
        floodView.material.opacity = rain * 0.55;
        floodView.visible = rain > 0.01;
        if (rainLines.visible) {
          rainMat.opacity = 0.5 * rain;
          const cx = api.camTarget.x, cz = api.camTarget.z;
          for (let i = 0; i < RAIN_N; i++) {
            const d = drops[i];
            d.y -= d.v * dt;
            if (d.y < 0) {
              d.y = 22 + Math.random() * 8;
              d.x = (Math.random() - 0.5) * 90;
              d.z = (Math.random() - 0.5) * 90;
            }
            const x = cx + d.x, z = cz + d.z, o = i * 6;
            rainPos[o] = x;
            rainPos[o + 1] = d.y;
            rainPos[o + 2] = z;
            rainPos[o + 3] = x - 0.15;
            rainPos[o + 4] = d.y - 0.9;
            rainPos[o + 5] = z - 0.15;
          }
          rainGeo.attributes.position.needsUpdate = true;
        }
        // להבות מרצדות
        for (let i = 0; i < menorah.flames.length; i++) {
          const f = menorah.flames[i];
          if (!f.f.visible) continue;
          const s = 1 + Math.sin(t * 13 + i * 1.7) * 0.15;
          f.f.scale.set(1, s, 1);
          f.gl.material.opacity = 0.8 + Math.sin(t * 9 + i) * 0.2;
        }
        for (const sp of sparks) {
          if (sp.life <= 0) continue;
          sp.life -= dt;
          sp.vy -= 4 * dt;
          sp.s.position.x += sp.vx * dt;
          sp.s.position.y += sp.vy * dt;
          sp.s.position.z += sp.vz * dt;
          if (sp.life <= 0) sp.s.visible = false;
        }
      },
      mosheDialog, mosheIcon, npcDialog, iconFor, vanAction, interactables, navTarget, mapDots, trackerHTML,
      activeQuest: () => activeId(),
    };

    // ================= החלת מצב שמור =================
    (function applyLoaded() {
      // משימה פעילה שנקטעה באמצע אנימציה — מסדרים אותה
      const s2 = q('m2');
      for (const id of PASS) if (s2.pass[id] === 'walking') s2.pass[id] = 'arrived';
      if (s2.status === 'complete' && PASS.every((p) => s2.pass[p] === 'arrived')) shulLights.visible = true;
      if (done('m3') && NEEDED.filter((x) => q('m3').delivered[x]).length >= 3) W.dormTable.visible = true;
      const s4 = q('m4');
      if (s4.status === 'active' && ['ceremony', 'arriving', 'wait'].includes(s4.step)) s4.step = 'fix';
      if (q('secret').status === 'calling') q('secret').status = 'idle';
      resetM4Visuals();
      applyVisibility();
    })();
    return M;
  };
})();
