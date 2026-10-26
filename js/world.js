// בניית העיר: כבישים, בלוקים, מבנים מיוחדים, פרטי רחוב, תאורה, עצים והתנגשויות
(function () {
  'use strict';
  const G = window.G, T = THREE;

  // איחוד חלקים קטנים לגיאומטריה אחת עם צבעי קודקודים — קריאת ציור אחת לכל מבנה
  // צורות הבסיס נשמרות פעם אחת (קובייה יחידה, גליל, כדור) ורק עוברות טרנספורמציה — מהיר גם לאלפי חלקים
  const _m = new T.Matrix4(), _nm = new T.Matrix3(), _e = new T.Euler(), _c = new T.Color(), _q = new T.Quaternion(), _p = new T.Vector3(), _s = new T.Vector3(), _v = new T.Vector3();
  const baseCache = new Map();
  function baseOf(p) {
    let key, make;
    if (p.g === 'cyl') {
      key = 'c' + p.r + '_' + (p.r2 !== undefined ? p.r2 : p.r) + '_' + p.h + '_' + (p.seg || 8);
      make = () => new T.CylinderGeometry(p.r, p.r2 !== undefined ? p.r2 : p.r, p.h, p.seg || 8);
    } else if (p.g === 'sph') {
      key = 's' + p.r + (p.hemi ? 'h' : '');
      make = () => (p.hemi ? new T.SphereGeometry(p.r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2) : new T.SphereGeometry(p.r, 12, 9));
    } else {
      key = 'box';
      make = () => new T.BoxGeometry(1, 1, 1);
    }
    let b = baseCache.get(key);
    if (!b) {
      const g = make(), ng = g.toNonIndexed();
      b = { pos: ng.attributes.position.array.slice(), nor: ng.attributes.normal.array.slice() };
      g.dispose();
      ng.dispose();
      baseCache.set(key, b);
    }
    return b;
  }
  function mergeParts(parts) {
    let total = 0;
    const bases = parts.map((p) => {
      const b = baseOf(p);
      total += b.pos.length;
      return b;
    });
    const pos = new Float32Array(total), nor = new Float32Array(total), col = new Float32Array(total);
    let o = 0;
    parts.forEach((p, k) => {
      const b = bases[k];
      _e.set(p.rx || 0, p.ry || 0, p.rz || 0);
      _q.setFromEuler(_e);
      _p.set(p.x || 0, p.y || 0, p.z || 0);
      const box = !p.g || p.g === 'box';
      _s.set((p.sx || 1) * (box ? p.w : 1), (p.sy || 1) * (box ? p.h : 1), (p.sz || 1) * (box ? p.d : 1));
      _m.compose(_p, _q, _s);
      _nm.getNormalMatrix(_m);
      _c.set(p.c);
      for (let i = 0; i < b.pos.length; i += 3) {
        _v.set(b.pos[i], b.pos[i + 1], b.pos[i + 2]).applyMatrix4(_m);
        pos[o + i] = _v.x;
        pos[o + i + 1] = _v.y;
        pos[o + i + 2] = _v.z;
        _v.set(b.nor[i], b.nor[i + 1], b.nor[i + 2]).applyMatrix3(_nm).normalize();
        nor[o + i] = _v.x;
        nor[o + i + 1] = _v.y;
        nor[o + i + 2] = _v.z;
        col[o + i] = _c.r;
        col[o + i + 1] = _c.g;
        col[o + i + 2] = _c.b;
      }
      o += b.pos.length;
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    return geo;
  }
  G.mergeParts = mergeParts;

  // גג משופע (רכס לאורך ציר x)
  function gableGeo(L, Wd, rh) {
    const a = L / 2 + 0.35, e = L / 2, b = Wd / 2 + 0.45;
    const P = [], U = [];
    const slope = Math.hypot(b, rh);
    const quad = (q, uv) => {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        P.push(...q[i]);
        U.push(...uv[i]);
      }
    };
    const uv = [[0, 0], [(2 * a) / 4, 0], [(2 * a) / 4, slope / 3.2], [0, slope / 3.2]];
    quad([[-a, 0, b], [a, 0, b], [a, rh, 0], [-a, rh, 0]], uv);
    quad([[a, 0, -b], [-a, 0, -b], [-a, rh, 0], [a, rh, 0]], uv);
    for (const t of [[[e, 0, b - 0.45], [e, 0, -b + 0.45], [e, rh * 0.9, 0]], [[-e, 0, -b + 0.45], [-e, 0, b - 0.45], [-e, rh * 0.9, 0]]])
      for (const p of t) {
        P.push(...p);
        U.push(0, 0);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
    geo.computeVertexNormals();
    geo.addGroup(0, 12, 0);
    geo.addGroup(12, 6, 1);
    return geo;
  }

  G.buildWorld = function (scene) {
    const rnd = G.rng(770);
    const HALF = 78, ROADS = [-72, -36, 0, 36, 72], CENTERS = [-54, -18, 18, 54];
    const W = {
      HALF, ROADS, CENTERS,
      boxes: [], circles: [], buildings: [], mapRects: [], mapBlocks: [], mapCircles: [],
      litSigns: [], placeLights: {}, rings: [], places: {},
      jogPath: [[45, 45], [63, 45], [63, 63], [45, 63]],
    };
    const addBox = (x1, x2, z1, z2) => W.boxes.push({ x1, x2, z1, z2 });
    const addCircle = (x, z, r) => W.circles.push({ x, z, r });
    const lam = (c, extra) => new T.MeshLambertMaterial(Object.assign({ color: c }, extra || {}));
    const vcMat = () => new T.MeshLambertMaterial({ vertexColors: true });

    // נקודות שצריך להשאיר פנויות (דמויות, דלתות, שולחנות)
    const KEEP_CLEAR = [[-12, -7], [-9.4, -6.9], [-16.6, 5.2], [-18, 6.5], [15, -6.9], [24.5, 29.3], [54, -48.3], [-12, -2], [43.6, -43.6], [12, -7],
      [51.6, 47.6], [59.5, -56.6], [-48, 30.5], [-50.5, 31], [-47.5, -41], [-7.4, -7], [56.4, -47.2], [18, 16], [18, 18], [-13.9, -6.6], [-19.5, -8.4]];
    const nearKeep = (x, z, r) => KEEP_CLEAR.some(([kx, kz]) => Math.hypot(kx - x, kz - z) < r);

    function put(obj, x, y, z, parent) {
      obj.position.set(x, y, z);
      (parent || scene).add(obj);
      return obj;
    }
    function boxMesh(w, h, d, mat, x, y, z, parent) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      m.castShadow = true;
      m.receiveShadow = true;
      return put(m, x, y, z, parent);
    }
    function flat(w, d, mat, x, y, z, parent) {
      const m = new T.Mesh(new T.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.receiveShadow = true;
      return put(m, x, y, z, parent);
    }
    function sign(text, w, h, x, y, z, o, parent, face) {
      o = o || {};
      const tex = G.textTex(text, o);
      const mat = new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.lit ? 0.3 : 0.08 });
      if (o.lit) W.litSigns.push(mat);
      const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
      if (face === 'x') m.rotation.y = Math.PI / 2;
      return put(m, x, y, z, parent);
    }

    // ---------- קרקע ----------
    const grassDraw = (base) => (g) => {
      G.speckle(g, 32, 32, base, rnd, 260, 0.38);
      for (let i = 0; i < 26; i++) {
        const x = (rnd() * 32) | 0, y = (rnd() * 31) | 0;
        g.fillStyle = G.shade(base, 0.22);
        g.fillRect(x, y, 1, 1);
        g.fillStyle = G.shade(base, -0.25);
        g.fillRect(x, y + 1, 1, 1);
      }
    };
    const grassTex = G.canvasTex(32, 32, grassDraw('#6c9a4c'), true);
    grassTex.repeat.set(100, 100);
    flat(800, 800, lam(0xffffff, { map: grassTex }), 0, -0.05, 0);
    const swTex = G.canvasTex(16, 16, (g) => {
      const tones = ['#c4bcac', '#b6ae9e', '#bdb5a5', '#c9c1b2'];
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          g.fillStyle = tones[(ty * 2 + tx + ((rnd() * 2) | 0)) % 4];
          g.fillRect(tx * 8, ty * 8, 8, 8);
          for (let i = 0; i < 8; i++) {
            g.fillStyle = G.shade('#bdb5a5', (rnd() - 0.5) * 0.25);
            g.fillRect(tx * 8 + ((rnd() * 8) | 0), ty * 8 + ((rnd() * 8) | 0), 1, 1);
          }
        }
      g.fillStyle = '#9d9585';
      g.fillRect(0, 7, 16, 1);
      g.fillRect(0, 15, 16, 1);
      g.fillRect(7, 0, 1, 16);
      g.fillRect(15, 0, 1, 16);
    }, true);
    swTex.repeat.set(79, 79);
    flat(158, 158, lam(0xffffff, { map: swTex }), 0, 0, 0);

    // ---------- כבישים ----------
    const asphalt = (g, w, h) => {
      G.speckle(g, w, h, '#3c3e44', rnd, 220, 0.32);
      g.fillStyle = '#34363b';
      for (let i = 0; i < 3; i++) g.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 3, 1);
    };
    const roadH = G.canvasTex(32, 32, (g) => {
      asphalt(g, 32, 32);
      g.fillStyle = '#f0d264';
      g.fillRect(0, 15, 16, 2);
      g.fillStyle = '#d8d8d0';
      g.fillRect(0, 2, 32, 1);
      g.fillRect(0, 29, 32, 1);
    }, true);
    roadH.repeat.set(156 / 8, 1);
    const roadV = G.canvasTex(32, 32, (g) => {
      asphalt(g, 32, 32);
      g.fillStyle = '#f0d264';
      g.fillRect(15, 0, 2, 16);
      g.fillStyle = '#d8d8d0';
      g.fillRect(2, 0, 1, 32);
      g.fillRect(29, 0, 1, 32);
    }, true);
    roadV.repeat.set(1, 156 / 8);
    const plain = G.canvasTex(32, 32, (g) => asphalt(g, 32, 32), true);
    const mH = lam(0xffffff, { map: roadH }), mV = lam(0xffffff, { map: roadV }), mP = lam(0xffffff, { map: plain });
    for (const r of ROADS) {
      flat(156, 8, mH, 0, 0.02, r);
      flat(8, 156, mV, r, 0.025, 0);
      for (const r2 of ROADS) flat(8, 8, mP, r2, 0.03, r);
    }
    // מעברי חצייה
    const zebraTex = G.canvasTex(16, 32, (g) => {
      g.clearRect(0, 0, 16, 32);
      g.fillStyle = '#eeeae0';
      for (let y = 2; y < 32; y += 8) g.fillRect(1, y, 14, 4);
    });
    const zebraGeo = new T.PlaneGeometry(2.4, 7);
    zebraGeo.rotateX(-Math.PI / 2);
    const zebraPos = [];
    for (const r of ROADS)
      for (const q of ROADS)
        for (const s of [-5.7, 5.7]) {
          if (Math.abs(q + s) < 76) zebraPos.push([q + s, r, 0]);
          if (Math.abs(q + s) < 76) zebraPos.push([r, q + s, Math.PI / 2]);
        }
    const zebra = new T.InstancedMesh(zebraGeo, lam(0xffffff, { map: zebraTex, alphaTest: 0.5 }), zebraPos.length);
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), s3 = new T.Vector3(1, 1, 1), p3 = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    zebraPos.forEach(([x, z, ry], i) => {
      q4.setFromAxisAngle(up, ry);
      p3.set(x, 0.036, z);
      m4.compose(p3, q4, s3);
      zebra.setMatrixAt(i, m4);
    });
    zebra.receiveShadow = true;
    scene.add(zebra);
    // אבני שפה סביב כל בלוק
    const curb = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), lam(0xdcd6ca), 64);
    let ci = 0;
    for (const cx of CENTERS)
      for (const cz of CENTERS)
        for (const [dx, dz, along] of [[0, -13.9, 'x'], [0, 13.9, 'x'], [-13.9, 0, 'z'], [13.9, 0, 'z']]) {
          s3.set(along === 'x' ? 28 : 0.22, 0.14, along === 'x' ? 0.22 : 28);
          p3.set(cx + dx, 0.07, cz + dz);
          q4.identity();
          m4.compose(p3, q4, s3);
          curb.setMatrixAt(ci++, m4);
        }
    s3.set(1, 1, 1);
    curb.receiveShadow = true;
    scene.add(curb);

    // ---------- סגנונות מבנים ----------
    const CURTAINS = ['#c0392b', '#e8d8b0', '#7fb3d5', '#a3d977', '#f5b041', '#d7bde2'];
    function makeStyle(wallHex, kind) {
      const lit = [0, 1, 2, 3].map(() => rnd() < 0.7);
      const map = G.canvasTex(32, 32, (g) => {
        G.speckle(g, 32, 32, wallHex, rnd, 150, 0.2);
        for (let cy = 0; cy < 2; cy++)
          for (let cx = 0; cx < 2; cx++) {
            const ox = cx * 16, oy = cy * 16;
            if (kind === 'office') {
              g.fillStyle = '#3a5774';
              g.fillRect(ox, oy + 3, 16, 10);
              g.fillStyle = '#5f86a8';
              g.fillRect(ox, oy + 3, 16, 2);
              g.fillStyle = '#7fa6c6';
              g.fillRect(ox + 2 + ((rnd() * 8) | 0), oy + 6, 3, 1);
              g.fillStyle = G.shade(wallHex, -0.25);
              g.fillRect(ox + 15, oy + 3, 1, 10);
              g.fillStyle = G.shade(wallHex, -0.3);
              g.fillRect(ox, oy + 13, 16, 1);
            } else {
              // קורת קומה
              g.fillStyle = G.shade(wallHex, -0.12);
              g.fillRect(ox, oy + 15, 16, 1);
              g.fillStyle = '#f2efe6';
              g.fillRect(ox + 3, oy + 3, 10, 10);
              g.fillStyle = '#26354f';
              g.fillRect(ox + 4, oy + 4, 8, 8);
              g.fillStyle = '#3f5a80';
              g.fillRect(ox + 4, oy + 4, 8, 3);
              g.fillStyle = '#6c8fb8';
              g.fillRect(ox + 5, oy + 5, 2, 1);
              g.fillStyle = '#f2efe6';
              g.fillRect(ox + 7, oy + 4, 2, 8);
              if (rnd() < 0.5) {
                g.fillStyle = CURTAINS[(rnd() * CURTAINS.length) | 0];
                g.fillRect(ox + 4, oy + 4, 2, 8);
                g.fillRect(ox + 10, oy + 4, 2, 8);
              }
              g.fillStyle = G.shade(wallHex, -0.4);
              g.fillRect(ox + 2, oy + 13, 12, 1);
              g.fillStyle = G.shade(wallHex, 0.25);
              g.fillRect(ox + 2, oy + 12, 12, 1);
              if (rnd() < 0.25) {
                g.fillStyle = '#3f8f3a';
                g.fillRect(ox + 4, oy + 10, 8, 2);
                g.fillStyle = '#e74c3c';
                g.fillRect(ox + 5, oy + 10, 1, 1);
                g.fillRect(ox + 9, oy + 10, 1, 1);
              }
            }
          }
      }, true);
      const emi = G.canvasTex(32, 32, (g) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, 32, 32);
        for (let k = 0; k < 4; k++) {
          if (!lit[k]) continue;
          const ox = (k % 2) * 16, oy = ((k / 2) | 0) * 16;
          g.fillStyle = rnd() < 0.5 ? '#ffcf6b' : '#ffb347';
          if (kind === 'office') g.fillRect(ox, oy + 3, 15, 10);
          else {
            g.fillRect(ox + 4, oy + 4, 3, 8);
            g.fillRect(ox + 9, oy + 4, 3, 8);
          }
        }
      }, true);
      return { map, emi, wall: wallHex, kind, mapColor: G.shade(wallHex, -0.25) };
    }
    const resStyles = ['#ead7b2', '#dba46b', '#cfb99f', '#bccbd6', '#e8c592', '#adbb9c', '#dbb7a6', '#c6a683', '#f0e2c4', '#b9a9c9'].map((c) => makeStyle(c, 'res'));
    const officeStyles = ['#8fa3b5', '#9aa7a0', '#a59b8e'].map((c) => makeStyle(c, 'office'));
    const roofTex = G.canvasTex(16, 16, (g) => {
      G.speckle(g, 16, 16, '#77736d', rnd, 90, 0.3);
      g.fillStyle = '#625e58';
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 0, 1, 16);
    }, true);
    const tileTex = G.canvasTex(32, 32, (g) => {
      for (let ty = 0; ty < 4; ty++)
        for (let tx = 0; tx < 4; tx++) {
          const ox = tx * 8 + (ty % 2) * 4, oy = ty * 8;
          for (const sx of [ox, ox - 32]) {
            g.fillStyle = '#b8533a';
            g.fillRect(sx, oy, 8, 8);
            g.fillStyle = '#d4694a';
            g.fillRect(sx + 1, oy + 1, 6, 3);
            g.fillStyle = '#8a3a27';
            g.fillRect(sx, oy + 7, 8, 1);
            g.fillRect(sx + 7, oy, 1, 8);
          }
        }
    }, true);
    const DOOR_COLS = ['#6b3e1f', '#1b3a8a', '#2e7d4f', '#7b1e3a', '#3d3d3d'];
    const SHOPS = [['פיצה', '#c0392b'], ['פלאפל', '#e67e22'], ['מכולת', '#27ae60'], ['קפה', '#6b3e1f'], ['ספרים', '#2c3e50'], ['פרחים', '#8e44ad'], ['מספרה', '#2980b9'], ['בורקס', '#d35400'], ['יודאיקה', '#1b3a8a'], ['ירקות', '#3f8f3a']];
    const shopFronts = [];
    // חלון ראווה: מסגרת, זכוכית עם השתקפות, מוצרים ודלת; חוזר כל 4 יחידות לאורך החזית
    const shopTexBase = G.canvasTex(32, 20, (g) => {
      g.fillStyle = '#3a3a3f';
      g.fillRect(0, 0, 32, 20);
      g.fillStyle = '#1d3a4a';
      g.fillRect(2, 2, 18, 15);
      g.fillStyle = '#2e5a70';
      g.fillRect(2, 2, 18, 4);
      g.fillStyle = '#6fa3bf';
      g.fillRect(4, 3, 6, 1);
      g.fillRect(12, 9, 4, 1);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = ['#e74c3c', '#f1c40f', '#ecf0f1', '#27ae60', '#e67e22'][i % 5];
        g.fillRect(3 + i * 3, 13, 2, 3);
      }
      g.fillStyle = '#5a4a3a';
      g.fillRect(23, 4, 7, 16);
      g.fillStyle = '#2b2b2b';
      g.fillRect(24, 5, 5, 14);
      g.fillStyle = '#d0c070';
      g.fillRect(28, 12, 1, 2);
      g.fillStyle = '#8a8a8a';
      g.fillRect(0, 18, 32, 2);
    }, true);
    const shopFrontEmi = G.canvasTex(32, 20, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 32, 20);
      g.fillStyle = '#ffd890';
      g.fillRect(2, 2, 18, 15);
    }, true);
    function shopFrontTex(len) {
      const t = shopTexBase.clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(len / 4)), 1);
      return t;
    }
    const AWN_COLS = ['#d62828', '#1b6fd8', '#2e9d5f', '#f39c12', '#8e44ad'];

    function addBuilding(x, z, w, d, h, style, opts) {
      opts = opts || {};
      const floors = Math.max(1, Math.round(h / 3.2));
      const geo = new T.BoxGeometry(w, h, d, 1, Math.max(1, Math.ceil(h / 1.6)), 1);
      const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i), nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
        let u, v;
        if (Math.abs(nx) > 0.5) {
          u = nx > 0 ? d / 2 - pz : pz + d / 2;
          v = py + h / 2;
        } else if (Math.abs(nz) > 0.5) {
          u = nz > 0 ? px + w / 2 : w / 2 - px;
          v = py + h / 2;
        } else {
          u = px + w / 2;
          v = pz + d / 2;
        }
        uv.setXY(i, u / 8, v / 6.4);
        // הצללה רכה ליד הקרקע
        const ao = ny > 0.5 ? 1 : 0.6 + 0.4 * Math.pow(G.clamp((py + h / 2) / 4.5, 0, 1), 0.7);
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = ao;
      }
      geo.setAttribute('color', new T.BufferAttribute(colors, 3));
      const wall = new T.MeshLambertMaterial({ map: style.map, emissive: 0xffffff, emissiveMap: style.emi, emissiveIntensity: 0, vertexColors: true });
      const roof = new T.MeshLambertMaterial({ map: roofTex, vertexColors: true });
      const m = new T.Mesh(geo, [wall, wall, roof, roof, wall, wall]);
      m.position.set(x, (opts.base || 0) + h / 2, z);
      m.castShadow = m.receiveShadow = true;
      (opts.parent || scene).add(m);
      const mats = [wall, roof];
      m.userData = { wall, roof, mats, fade: 1, tr: false, hit: false };
      W.buildings.push(m);
      if (!opts.base) {
        addBox(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
        W.mapRects.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, color: opts.mapColor || style.mapColor });
      }

      // ---- פרטים: בסיס, מעקה גג, דלת, מרפסות, דודי שמש ----
      const parts = [];
      const top = h / 2, bot = -h / 2;
      const dark = G.shade(style.wall, -0.3), light = G.shade(style.wall, 0.3);
      const fb = (f, uc, y, a, hh, dd, off, c, tilt) =>
        f === 'z'
          ? { w: a, h: hh, d: dd, x: -w / 2 + uc, y, z: d / 2 + off, c, rx: tilt || 0 }
          : { w: dd, h: hh, d: a, x: w / 2 + off, y, z: d / 2 - uc, c, rz: -(tilt || 0) };
      if (!opts.base) parts.push({ w: w + 0.06, h: 0.45, d: d + 0.06, y: bot + 0.225, c: dark });
      const isRes = style.kind === 'res' && !opts.special;
      const gable = isRes && floors <= 2 && rnd() < 0.55;
      if (!gable) {
        const t = 0.28, ph = 0.5, py = top + ph / 2 - 0.05;
        parts.push(
          { w: w + 0.08, h: ph, d: t, y: py, z: d / 2 - t / 2 + 0.04, c: light },
          { w: w + 0.08, h: ph, d: t, y: py, z: -d / 2 + t / 2 - 0.04, c: light },
          { w: t, h: ph, d: d - 0.48, x: w / 2 - t / 2 + 0.04, y: py, c: light },
          { w: t, h: ph, d: d - 0.48, x: -w / 2 + t / 2 - 0.04, y: py, c: light }
        );
      }
      if (isRes) {
        const f = rnd() < 0.5 ? 'z' : 'x';
        const faceLen = f === 'z' ? w : d, ncol = Math.max(1, Math.floor(faceLen / 4));
        const k = (rnd() * ncol) | 0, uc = 2 + 4 * k;
        const shop = rnd() < 0.45 && faceLen >= 6;
        if (!shop) {
          parts.push(fb(f, uc, bot + 1.22, 1.6, 2.45, 0.08, 0.04, light));
          parts.push(fb(f, uc, bot + 1.1, 1.15, 2.2, 0.12, 0.06, DOOR_COLS[(rnd() * DOOR_COLS.length) | 0]));
          parts.push(fb(f, uc, bot + 0.08, 1.9, 0.16, 0.6, 0.3, '#a29d93'));
        }
        if (shop) {
          // חזית חנות עם שלט בעברית
          const kind = SHOPS[(rnd() * SHOPS.length) | 0];
          const fl = faceLen - 0.6;
          const front = new T.MeshLambertMaterial({ map: shopFrontTex(fl), emissive: 0xffffff, emissiveMap: shopFrontEmi, emissiveIntensity: 0 });
          const signTex = G.textTex(kind[0], { w: 128, h: 24, size: 17, bg: kind[1], fg: '#ffffff', border: '#ffffff' });
          const signM = new T.MeshLambertMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.15 });
          W.litSigns.push(signM);
          const fp = new T.Mesh(new T.PlaneGeometry(fl, 2.55), front);
          const sp = new T.Mesh(new T.PlaneGeometry(Math.min(fl, 5.5), 0.75), signM);
          if (f === 'z') {
            fp.position.set(0, bot + 1.32, d / 2 + 0.05);
            sp.position.set(0, bot + 3.45, d / 2 + 0.06);
          } else {
            fp.rotation.y = sp.rotation.y = Math.PI / 2;
            fp.position.set(w / 2 + 0.05, bot + 1.32, 0);
            sp.position.set(w / 2 + 0.06, bot + 3.45, 0);
          }
          m.add(fp, sp);
          mats.push(front, signM);
          shopFronts.push(front);
          const ac = AWN_COLS[(rnd() * AWN_COLS.length) | 0];
          const n = Math.floor((faceLen - 0.6) / 0.55);
          for (let s = 0; s < n; s++) parts.push(fb(f, 0.3 + 0.275 + s * 0.55, bot + 2.85, 0.55, 0.1, 1.3, 0.6, s % 2 ? '#f4f1e8' : ac, 0.32));
        }
        if (floors >= 3 && rnd() < 0.7) {
          const bf = rnd() < 0.5 ? f : f === 'z' ? 'x' : 'z';
          const bLen = bf === 'z' ? w : d, bcol = Math.max(1, Math.floor(bLen / 4));
          const rail = rnd() < 0.5 ? '#f4f1e8' : dark;
          const cols = [(rnd() * bcol) | 0];
          if (bcol > 1 && rnd() < 0.5) cols.push((cols[0] + 1) % bcol);
          for (const col of cols) {
            const bu = 2 + 4 * col;
            for (let fl = 1; fl < floors; fl++) {
              const y = bot + fl * 3.2 + 0.7;
              parts.push(fb(bf, bu, y, 2.0, 0.12, 0.8, 0.4, '#b9b4ab'));
              parts.push(fb(bf, bu, y + 0.34, 2.0, 0.55, 0.06, 0.78, rail));
              parts.push(fb(bf, bu - 0.97, y + 0.34, 0.06, 0.55, 0.8, 0.4, rail));
              parts.push(fb(bf, bu + 0.97, y + 0.34, 0.06, 0.55, 0.8, 0.4, rail));
              if (rnd() < 0.35) parts.push(fb(bf, bu + 0.5, y + 0.3, 0.4, 0.45, 0.4, 0.45, '#3f8f3a'));
            }
          }
        }
      }
      if (!gable && !opts.noRoofProps) {
        const rx = () => (rnd() - 0.5) * Math.max(0.2, w - 2.6), rz = () => (rnd() - 0.5) * Math.max(0.2, d - 2.6);
        if (style.kind === 'res') {
          const n = rnd() < 0.7 ? 1 + ((rnd() * 2) | 0) : 0;
          for (let i = 0; i < n; i++) {
            const sx = rx(), sz = rz();
            parts.push({ w: 1.3, h: 0.06, d: 1.0, x: sx, y: top + 0.5, z: sz + 0.25, rx: -0.55, c: '#22406a' });
            parts.push({ g: 'cyl', r: 0.3, h: 1.3, x: sx, y: top + 0.95, z: sz - 0.4, rz: Math.PI / 2, c: '#ececec' });
            parts.push({ w: 0.06, h: 0.7, d: 0.06, x: sx - 0.5, y: top + 0.35, z: sz - 0.4, c: '#777' });
            parts.push({ w: 0.06, h: 0.7, d: 0.06, x: sx + 0.5, y: top + 0.35, z: sz - 0.4, c: '#777' });
          }
          if (rnd() < 0.35) parts.push({ w: 1.8, h: 1.8, d: 2.0, x: rx(), y: top + 0.9, z: rz(), c: style.wall });
        } else {
          parts.push({ w: 2.2, h: 1.2, d: 1.6, x: rx(), y: top + 0.6, z: rz(), c: '#9a9a9a' });
          parts.push({ g: 'cyl', r: 0.9, h: 1.8, x: rx(), y: top + 1.3, z: rz(), c: '#7a5a3a' });
          parts.push({ w: 0.08, h: 3, d: 0.08, x: rx(), y: top + 1.5, z: rz(), c: '#555' });
        }
        if (rnd() < 0.5) parts.push({ w: 1.1, h: 0.6, d: 0.8, x: rx(), y: top + 0.3, z: rz(), c: '#a3a3a3' });
      }
      const detMat = vcMat();
      const det = new T.Mesh(mergeParts(parts), detMat);
      det.castShadow = det.receiveShadow = true;
      m.add(det);
      mats.push(detMat);
      if (gable) {
        const tileMat = new T.MeshLambertMaterial({ map: tileTex });
        const endMat = new T.MeshLambertMaterial({ color: new T.Color(style.wall) });
        const alongX = w >= d;
        const rh = Math.min(w, d) * 0.36;
        const rg = new T.Mesh(gableGeo(alongX ? w : d, alongX ? d : w, rh), [tileMat, endMat]);
        rg.position.y = top;
        if (!alongX) rg.rotation.y = Math.PI / 2;
        rg.castShadow = rg.receiveShadow = true;
        m.add(rg);
        mats.push(tileMat, endMat);
        if (rnd() < 0.5) {
          const ch = new T.Mesh(new T.BoxGeometry(0.6, 1.4, 0.6), endMat);
          ch.position.set(w * 0.25, top + rh * 0.6, d * 0.15);
          ch.castShadow = true;
          m.add(ch);
        }
      }
      return m;
    }

    // ---------- עצים ושיחים (מופעים) ----------
    const trees = [], bushes = [];
    function addTree(x, z, s, collide) {
      trees.push({ x, z, s: s || 1 });
      if (collide !== false) addCircle(x, z, 0.55 * (s || 1));
    }

    function fillLot(lx, lz, o) {
      o = o || {};
      if (!o.noEmpty && rnd() < 0.2) {
        const n = 1 + ((rnd() * 3) | 0);
        for (let k = 0; k < n; k++) {
          let tz = lz + (rnd() - 0.5) * 7;
          if (o.zMin !== undefined) tz = Math.max(tz, o.zMin + 0.8);
          addTree(lx + (rnd() - 0.5) * 7, tz, 0.85 + rnd() * 0.45);
        }
        return;
      }
      const w = 7 + rnd() * 3;
      let d = 7 + rnd() * 3;
      if (o.maxD) d = Math.min(d, o.maxD);
      const h = (2 + ((rnd() * 3) | 0)) * 3.2;
      const x = lx + (rnd() - 0.5) * (10 - w);
      let z = lz + (rnd() - 0.5) * (10 - d);
      if (o.zMin !== undefined) z = Math.max(z, o.zMin + d / 2);
      addBuilding(x, z, w, d, h, resStyles[(rnd() * resStyles.length) | 0]);
    }

    // ---------- נורות צבעוניות (שינוי בעולם אחרי הצלחה) ----------
    const bulbGeo = new T.BoxGeometry(0.2, 0.24, 0.2);
    const bulbMats = [0xffd23f, 0xff8c42, 0x6ec6ff, 0xffffff, 0xff5e7e].map((c) => new T.MeshBasicMaterial({ color: c }));
    const wireMat = new T.LineBasicMaterial({ color: 0x222222 });
    function makeLights(a, b, n, parent, sag) {
      sag = sag === undefined ? 0.25 : sag;
      const grp = new T.Group();
      (parent || scene).add(grp);
      const pts = [];
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, z = a[2] + (b[2] - a[2]) * t;
        pts.push(new T.Vector3(x, y, z));
        const bulb = new T.Mesh(bulbGeo, bulbMats[k % bulbMats.length]);
        bulb.position.set(x, y - 0.13, z);
        grp.add(bulb);
      }
      grp.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), wireMat));
      return grp;
    }

    // ---------- לוחות הבלוקים ----------
    const plateTex = {
      yard: G.canvasTex(32, 32, grassDraw('#86a35b'), true),
      plaza: G.canvasTex(16, 16, (g) => {
        G.speckle(g, 16, 16, '#cdbb9b', rnd, 60, 0.2);
        g.fillStyle = '#b3a283';
        g.fillRect(0, 7, 16, 1);
        g.fillRect(7, 0, 1, 8);
        g.fillRect(15, 8, 1, 8);
        g.fillRect(0, 15, 16, 1);
      }, true),
      asphalt: G.canvasTex(16, 16, (g) => G.speckle(g, 16, 16, '#55575c', rnd, 90, 0.3), true),
      park: G.canvasTex(32, 32, grassDraw('#5f9c45'), true),
    };
    const plateRepeat = { yard: 6, plaza: 12, asphalt: 12, park: 6 };
    const plateMats = {};
    for (const k in plateTex) {
      plateTex[k].repeat.set(plateRepeat[k], plateRepeat[k]);
      plateMats[k] = lam(0xffffff, { map: plateTex[k] });
    }
    const MAP_COLORS = { yard: '#8aa85e', plaza: '#c9b796', asphalt: '#5c5e63', park: '#4f9a3e' };
    const special = { '1,1': 'chabad', '2,1': 'grocery', '1,2': 'busstop', '2,2': 'center', '3,0': 'gas', '3,3': 'park', '0,2': 'dorm' };
    const plateType = { center: 'plaza', gas: 'asphalt', park: 'park' };
    const blockKinds = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const cx = CENTERS[i], cz = CENTERS[j];
        const kind = special[i + ',' + j] || 'res';
        const pt = plateType[kind] || 'yard';
        flat(24, 24, plateMats[pt], cx, 0.04, cz);
        W.mapBlocks.push({ cx, cz, color: MAP_COLORS[pt] });
        W.rings.push([cx, cz]);
        blockKinds.push({ cx, cz, kind });
        if (kind === 'res') for (const ox of [-6, 6]) for (const oz of [-6, 6]) fillLot(cx + ox, cz + oz);
      }

    // ---------- בית חב״ד (שכונה ראשונה) ----------
    fillLot(-24, -12);
    fillLot(-24, -24);
    fillLot(-12, -24);
    const chabadStyle = makeStyle('#efe6cf', 'res');
    addBuilding(-12, -12, 10, 8, 6.4, chabadStyle, { mapColor: '#3b6fd8', noRoofProps: true, special: true });
    put(new T.Mesh(new T.PlaneGeometry(1.7, 2.5), lam(0xffd23f)), -12, 1.25, -7.95);
    put(new T.Mesh(new T.PlaneGeometry(1.3, 2.2), lam(0x6b3e1f)), -12, 1.1, -7.94);
    boxMesh(2.2, 0.15, 0.6, lam(0x9a9a9a), -12, 0.075, -7.7);
    sign('בית חב״ד', 2.8, 0.7, -12, 2.95, -7.94, { w: 96, h: 24, size: 16, bg: '#1b3a8a', fg: '#ffffff', border: '#ffd23f', lit: true });
    W.places.chabadDoor = { x: -12, z: -7.4 };

    const L2 = new T.Group(), L2roof = new T.Group(), L3 = new T.Group();
    L2.visible = L2roof.visible = L3.visible = false;
    scene.add(L2, L2roof, L3);
    sign('בית חב״ד', 7, 1.75, -12, 7.9, -8.3, { w: 128, h: 32, size: 22, bg: '#1b3a8a', fg: '#ffd23f', border: '#ffd23f', lit: true }, L2roof);
    boxMesh(0.15, 1.3, 0.15, lam(0x333333), -14.6, 7.2, -8.4, L2roof);
    boxMesh(0.15, 1.3, 0.15, lam(0x333333), -9.4, 7.2, -8.4, L2roof);
    // דרגה 3: קומה נוספת ושלט ״מרכז קהילתי״
    addBuilding(-12, -12, 10, 8, 3.2, chabadStyle, { base: 6.4, special: true, noRoofProps: true, parent: L3 });
    sign('מרכז קהילתי חב״ד', 8.5, 1.6, -12, 11.1, -8.3, { w: 160, h: 30, size: 19, bg: '#1b3a8a', fg: '#ffd23f', border: '#ffd23f', lit: true }, L3);
    boxMesh(0.15, 1.3, 0.15, lam(0x333333), -15.2, 10.4, -8.4, L3);
    boxMesh(0.15, 1.3, 0.15, lam(0x333333), -8.8, 10.4, -8.4, L3);
    for (const fx of [-16, -8]) {
      boxMesh(0.08, 2.4, 0.08, lam(0xdddddd), fx, 11, -15, L3);
      boxMesh(0.04, 0.7, 1.1, lam(0xffd23f), fx, 11.8, -14.43, L3);
    }
    makeLights([-17, 7.0, -7.85], [-7, 7.0, -7.85], 12, L3);
    boxMesh(5, 3.6, 7, lam(0xf2e3c4), -19.5, 1.8, -12.5, L2);
    boxMesh(5.4, 0.25, 7.4, lam(0x8b5a2b), -19.5, 3.7, -12.5, L2);
    sign('מטבח שבת', 3, 0.7, -19.5, 2.6, -8.97, { w: 96, h: 24, size: 15, bg: '#ffd23f', fg: '#1b3a8a', border: '#1b3a8a', lit: true }, L2);
    for (const fx of [-16, -8]) {
      boxMesh(0.08, 2.4, 0.08, lam(0xdddddd), fx, 7.8, -15, L2roof);
      boxMesh(0.04, 0.7, 1.1, lam(0xffd23f), fx, 8.6, -14.43, L2roof);
    }
    boxMesh(2.4, 0.08, 0.9, lam(0xffffff), -15.5, 0.82, -6.9, L2);
    for (const [lx, lz] of [[-16.5, -7.2], [-14.5, -7.2], [-16.5, -6.6], [-14.5, -6.6]]) boxMesh(0.08, 0.8, 0.08, lam(0x6b3e1f), lx, 0.4, lz, L2);
    boxMesh(0.6, 0.25, 0.3, lam(0xc98a3a), -16.1, 0.98, -6.9, L2);
    boxMesh(0.6, 0.25, 0.3, lam(0xc98a3a), -15.2, 0.98, -6.9, L2);
    boxMesh(0.14, 0.4, 0.14, lam(0x7b1e3a), -14.6, 1.06, -6.9, L2);
    makeLights([-17, 3.8, -7.85], [-7, 3.8, -7.85], 12, L2);
    let l2Applied = false;
    W.setChabadLevel = function (l) {
      L2.visible = l >= 2;
      L2roof.visible = l === 2;
      L3.visible = l >= 3;
      if (l >= 2 && !l2Applied) {
        l2Applied = true;
        addBox(-22, -17, -16, -9);
        addBox(-16.8, -14.2, -7.4, -6.4);
        W.mapRects.push({ x1: -22, x2: -17, z1: -16, z2: -9, color: '#3b6fd8' });
        W.mapDirty = true;
      }
    };

    // ---------- מכולת כהן ובית הכנסת ----------
    fillLot(12, -24);
    fillLot(24, -24);
    addBuilding(12, -12, 10, 8, 4.8, makeStyle('#f0d9a8', 'res'), { noRoofProps: true, mapColor: '#c98a3a', special: true });
    const awnTex = G.canvasTex(16, 4, (g) => {
      for (let x = 0; x < 16; x++) {
        g.fillStyle = (x >> 1) % 2 ? '#ffffff' : '#d62828';
        g.fillRect(x, 0, 1, 4);
      }
    }, true);
    awnTex.repeat.set(5, 1);
    const awn = boxMesh(10.4, 0.15, 1.6, lam(0xffffff, { map: awnTex }), 12, 3.0, -7.3);
    awn.rotation.x = 0.25;
    sign('מכולת כהן', 5, 0.9, 12, 4.05, -7.94, { w: 112, h: 24, size: 16, bg: '#2e7d4f', fg: '#ffffff', border: '#ffd23f', lit: true });
    put(new T.Mesh(new T.PlaneGeometry(1.4, 2.2), lam(0x2b3a55)), 14.5, 1.1, -7.94);
    const fruit = [0xe74c3c, 0xf39c12, 0x27ae60, 0xf1c40f];
    for (let k = 0; k < 4; k++) {
      boxMesh(0.85, 0.5, 0.7, lam(0x9c6b3c), 8.0 + k * 0.95, 0.25, -7.0);
      boxMesh(0.75, 0.12, 0.6, lam(fruit[k]), 8.0 + k * 0.95, 0.55, -7.0);
    }
    addBox(7.5, 11.3, -7.4, -6.6);

    addBuilding(24.5, -12, 8, 8, 7, makeStyle('#e9e4d8', 'res'), { noRoofProps: true, mapColor: '#d8d0b8', special: true });
    const dome = new T.Mesh(new T.SphereGeometry(1.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x3b6fd8, { flatShading: true }));
    dome.castShadow = true;
    put(dome, 24.5, 7.3, -12);
    sign('בית כנסת', 4, 0.8, 24.5, 5.7, -7.94, { w: 96, h: 20, size: 14, bg: '#e9e4d8', fg: '#1b3a8a', border: '#1b3a8a' });
    put(new T.Mesh(new T.PlaneGeometry(1.6, 2.4), lam(0x6b3e1f)), 24.5, 1.2, -7.94);

    // ---------- תחנת האוטובוס ----------
    fillLot(-24, 12, { maxD: 7, zMin: 8.5 });
    fillLot(-12, 12, { maxD: 7, zMin: 8.5 });
    fillLot(-24, 24);
    fillLot(-12, 24);
    const shelterMat = lam(0x2f6f9f);
    boxMesh(3.6, 0.15, 1.5, shelterMat, -18, 2.5, 6.9);
    boxMesh(3.4, 2.3, 0.06, new T.MeshLambertMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.55 }), -18, 1.25, 7.55);
    boxMesh(0.12, 2.5, 0.12, shelterMat, -19.7, 1.25, 7.5);
    boxMesh(0.12, 2.5, 0.12, shelterMat, -16.3, 1.25, 7.5);
    boxMesh(2.4, 0.12, 0.5, lam(0x8b5a2b), -18, 0.55, 7.2);
    boxMesh(0.1, 2.8, 0.1, lam(0x666666), -15.4, 1.4, 6.6);
    sign('תחנה', 1.0, 0.6, -15.4, 2.75, 6.66, { w: 48, h: 28, size: 14, bg: '#2f6f9f', fg: '#ffffff', border: '#ffffff' });
    addBox(-19.8, -16.2, 6.15, 7.65);
    W.mapRects.push({ x1: -19.8, x2: -16.2, z1: 6.15, z2: 7.65, color: '#2f6f9f' });

    // ---------- מעונות הסטודנטים ----------
    fillLot(-60, 12);
    fillLot(-60, 24);
    fillLot(-48, 12);
    addBuilding(-48, 24.5, 9, 6, 9.6, makeStyle('#d9c9e6', 'res'), { special: true, mapColor: '#9b7fc4' });
    sign('מעונות הסטודנטים', 5.6, 0.85, -48, 3.0, 27.56, { w: 144, h: 22, size: 14, bg: '#5b3f8c', fg: '#ffffff', border: '#ffd23f', lit: true });
    put(new T.Mesh(new T.PlaneGeometry(1.5, 2.3), lam(0x5b3f8c)), -48, 1.15, 27.55);
    const dormTable = new T.Group();
    dormTable.visible = false;
    scene.add(dormTable);
    boxMesh(3.2, 0.08, 1.0, lam(0xffffff), -48, 0.82, 29.0, dormTable);
    for (const [lx, lz] of [[-49.4, 28.6], [-46.6, 28.6], [-49.4, 29.4], [-46.6, 29.4]]) boxMesh(0.08, 0.8, 0.08, lam(0x6b3e1f), lx, 0.4, lz, dormTable);
    boxMesh(0.6, 0.25, 0.3, lam(0xc98a3a), -48.8, 0.98, 29, dormTable);
    boxMesh(0.14, 0.4, 0.14, lam(0x7b1e3a), -47.9, 1.06, 29, dormTable);
    boxMesh(0.5, 0.3, 0.5, lam(0x555555), -47.1, 1.0, 29, dormTable);
    const candleMat = new T.MeshBasicMaterial({ color: 0xffd27a });
    for (const cx of [-49.5, -49.2]) {
      boxMesh(0.08, 0.35, 0.08, lam(0xffffff), cx, 1.04, 28.75, dormTable);
      boxMesh(0.07, 0.1, 0.07, candleMat, cx, 1.27, 28.75, dormTable);
    }
    makeLights([-52.4, 3.2, 27.65], [-43.6, 3.2, 27.65], 11, dormTable);
    W.dormTable = dormTable;

    // ---------- מרכז העיר: משרדים ובית קפה ----------
    addBuilding(11, 11, 9, 9, 25.6, officeStyles[0]);
    addBuilding(11, 24.5, 9, 7, 16, officeStyles[1]);
    addBuilding(25, 11, 9, 9, 19.2, officeStyles[2]);
    addBuilding(24.5, 24, 9, 8, 3.6, makeStyle('#e3b98a', 'res'), { noRoofProps: true, mapColor: '#b5651d', special: true });
    sign('קפה בוקר טוב', 5.5, 0.9, 24.5, 3.0, 28.06, { w: 128, h: 24, size: 15, bg: '#6b3e1f', fg: '#ffe7b0', border: '#ffd23f', lit: true });
    for (const tx of [21.5, 27.5]) {
      const tbl = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.08, 8), lam(0xffffff));
      put(tbl, tx, 0.78, 29.2);
      boxMesh(0.08, 2.3, 0.08, lam(0x444444), tx, 1.15, 29.2);
      const umb = new T.Mesh(new T.ConeGeometry(1.25, 0.5, 8), lam(tx < 24 ? 0xd62828 : 0x1b3a8a, { flatShading: true }));
      umb.castShadow = true;
      put(umb, tx, 2.35, 29.2);
      addCircle(tx, 29.2, 0.6);
    }
    for (const [tx, tz] of [[8, 18], [14.2, 19.2], [17.5, 25]]) addTree(tx, tz, 1);

    // ---------- תחנת הדלק ----------
    boxMesh(12, 0.6, 8, lam(0xffffff), 54, 4.6, -50);
    boxMesh(12.1, 0.25, 8.1, lam(0xd62828), 54, 4.4, -50);
    for (const [px, pz] of [[49, -53], [59, -53], [49, -47], [59, -47]]) {
      boxMesh(0.4, 4.3, 0.4, lam(0xdddddd), px, 2.15, pz);
      addCircle(px, pz, 0.35);
    }
    for (const px of [51.5, 56.5]) {
      boxMesh(0.8, 1.6, 1.2, lam(0xd62828), px, 0.8, -50);
      boxMesh(0.82, 0.4, 0.6, lam(0x222222), px, 1.25, -50);
      addBox(px - 0.4, px + 0.4, -50.6, -49.4);
    }
    sign('תחנת דלק', 3.2, 0.7, 54, 5.25, -45.94, { w: 96, h: 22, size: 15, bg: '#d62828', fg: '#ffffff', border: '#ffffff', lit: true });
    addBuilding(61, -61, 8, 6, 3.6, makeStyle('#e8e2d6', 'res'), { noRoofProps: true, mapColor: '#d62828', special: true });
    sign('מרכול', 2.4, 0.7, 61, 2.9, -57.94, { w: 64, h: 22, size: 15, bg: '#ffd23f', fg: '#d62828', border: '#d62828', lit: true });
    boxMesh(0.25, 4.5, 0.25, lam(0x777777), 43.6, 2.25, -43.6);
    sign('דלק', 1.6, 1.0, 43.6, 4.2, -43.45, { w: 48, h: 30, size: 18, bg: '#d62828', fg: '#ffffff', border: '#ffffff', lit: true });
    addCircle(43.6, -43.6, 0.3);
    W.mapRects.push({ x1: 48, x2: 60, z1: -54, z2: -46, color: '#e8e8e8' });
    // הרכב התקוע של שמעון — מכסה מנוע פתוח
    const stuck = G.makeCar(0x7f8c8d);
    put(stuck, 63.2, 0, -52);
    const hood = new T.Mesh(new T.BoxGeometry(1.7, 0.08, 1.2), lam(0x7f8c8d));
    hood.position.set(0, 1.45, 1.5);
    hood.rotation.x = -0.9;
    stuck.add(hood);
    addBox(62.3, 64.1, -53.95, -50.05);

    // ---------- הפארק והטיילת ----------
    const pathTex = G.canvasTex(16, 16, (g) => G.speckle(g, 16, 16, '#d8c08f', rnd, 70, 0.25), true);
    pathTex.repeat.set(4, 4);
    const pathMat = lam(0xffffff, { map: pathTex });
    flat(20, 2, pathMat, 54, 0.05, 45);
    flat(20, 2, pathMat, 54, 0.05, 63);
    flat(2, 16, pathMat, 45, 0.055, 54);
    flat(2, 16, pathMat, 63, 0.055, 54);
    put(new T.Mesh(new T.CylinderGeometry(5, 5.2, 0.35, 16), lam(0xa8a39a)), 54, 0.12, 54);
    const waterTex = G.canvasTex(32, 32, (g) => {
      G.speckle(g, 32, 32, '#3a7bd5', rnd, 80, 0.2);
      g.fillStyle = '#7fb6f0';
      for (let i = 0; i < 14; i++) g.fillRect((rnd() * 30) | 0, (rnd() * 32) | 0, 2 + ((rnd() * 3) | 0), 1);
      g.fillStyle = '#d6ecff';
      for (let i = 0; i < 4; i++) g.fillRect((rnd() * 31) | 0, (rnd() * 32) | 0, 1, 1);
    }, true);
    waterTex.repeat.set(2, 2);
    const water = new T.Mesh(new T.CylinderGeometry(4.6, 4.6, 0.36, 16), lam(0xffffff, { map: waterTex, emissive: 0x0a2040, emissiveIntensity: 0.4 }));
    put(water, 54, 0.14, 54);
    addCircle(54, 54, 5.1);
    W.mapCircles.push({ x: 54, z: 54, r: 4.9, color: '#3a7bd5' });
    for (const [bx, bz] of [[50, 46.6], [58.5, 61.4]]) {
      boxMesh(1.7, 0.12, 0.55, lam(0x8b5a2b), bx, 0.5, bz);
      boxMesh(1.7, 0.5, 0.1, lam(0x8b5a2b), bx, 0.8, bz + 0.25);
      addBox(bx - 0.85, bx + 0.85, bz - 0.3, bz + 0.35);
    }
    sign('פארק העיר', 3, 0.7, 43.2, 1.6, 51, { w: 96, h: 22, size: 15, bg: '#2e7d4f', fg: '#ffffff', border: '#ffd23f' }, null, 'x');
    boxMesh(0.1, 1.3, 0.1, lam(0x6b3e1f), 43.1, 0.65, 51);
    const flowerCols = [0xff5e7e, 0xffd23f, 0xffffff, 0xb07cff];
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      boxMesh(0.35, 0.3, 0.35, lam(flowerCols[k % 4]), 54 + Math.cos(a) * 5.7, 0.15, 54 + Math.sin(a) * 5.7);
    }
    let placed = 0;
    for (let tries = 0; tries < 200 && placed < 20; tries++) {
      const x = 42.8 + rnd() * 22.4, z = 42.8 + rnd() * 22.4;
      const dx = Math.max(45 - x, 0, x - 63), dz = Math.max(45 - z, 0, z - 63);
      const dRing = dx > 0 || dz > 0 ? Math.hypot(dx, dz) : Math.min(x - 45, 63 - x, z - 45, 63 - z);
      if (dRing < 2) continue;
      if (Math.hypot(x - 54, z - 54) < 6.8) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.2)) continue;
      addTree(x, z, 0.9 + rnd() * 0.5);
      placed++;
    }

    // ---------- נורות בכל מקום שבו מישהו הניח תפילין ----------
    W.placeLights.yossi = makeLights([-19.7, 2.7, 6.1], [-16.3, 2.7, 6.1], 7);
    W.placeLights.cohen = makeLights([7.2, 3.7, -7.7], [16.8, 3.7, -7.7], 12);
    W.placeLights.daniel = makeLights([20.2, 3.35, 28.1], [28.8, 3.35, 28.1], 11);
    W.placeLights.roi = makeLights([48.2, 4.2, -45.85], [59.8, 4.2, -45.85], 13, null, 0.15);
    const parkL = new T.Group();
    scene.add(parkL);
    boxMesh(0.12, 3, 0.12, lam(0x444444), 45.5, 1.5, 43.4, parkL);
    boxMesh(0.12, 3, 0.12, lam(0x444444), 62.5, 1.5, 43.4, parkL);
    makeLights([45.5, 2.9, 43.4], [62.5, 2.9, 43.4], 16, parkL, 0.4);
    W.placeLights.ido = parkL;
    addCircle(45.5, 43.4, 0.2);
    addCircle(62.5, 43.4, 0.2);
    for (const k in W.placeLights) W.placeLights[k].visible = false;

    // ---------- מכוניות חונות ----------
    const carCols = [0xc0392b, 0x2980b9, 0x16a085, 0xf39c12, 0x8e44ad, 0x7f8c8d, 0xd35400, 0x2c3e50];
    const cars = [
      [28, 2.9, 'x'], [-50, -2.9, 'x'], [2.9, -50, 'z'], [-2.9, 46, 'z'],
      [44, 38.9, 'x'], [-33.1, -24, 'z'], [38.9, -24, 'z'], [-60, 33.1, 'x'],
    ];
    cars.forEach(([x, z, dir], k) => {
      const c = G.makeCar(carCols[k % carCols.length]);
      c.rotation.y = dir === 'x' ? (z > 0 ? Math.PI / 2 : -Math.PI / 2) : z > 0 ? Math.PI : 0;
      put(c, x, 0, z);
      if (dir === 'x') addBox(x - 1.95, x + 1.95, z - 0.9, z + 0.9);
      else addBox(x - 0.9, x + 0.9, z - 1.95, z + 1.95);
      W.mapRects.push(dir === 'x' ? { x1: x - 1.9, x2: x + 1.9, z1: z - 0.9, z2: z + 0.9, color: '#ffffff' } : { x1: x - 0.9, x2: x + 0.9, z1: z - 1.9, z2: z + 1.9, color: '#ffffff' });
    });

    // ---------- פנסי רחוב (מופעים) ----------
    const lampPos = [];
    for (const r of ROADS)
      for (let t = -63; t <= 63; t += 9) {
        if (ROADS.some((q) => Math.abs(t - q) < 7)) continue;
        lampPos.push([t, r + 4.4]);
        lampPos.push([r + 4.4, t]);
      }
    const lamps = lampPos.filter(([x, z]) => Math.hypot(x + 18, z - 4.4) > 3 && Math.hypot(x + 12, z + 4.4) > 3);
    const lampGeo = mergeParts([
      { w: 0.4, h: 0.3, d: 0.4, y: 0.15, c: '#2c3039' },
      { g: 'cyl', r: 0.08, h: 3.3, y: 1.8, c: '#3a3f4a', seg: 6 },
      { w: 0.5, h: 0.08, d: 0.5, y: 3.78, c: '#2c3039' },
    ]);
    const postMesh = new T.InstancedMesh(lampGeo, vcMat(), lamps.length);
    const bulbMat = new T.MeshBasicMaterial({ color: 0xcccccc });
    const bulbMesh = new T.InstancedMesh(new T.BoxGeometry(0.36, 0.38, 0.36), bulbMat, lamps.length);
    const glowGeo = new T.PlaneGeometry(6.5, 6.5);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new T.MeshBasicMaterial({ map: G.glowTex('255,214,130'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
    const glowMesh = new T.InstancedMesh(glowGeo, glowMat, lamps.length);
    lamps.forEach(([x, z], i) => {
      m4.makeTranslation(x, 0, z);
      postMesh.setMatrixAt(i, m4);
      m4.makeTranslation(x, 3.55, z);
      bulbMesh.setMatrixAt(i, m4);
      m4.makeTranslation(x, 0.07, z);
      glowMesh.setMatrixAt(i, m4);
      addCircle(x, z, 0.22);
    });
    postMesh.castShadow = true;
    scene.add(postMesh, bulbMesh, glowMesh);

    // ---------- ריהוט רחוב: ספסלים, פחים, ברזי כיבוי ----------
    const benchGeo = mergeParts([
      { w: 1.8, h: 0.1, d: 0.5, y: 0.5, c: '#9c6b3c' },
      { w: 1.8, h: 0.45, d: 0.08, y: 0.85, z: -0.22, c: '#9c6b3c' },
      { w: 0.1, h: 0.5, d: 0.45, x: -0.75, y: 0.25, c: '#333' },
      { w: 0.1, h: 0.5, d: 0.45, x: 0.75, y: 0.25, c: '#333' },
    ]);
    const binGeo = mergeParts([
      { g: 'cyl', r: 0.3, r2: 0.26, h: 0.85, y: 0.43, c: '#2e6b45' },
      { g: 'cyl', r: 0.33, h: 0.08, y: 0.88, c: '#24553a' },
    ]);
    const hydGeo = mergeParts([
      { g: 'cyl', r: 0.16, h: 0.6, y: 0.3, c: '#d62828', seg: 6 },
      { g: 'cyl', r: 0.2, r2: 0.12, h: 0.14, y: 0.66, c: '#b51f1f', seg: 6 },
      { w: 0.5, h: 0.1, d: 0.1, y: 0.4, c: '#b51f1f' },
    ]);
    const props = { bench: [], bin: [], hyd: [] };
    for (const b of blockKinds) {
      for (const [nx, nz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        for (let k = 0; k < 2; k++) {
          const along = (rnd() - 0.5) * 20;
          const x = b.cx + nx * 13.55 + (nz !== 0 ? along : 0), z = b.cz + nz * 13.55 + (nx !== 0 ? along : 0);
          if (lamps.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 1.8)) continue;
          if (nearKeep(x, z, 3.5)) continue;
          if (W.boxes.some((bb) => x > bb.x1 - 0.8 && x < bb.x2 + 0.8 && z > bb.z1 - 0.8 && z < bb.z2 + 0.8)) continue;
          const r = rnd(), ry = Math.atan2(nx, nz);
          if (r < 0.35) {
            props.bench.push([x - nx * 0.15, z - nz * 0.15, ry]);
            addCircle(x, z, 0.45);
          } else if (r < 0.75) {
            props.bin.push([x, z, 0]);
            addCircle(x, z, 0.33);
          } else {
            props.hyd.push([x, z, 0]);
            addCircle(x, z, 0.22);
          }
        }
      }
    }
    for (const [key, geo] of [['bench', benchGeo], ['bin', binGeo], ['hyd', hydGeo]]) {
      const list = props[key];
      if (!list.length) continue;
      const im = new T.InstancedMesh(geo, vcMat(), list.length);
      list.forEach(([x, z, ry], i) => {
        q4.setFromAxisAngle(up, ry);
        p3.set(x, 0, z);
        m4.compose(p3, q4, s3);
        im.setMatrixAt(i, m4);
      });
      im.castShadow = true;
      scene.add(im);
    }

    // ---------- שיחים בחצרות ----------
    for (const b of blockKinds) {
      if (b.kind === 'gas' || b.kind === 'center') continue;
      const n = b.kind === 'park' ? 10 : 9;
      for (let k = 0, tries = 0; k < n && tries < 60; tries++) {
        const x = b.cx + (rnd() - 0.5) * 22.4, z = b.cz + (rnd() - 0.5) * 22.4;
        if (nearKeep(x, z, 2.6)) continue;
        if (W.boxes.some((bb) => x > bb.x1 - 0.9 && x < bb.x2 + 0.9 && z > bb.z1 - 0.9 && z < bb.z2 + 0.9)) continue;
        if (W.circles.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.9)) continue;
        if (b.kind === 'park') {
          const dx = Math.max(45 - x, 0, x - 63), dz = Math.max(45 - z, 0, z - 63);
          const dRing = dx > 0 || dz > 0 ? Math.hypot(dx, dz) : Math.min(x - 45, 63 - x, z - 45, 63 - z);
          if (dRing < 1.8) continue;
        }
        const s = 0.6 + rnd() * 0.5;
        bushes.push({ x, z, s, flower: rnd() < 0.35 });
        addCircle(x, z, 0.5 * s);
        k++;
      }
    }

    // ---------- גבול העיר ועצים מסביב ----------
    const fenceMat = lam(0x8a6a4a);
    boxMesh(158, 0.6, 0.3, fenceMat, 0, 0.3, 78.6);
    boxMesh(158, 0.6, 0.3, fenceMat, 0, 0.3, -78.6);
    boxMesh(0.3, 0.6, 158, fenceMat, 78.6, 0.3, 0);
    boxMesh(0.3, 0.6, 158, fenceMat, -78.6, 0.3, 0);
    for (let k = 0; k < 190; k++) {
      const side = k % 4, along = -100 + rnd() * 200, out = 82 + rnd() * 24;
      const [x, z] = side === 0 ? [along, out] : side === 1 ? [along, -out] : side === 2 ? [out, along] : [-out, along];
      addTree(x, z, 1 + rnd() * 0.7, false);
    }

    const col = new T.Color();
    const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.17, 0.24, 1.6, 6), lam(0x6b4a2b), trees.length);
    const leaves = new T.InstancedMesh(new T.IcosahedronGeometry(1.35, 0), lam(0xffffff, { flatShading: true }), trees.length);
    const leaves2 = new T.InstancedMesh(new T.IcosahedronGeometry(0.95, 0), lam(0xffffff, { flatShading: true }), trees.length);
    trees.forEach((t, i) => {
      const hue = 0.23 + rnd() * 0.09, li = 0.28 + rnd() * 0.08;
      q4.setFromAxisAngle(up, rnd() * 6);
      s3.set(t.s, t.s, t.s);
      p3.set(t.x, 0.8 * t.s, t.z);
      m4.compose(p3, q4, s3);
      trunks.setMatrixAt(i, m4);
      s3.set(t.s, t.s * 0.9, t.s);
      p3.set(t.x, 2.2 * t.s, t.z);
      m4.compose(p3, q4, s3);
      leaves.setMatrixAt(i, m4);
      col.setHSL(hue, 0.48, li);
      leaves.setColorAt(i, col);
      s3.set(t.s, t.s, t.s);
      p3.set(t.x + 0.25 * t.s, 3.05 * t.s, t.z + 0.25 * t.s);
      m4.compose(p3, q4, s3);
      leaves2.setMatrixAt(i, m4);
      col.setHSL(hue + 0.02, 0.5, li + 0.09);
      leaves2.setColorAt(i, col);
    });
    s3.set(1, 1, 1);
    trunks.castShadow = leaves.castShadow = leaves2.castShadow = true;
    leaves.receiveShadow = leaves2.receiveShadow = true;
    scene.add(trunks, leaves, leaves2);

    const bushMesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.75, 0), lam(0xffffff, { flatShading: true }), bushes.length);
    const flowers = bushes.filter((b) => b.flower);
    const flowerMesh = new T.InstancedMesh(new T.BoxGeometry(0.16, 0.16, 0.16), lam(0xffffff), flowers.length * 4);
    let fi = 0;
    bushes.forEach((b, i) => {
      q4.setFromAxisAngle(up, rnd() * 6);
      s3.set(b.s * 1.2, b.s * 0.8, b.s * 1.2);
      p3.set(b.x, 0.45 * b.s, b.z);
      m4.compose(p3, q4, s3);
      bushMesh.setMatrixAt(i, m4);
      col.setHSL(0.25 + rnd() * 0.07, 0.5, 0.26 + rnd() * 0.08);
      bushMesh.setColorAt(i, col);
      if (b.flower) {
        const fc = new T.Color([0xff5e7e, 0xffd23f, 0xffffff, 0xb07cff][(rnd() * 4) | 0]);
        for (let k = 0; k < 4; k++) {
          const a = rnd() * 6.28;
          m4.makeTranslation(b.x + Math.cos(a) * 0.55 * b.s, 0.75 * b.s, b.z + Math.sin(a) * 0.55 * b.s);
          flowerMesh.setMatrixAt(fi, m4);
          flowerMesh.setColorAt(fi++, fc);
        }
      }
    });
    s3.set(1, 1, 1);
    bushMesh.castShadow = bushMesh.receiveShadow = true;
    scene.add(bushMesh, flowerMesh);

    // ---------- צללי עננים נעים ----------
    const cloudTex = G.canvasTex(64, 64, (g) => {
      g.clearRect(0, 0, 64, 64);
      for (let i = 0; i < 9; i++) {
        const cx = rnd() * 64, cy = rnd() * 64, r = 6 + rnd() * 12;
        for (const ox of [-64, 0, 64])
          for (const oy of [-64, 0, 64]) {
            const gr = g.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
            gr.addColorStop(0, 'rgba(10,20,40,0.9)');
            gr.addColorStop(1, 'rgba(10,20,40,0)');
            g.fillStyle = gr;
            g.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
          }
      }
    }, true, true);
    cloudTex.repeat.set(5, 5);
    const cloudMat = new T.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.18, depthWrite: false });
    const clouds = flat(500, 500, cloudMat, 0, 0.09, 0);
    clouds.receiveShadow = false;
    clouds.renderOrder = 1;

    // ---------- יום, לילה ותנועה ----------
    const dayBulb = new T.Color(0xc9c9c9), nightBulb = new T.Color(0xfff0b0);
    W.setNight = function (n) {
      for (const b of W.buildings) b.userData.wall.emissiveIntensity = n * 0.9;
      for (const s of shopFronts) s.emissiveIntensity = n * 0.8;
      bulbMat.color.copy(dayBulb).lerp(nightBulb, n);
      glowMat.opacity = n * 0.6;
      cloudMat.opacity = 0.18 * (1 - n);
      for (const m of W.litSigns) m.emissiveIntensity = 0.3 + n * 0.7;
    };
    W.makeLights = makeLights;
    W.boxMesh = boxMesh;
    W.addBox = addBox;
    W.addCircle = addCircle;
    W.update = function (t) {
      waterTex.offset.set(t * 0.03, t * 0.017);
      cloudTex.offset.set(t * 0.0025, t * 0.0012);
    };
    return W;
  };
})();
