// תנועת רכבים: מכוניות ואוטובוסים שנוסעים ברשת הרחובות האמיתית, בצד ימין,
// מכבדים רחובות חד-סטריים, עוצרים לפני הולכי רגל ורכבים, ופונים בצמתים
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeTraffic = function (api) {
    const { scene, W, A, player } = api;
    if (!W.roadList) return null;
    const rnd = G.rng(9090);

    // ---------- גרף כבישים ----------
    const nodes = new Map(), N = [];
    const key = (x, z) => Math.round(x * 2) + ',' + Math.round(z * 2);
    const node = (x, z) => {
      const k = key(x, z);
      let n = nodes.get(k);
      if (!n) {
        n = { x, z, out: [] };
        nodes.set(k, n);
        N.push(n);
      }
      return n;
    };
    for (const r of W.roadList) {
      if (r.cls === 'path' || r.t === 'service' || r.t === 'living_street' || r.t === 'track') continue;
      const speed = r.cls === 'major' ? 13 : 9;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = node(r.pts[i][0], r.pts[i][1]), b = node(r.pts[i + 1][0], r.pts[i + 1][1]);
        if (a === b) continue;
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        a.out.push({ from: a, to: b, len, w: r.w, speed });
        if (!r.oneway) b.out.push({ from: b, to: a, len, w: r.w, speed });
      }
    }
    const edges = [];
    for (const n of N) for (const e of n.out) edges.push(e);
    if (!edges.length) return null;

    // ---------- רמזורים ומעברי חצייה בצמתים ראשיים ----------
    for (const e of edges) (e.to.inc || (e.to.inc = [])).push(e);
    const axisOf = (e) => (Math.abs(e.to.z - e.from.z) >= Math.abs(e.to.x - e.from.x) ? 0 : 1);
    const signals = [];
    const lampOff = { r: 0x3a1010, y: 0x3a3010, g: 0x103a14 }, lampOn = { r: 0xff3030, y: 0xffc020, g: 0x30ff60 };
    const zebraTex = G.canvasTex(16, 32, (g) => {
      g.clearRect(0, 0, 16, 32);
      g.fillStyle = '#eeeae0';
      for (let y = 2; y < 32; y += 8) g.fillRect(1, y, 14, 4);
    });
    const zPos = [], zUv = [];
    for (const n of N) {
      const inc = n.inc || [];
      const roadsHere = new Set(inc.map((e) => e.from)).size + new Set(n.out.map((e) => e.to)).size;
      if (roadsHere < 3 || !inc.some((e) => e.speed > 9)) continue;
      if (signals.some((s) => Math.hypot(s.n.x - n.x, s.n.z - n.z) < 30)) continue;
      const axes = new Set(inc.map(axisOf));
      if (axes.size < 2) continue;
      const sig = { n, offset: rnd() * 16, heads: [], grp: new T.Group() };
      scene.add(sig.grp);
      n.signal = sig;
      signals.push(sig);
      // עמוד בפינה, עם ראש לכל ציר
      const e0 = inc.find((e) => e.speed > 9) || inc[0];
      const dx = (e0.to.x - e0.from.x) / e0.len, dz = (e0.to.z - e0.from.z) / e0.len;
      const px = n.x - dz * (e0.w / 2 + 1.0) - dx * (e0.w / 2 + 1.5), pz = n.z + dx * (e0.w / 2 + 1.0) - dz * (e0.w / 2 + 1.5);
      const pole = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, 4.2, 6), new T.MeshLambertMaterial({ color: 0x3a3f46 }));
      pole.position.set(px, 2.1, pz);
      pole.castShadow = true;
      sig.grp.add(pole);
      W.addCircle(px, pz, 0.25);
      for (const ax of [0, 1]) {
        const head = new T.Group();
        head.position.set(px, 3.4, pz);
        head.rotation.y = ax === 0 ? 0 : Math.PI / 2;
        const housing = new T.Mesh(new T.BoxGeometry(0.34, 1.0, 0.24), new T.MeshLambertMaterial({ color: 0x1e2226 }));
        head.add(housing);
        const L = {};
        ['r', 'y', 'g'].forEach((k, i) => {
          const mat = new T.MeshBasicMaterial({ color: lampOff[k] });
          for (const side of [1, -1]) {
            const m = new T.Mesh(new T.BoxGeometry(0.18, 0.18, 0.04), mat);
            m.position.set(0, 0.3 - i * 0.3, side * 0.13);
            head.add(m);
          }
          L[k] = mat;
        });
        sig.grp.add(head);
        sig.heads[ax] = L;
      }
      // מעברי חצייה על כל כביש שנכנס לצומת
      for (const e of inc) {
        const ux = (e.to.x - e.from.x) / e.len, uz = (e.to.z - e.from.z) / e.len;
        if (e.len < 9) continue;
        const cx = n.x - ux * 6, cz = n.z - uz * 6, hw = e.w / 2 + 0.3, hl = 1.3;
        const vx = -uz, vz = ux;
        const P = [[cx - ux * hl - vx * hw, cz - uz * hl - vz * hw], [cx + ux * hl - vx * hw, cz + uz * hl - vz * hw], [cx + ux * hl + vx * hw, cz + uz * hl + vz * hw], [cx - ux * hl + vx * hw, cz - uz * hl + vz * hw]];
        const U = [[0, 0], [1, 0], [1, (hw * 2) / 3], [0, (hw * 2) / 3]];
        for (const k of [0, 2, 1, 0, 3, 2]) {
          zPos.push(P[k][0], 0.05, P[k][1]);
          zUv.push(U[k][0], U[k][1]);
        }
      }
    }
    if (zPos.length) {
      const zg = new T.BufferGeometry();
      zg.setAttribute('position', new T.Float32BufferAttribute(zPos, 3));
      zg.setAttribute('uv', new T.Float32BufferAttribute(zUv, 2));
      zg.computeVertexNormals();
      const zm = new T.Mesh(zg, new T.MeshLambertMaterial({ map: zebraTex, alphaTest: 0.5, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, depthWrite: false }));
      zm.renderOrder = 5;
      zm.receiveShadow = true;
      scene.add(zm);
    }
    // מחזור: ציר 0 ירוק 7 שנ׳, צהוב 1.5, ציר 1 ירוק 7, צהוב 1.5
    let sigClock = 0;
    const PERIOD = 17;
    const stateOf = (sig, ax) => {
      const t = (sigClock + sig.offset) % PERIOD, half = PERIOD / 2;
      const local = ax === 0 ? t : (t + half) % PERIOD;
      return local < 7 ? 'g' : local < 8.5 ? 'y' : 'r';
    };
    let sigVisT = 0;
    function updateSignals(dt) {
      sigClock += dt;
      // רמזורים רחוקים מוסתרים (בעיר גדולה יש מאות)
      if ((sigVisT -= dt) <= 0) {
        sigVisT = 0.5;
        for (const s of signals) s.grp.visible = Math.hypot(s.n.x - player.x, s.n.z - player.z) < 320;
      }
      for (const s of signals)
        if (s.grp.visible)
        for (const ax of [0, 1]) {
          const st = stateOf(s, ax), L = s.heads[ax];
          for (const k of ['r', 'y', 'g']) L[k].color.setHex(k === st ? lampOn[k] : lampOff[k]);
        }
    }

    // ---------- מודלים (מופעים) ----------
    const carGeo = G.mergeParts([
      { w: 1.8, h: 0.72, d: 3.9, y: 0.68, c: '#ffffff' },
      { w: 1.64, h: 0.46, d: 2.04, y: 1.27, z: -0.2, c: '#26303d' },
      { w: 1.62, h: 0.12, d: 1.92, y: 1.55, z: -0.2, c: '#ffffff' },
      { w: 0.36, h: 0.16, d: 0.05, x: -0.6, y: 0.85, z: 1.96, c: '#fff1c4' },
      { w: 0.36, h: 0.16, d: 0.05, x: 0.6, y: 0.85, z: 1.96, c: '#fff1c4' },
      { w: 0.32, h: 0.16, d: 0.05, x: -0.62, y: 0.85, z: -1.96, c: '#d62828' },
      { w: 0.32, h: 0.16, d: 0.05, x: 0.62, y: 0.85, z: -1.96, c: '#d62828' },
      { w: 0.26, h: 0.62, d: 0.62, x: -0.86, y: 0.31, z: 1.25, c: '#151515' },
      { w: 0.26, h: 0.62, d: 0.62, x: 0.86, y: 0.31, z: 1.25, c: '#151515' },
      { w: 0.26, h: 0.62, d: 0.62, x: -0.86, y: 0.31, z: -1.25, c: '#151515' },
      { w: 0.26, h: 0.62, d: 0.62, x: 0.86, y: 0.31, z: -1.25, c: '#151515' },
    ]);
    const busGeo = G.mergeParts([
      { w: 2.5, h: 2.6, d: 11, y: 1.75, c: '#f2f2ee' },
      { w: 2.52, h: 0.9, d: 10.6, y: 2.1, c: '#2a3646' },
      { w: 2.52, h: 0.35, d: 11.02, y: 0.85, c: '#2e9d5f' },
      { w: 2.2, h: 1.0, d: 0.05, y: 2.0, z: 5.51, c: '#2a3646' },
      { w: 1.8, h: 0.35, d: 0.05, y: 2.85, z: 5.52, c: '#ffd23f' },
      { w: 0.3, h: 0.8, d: 0.8, x: -1.15, y: 0.4, z: 3.6, c: '#151515' },
      { w: 0.3, h: 0.8, d: 0.8, x: 1.15, y: 0.4, z: 3.6, c: '#151515' },
      { w: 0.3, h: 0.8, d: 0.8, x: -1.15, y: 0.4, z: -3.6, c: '#151515' },
      { w: 0.3, h: 0.8, d: 0.8, x: 1.15, y: 0.4, z: -3.6, c: '#151515' },
    ]);
    const mat = new T.MeshLambertMaterial({ vertexColors: true });
    const NCAR = 36, NBUS = 3;
    // לאוטובוסים חומר נפרד וצבע בסיס לבן — חומר משותף בלי צבע מופע יצא שחור לגמרי
    const busMat = new T.MeshLambertMaterial({ vertexColors: true });
    const carIM = new T.InstancedMesh(carGeo, mat, NCAR), busIM = new T.InstancedMesh(busGeo, busMat, NBUS);
    carIM.castShadow = busIM.castShadow = true;
    carIM.frustumCulled = busIM.frustumCulled = false;
    scene.add(carIM, busIM);
    const COLS = [0xc0392b, 0x2980b9, 0x16a085, 0xf39c12, 0x8e44ad, 0x7f8c8d, 0xecf0f1, 0x2c3e50, 0xbdc3c7, 0x34495e, 0xd35400, 0xf5f5f5, 0x1a1a1a, 0x95a5a6];
    const col = new T.Color();
    const cars = [];
    for (let i = 0; i < NCAR + NBUS; i++) {
      const bus = i >= NCAR;
      const c = { bus, idx: bus ? i - NCAR : i, e: null, t: 0, v: 0, x: 0, z: 0, h: 0, stuck: 0, ghost: 0, wait: 0, len: bus ? 11 : 3.9 };
      if (!bus) carIM.setColorAt(c.idx, col.set(COLS[(rnd() * COLS.length) | 0]));
      else busIM.setColorAt(c.idx, col.set(0xffffff));
      cars.push(c);
    }
    carIM.instanceColor.needsUpdate = true;
    busIM.instanceColor.needsUpdate = true;

    // ---------- מיקום והצבה ----------
    const lane = (e) => Math.min(e.w / 4, 1.8);
    function place(c) {
      const e = c.e, dx = (e.to.x - e.from.x) / e.len, dz = (e.to.z - e.from.z) / e.len, L = lane(e);
      c.dx = dx;
      c.dz = dz;
      c.x = e.from.x + dx * c.t - dz * L;
      c.z = e.from.z + dz * c.t + dx * L;
    }
    // אינדקס קטעים לפי משבצות של 200 מטר — כדי למצוא מהר קטע ליד השחקן גם בעיר גדולה
    const egrid = new Map();
    for (const e of edges) {
      const k = Math.floor(e.from.x / 200) + ',' + Math.floor(e.from.z / 200);
      if (!egrid.has(k)) egrid.set(k, []);
      egrid.get(k).push(e);
    }
    function edgesNear(px, pz) {
      const out = [], cx = Math.floor(px / 200), cz = Math.floor(pz / 200);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const a = egrid.get(cx + i + ',' + (cz + j));
        if (a) for (const e of a) out.push(e);
      }
      return out.length ? out : edges;
    }
    function spawn(c, px, pz, far) {
      const near = edgesNear(px, pz);
      for (let k = 0; k < 40; k++) {
        const e = near[(rnd() * near.length) | 0];
        const d = Math.hypot(e.from.x - px, e.from.z - pz);
        if (d > (far ? 70 : 15) && d < 230 && (!c.bus || e.speed > 9)) {
          c.e = e;
          c.t = rnd() * e.len;
          c.v = e.speed * 0.6;
          place(c);
          c.h = Math.atan2(c.dx, c.dz);
          return;
        }
      }
      c.e = edges[(rnd() * edges.length) | 0];
      c.t = 0;
      place(c);
    }
    function nextEdge(c) {
      const at = c.e.to, back = c.e.from;
      let opts = at.out.filter((e) => e.to !== back);
      if (!opts.length) opts = at.out;
      if (!opts.length) return null;
      // מעדיפים להמשיך ישר, אבל לפעמים פונים
      const h0 = Math.atan2(c.dx, c.dz);
      opts.sort((a, b) => Math.abs(G.wrapAngle(Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z) - h0)) - Math.abs(G.wrapAngle(Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z) - h0)));
      return rnd() < 0.55 ? opts[0] : opts[(rnd() * opts.length) | 0];
    }
    const px0 = player.x, pz0 = player.z;
    for (const c of cars) spawn(c, px0, pz0, false);

    // ---------- עדכון ----------
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), p3 = new T.Vector3(), s3 = new T.Vector3(1, 1, 1), UP = new T.Vector3(0, 1, 0);
    let nearby = 0;
    function update(dt, ctx) {
      updateSignals(dt);
      const px = ctx.px, pz = ctx.pz;
      const obst = [];
      if (!ctx.driving) obst.push({ x: px, z: pz, r: 0.5 });
      for (const v of ctx.vehicles) obst.push({ x: v.x, z: v.z, r: v.P.len / 2 });
      for (const o of cars) obst.push({ x: o.x, z: o.z, r: o.len / 2, car: o });
      nearby = 0;
      for (const c of cars) {
        const e = c.e;
        if (!e) continue;
        if (Math.hypot(c.x - px, c.z - pz) > 260) {
          spawn(c, px, pz, true);
          continue;
        }
        // מה יש לפנינו?
        let ahead = 99;
        if (c.ghost <= 0)
          for (const o of obst) {
            if (o.car === c) continue;
            const rx = o.x - c.x, rz = o.z - c.z;
            const along = rx * c.dx + rz * c.dz, lat = Math.abs(-rx * c.dz + rz * c.dx);
            if (along > 0 && along < 18 && lat < 1.6 + (o.r > 2 ? 0.8 : 0)) ahead = Math.min(ahead, along - c.len / 2 - o.r);
          }
        let target = e.speed;
        if (ahead < 2.2) target = 0;
        else if (ahead < 10) target = Math.min(target, ((ahead - 2.2) / 7.8) * e.speed);
        if (e.len - c.t < 8) target = Math.min(target, 6.5);
        // רמזור: עוצרים לפני קו העצירה כשאדום או צהוב
        const sig = e.to.signal;
        let red = false;
        if (sig) {
          const st = stateOf(sig, axisOf(e)), toStop = e.len - c.t - 8.5;
          if (st !== 'g' && toStop > -1.5) {
            red = true;
            if (toStop < 0.5) target = 0;
            else if (toStop < 14) target = Math.min(target, (toStop / 14) * e.speed);
          }
        }
        c.v = c.v < target ? Math.min(target, c.v + 4 * dt) : Math.max(target, c.v - 10 * dt);
        if (c.wait > 0) {
          c.wait -= dt;
          c.v = 0;
        }
        // תקוע זמן רב מאחורי משהו שלא זז: עוקפים
        if (c.v < 0.3 && target === 0 && !red) c.stuck += dt;
        else c.stuck = Math.max(0, c.stuck - dt);
        if (c.stuck > 5) {
          c.ghost = 2.5;
          c.stuck = 0;
        }
        c.ghost -= dt;
        c.t += c.v * dt;
        let guard = 0;
        while (c.t > c.e.len && guard++ < 4) {
          const n = nextEdge(c);
          if (!n) {
            spawn(c, px, pz, true);
            break;
          }
          c.t -= c.e.len;
          c.e = n;
        }
        place(c);
        c.h = G.lerpAngle(c.h, Math.atan2(c.dx, c.dz), 1 - Math.exp(-7 * dt));
        q4.setFromAxisAngle(UP, c.h);
        p3.set(c.x, 0, c.z);
        m4.compose(p3, q4, s3);
        (c.bus ? busIM : carIM).setMatrixAt(c.idx, m4);
        if (c.v > 2 && Math.hypot(c.x - px, c.z - pz) < 45) nearby++;
      }
      carIM.instanceMatrix.needsUpdate = true;
      busIM.instanceMatrix.needsUpdate = true;
    }
    return {
      update,
      signals: signals.map((s) => ({ x: s.n.x, z: s.n.z })),
      get nearby() {
        return nearby;
      },
      // עיגולי התנגשות לרכבים קרובים לשחקן
      obstacles(out) {
        for (const c of cars) {
          if (!c.e || Math.hypot(c.x - player.x, c.z - player.z) > 40) continue;
          const offs = c.bus ? [-3.8, -1.3, 1.3, 3.8] : [-1.1, 1.1];
          for (const k of offs) out.push({ x: c.x + c.dx * k, z: c.z + c.dz * k, r: c.bus ? 1.3 : 0.95 });
        }
        return out;
      },
      // התנגשות ברכב: הנהג עוצר וצופר
      bumped(v) {
        let best = null, bd = 6;
        for (const c of cars) {
          const d = Math.hypot(c.x - v.x, c.z - v.z);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (best) {
          best.wait = 2.5;
          setTimeout(() => A.beep(), 250);
        }
      },
    };
  };
})();
