// בניית העיר האמיתית — מרכז הוד השרון — מנתוני OpenStreetMap (data/city.js)
// מספק את אותו ממשק כמו world.js, ובנוסף: התנגשות מצולעים, מפה, שמות רחובות ונקודות לסיפור
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.buildCity = function (scene, D) {
    const rnd = G.rng(5150);
    const W = {
      city: true, noFade: true, HALF: 640, mapExtent: 700,
      buildings: [], litSigns: [], placeLights: {}, places: [], spots: {}, paths: [], mapDirty: false,
    };
    const lam = (c, e) => new T.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const vcMat = (e) => new T.MeshLambertMaterial(Object.assign({ vertexColors: true }, e || {}));
    const pick = (a) => a[(rnd() * a.length) | 0];

    // ================= רשת מרחבית: התנגשויות, בניינים, כבישים =================
    const CELL = 16, cells = new Map();
    const ck = (cx, cz) => (cx + 4096) * 8192 + (cz + 4096);
    function gridAdd(item, x1, z1, x2, z2) {
      for (let cx = Math.floor(x1 / CELL); cx <= Math.floor(x2 / CELL); cx++)
        for (let cz = Math.floor(z1 / CELL); cz <= Math.floor(z2 / CELL); cz++) {
          const k = ck(cx, cz);
          let a = cells.get(k);
          if (!a) cells.set(k, (a = []));
          a.push(item);
        }
    }
    let stamp = 1;
    function near(x1, z1, x2, z2, fn) {
      stamp++;
      for (let cx = Math.floor(x1 / CELL); cx <= Math.floor(x2 / CELL); cx++)
        for (let cz = Math.floor(z1 / CELL); cz <= Math.floor(z2 / CELL); cz++) {
          const a = cells.get(ck(cx, cz));
          if (!a) continue;
          for (const it of a) {
            if (it._s === stamp) continue;
            it._s = stamp;
            fn(it);
          }
        }
    }
    W.addBox = (x1, x2, z1, z2) => gridAdd({ t: 0, x1, x2, z1, z2 }, x1, z1, x2, z2);
    W.addCircle = (x, z, r) => gridAdd({ t: 1, x, z, r }, x - r, z - r, x + r, z + r);
    const addSeg = (ax, az, bx, bz) => gridAdd({ t: 2, ax, az, bx, bz }, Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz));
    W.collide = function (x, z, r, dyn) {
      let hit = false;
      for (let it = 0; it < 2; it++) {
        near(x - r, z - r, x + r, z + r, (o) => {
          if (o.t === 0) {
            if (x + r < o.x1 || x - r > o.x2 || z + r < o.z1 || z - r > o.z2) return;
            const cx = Math.max(o.x1, Math.min(x, o.x2)), cz = Math.max(o.z1, Math.min(z, o.z2));
            const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
            if (d2 >= r * r) return;
            hit = true;
            if (d2 > 1e-8) {
              const d = Math.sqrt(d2);
              x = cx + (dx / d) * r;
              z = cz + (dz / d) * r;
            } else {
              const l = x - o.x1, rr = o.x2 - x, t = z - o.z1, bt = o.z2 - z, m = Math.min(l, rr, t, bt);
              if (m === l) x = o.x1 - r;
              else if (m === rr) x = o.x2 + r;
              else if (m === t) z = o.z1 - r;
              else z = o.z2 + r;
            }
          } else if (o.t === 1) {
            const dx = x - o.x, dz = z - o.z, R = r + o.r, d2 = dx * dx + dz * dz;
            if (d2 >= R * R || d2 < 1e-8) return;
            const d = Math.sqrt(d2);
            x = o.x + (dx / d) * R;
            z = o.z + (dz / d) * R;
            hit = true;
          } else if (o.t === 2) {
            const ex = o.bx - o.ax, ez = o.bz - o.az, L2 = ex * ex + ez * ez;
            let t = L2 ? ((x - o.ax) * ex + (z - o.az) * ez) / L2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const cx = o.ax + ex * t, cz = o.az + ez * t, dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
            if (d2 >= r * r || d2 < 1e-8) return;
            const d = Math.sqrt(d2);
            x = cx + (dx / d) * r;
            z = cz + (dz / d) * r;
            hit = true;
          }
        });
        if (dyn)
          for (const c of dyn) {
            const dx = x - c.x, dz = z - c.z, R = r + c.r, d2 = dx * dx + dz * dz;
            if (d2 >= R * R || d2 < 1e-8) continue;
            const d = Math.sqrt(d2);
            x = c.x + (dx / d) * R;
            z = c.z + (dz / d) * R;
            hit = true;
          }
      }
      const lim = W.HALF - r;
      if (Math.abs(x) > lim || Math.abs(z) > lim) hit = true;
      x = G.clamp(x, -lim, lim);
      z = G.clamp(z, -lim, lim);
      return { x, z, hit };
    };
    function pip(x, z, p) {
      let inside = false;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const xi = p[i], zi = p[i + 1], xj = p[j], zj = p[j + 1];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
      }
      return inside;
    }
    // האם נקודה פנויה (לא בתוך בניין ולא קרוב לקיר/מכשול)
    function isFree(x, z, r) {
      let free = true;
      near(x - r, z - r, x + r, z + r, (o) => {
        if (!free) return;
        if (o.t === 3) {
          if (pip(x, z, o.b.p)) free = false;
        } else if (o.t === 2) {
          const ex = o.bx - o.ax, ez = o.bz - o.az, L2 = ex * ex + ez * ez;
          let t = L2 ? ((x - o.ax) * ex + (z - o.az) * ez) / L2 : 0;
          t = G.clamp(t, 0, 1);
          if (Math.hypot(x - o.ax - ex * t, z - o.az - ez * t) < r) free = false;
        } else if (o.t === 1) {
          if (Math.hypot(x - o.x, z - o.z) < r + o.r) free = false;
        } else if (o.t === 0) {
          if (x + r > o.x1 && x - r < o.x2 && z + r > o.z1 && z - r < o.z2) free = false;
        } else if (o.t === 4 && o.drive) {
          const ex = o.bx - o.ax, ez = o.bz - o.az, L2 = ex * ex + ez * ez;
          let t = L2 ? ((x - o.ax) * ex + (z - o.az) * ez) / L2 : 0;
          t = G.clamp(t, 0, 1);
          if (Math.hypot(x - o.ax - ex * t, z - o.az - ez * t) < o.w / 2 + r * 0.5) free = false;
        }
      });
      return free;
    }

    // ================= כבישים: סיווג ורוחב =================
    const RW = { trunk: 14, primary: 12, secondary: 10.5, tertiary: 9, unclassified: 6.5, residential: 7, living_street: 5.5, service: 4.5, pedestrian: 4, footway: 2.2, path: 2, cycleway: 2.2, steps: 2.2, track: 3 };
    const MAJOR = new Set(['trunk', 'primary', 'secondary', 'tertiary', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link']);
    const PATHS = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'track', 'bridleway', 'corridor']);
    const roads = [];
    for (const r of D.roads) {
      const t = r.t.replace('_link', '');
      if (t === 'construction' || t === 'proposed' || t === 'platform') continue;
      const cls = MAJOR.has(r.t) ? 'major' : PATHS.has(t) ? 'path' : 'minor';
      const w = RW[t] || (cls === 'major' ? 9 : cls === 'path' ? 2 : 6);
      const pts = [];
      for (let i = 0; i < r.p.length; i += 2) pts.push([r.p[i], r.p[i + 1]]);
      if (pts.length < 2) continue;
      const rd = { pts, cls, w, t, name: r.n, ne: r.ne, oneway: r.o === 1 };
      roads.push(rd);
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        gridAdd({ t: 4, ax, az, bx, bz, w, cls, rd, drive: cls !== 'path' }, Math.min(ax, bx) - w, Math.min(az, bz) - w, Math.max(ax, bx) + w, Math.max(az, bz) + w);
      }
    }
    // הנקודה הקרובה ביותר על כביש (לנסיעה)
    function nearestRoad(x, z, maxR, pred) {
      let best = null, bd = 1e9;
      for (let R = 16; R <= (maxR || 120) && !best; R *= 2)
        near(x - R, z - R, x + R, z + R, (o) => {
          if (o.t !== 4 || !o.drive || (pred && !pred(o))) return;
          const ex = o.bx - o.ax, ez = o.bz - o.az, L2 = ex * ex + ez * ez;
          let t = L2 ? ((x - o.ax) * ex + (z - o.az) * ez) / L2 : 0;
          t = G.clamp(t, 0, 1);
          const px = o.ax + ex * t, pz = o.az + ez * t, d = Math.hypot(x - px, z - pz);
          if (d < bd) {
            bd = d;
            const L = Math.sqrt(L2) || 1;
            best = { x: px, z: pz, d, dx: ex / L, dz: ez / L, seg: o };
          }
        });
      return best;
    }
    W.nearestRoad = nearestRoad;
    W.roadList = roads;

    // ================= טקסטורות =================
    const grassDraw = (base, n) => (g) => {
      G.speckle(g, 32, 32, base, rnd, n || 260, 0.36);
      for (let i = 0; i < 24; i++) {
        const x = (rnd() * 32) | 0, y = (rnd() * 31) | 0;
        g.fillStyle = G.shade(base, 0.2);
        g.fillRect(x, y, 1, 1);
        g.fillStyle = G.shade(base, -0.25);
        g.fillRect(x, y + 1, 1, 1);
      }
    };
    const groundTex = G.canvasTex(32, 32, (g) => {
      grassDraw('#8f9d63', 300)(g);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = G.shade('#a89a72', (rnd() - 0.5) * 0.2);
        g.fillRect((rnd() * 32) | 0, (rnd() * 32) | 0, 2, 1);
      }
    }, true);
    groundTex.repeat.set(400, 400);
    const ground = new T.Mesh(new T.PlaneGeometry(2400, 2400), lam(0xffffff, { map: groundTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    const asphalt = (g, w, h) => {
      G.speckle(g, w, h, '#3d3f45', rnd, 220, 0.3);
      g.fillStyle = '#34363b';
      for (let i = 0; i < 3; i++) g.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 3, 1);
    };
    const texMajor = G.canvasTex(32, 32, (g) => {
      asphalt(g, 32, 32);
      g.fillStyle = '#f0d264';
      g.fillRect(15, 0, 2, 16);
      g.fillStyle = '#d8d8d0';
      g.fillRect(2, 0, 1, 32);
      g.fillRect(29, 0, 1, 32);
    }, true);
    const texMinor = G.canvasTex(32, 32, (g) => asphalt(g, 32, 32), true);
    const texPave = G.canvasTex(16, 16, (g) => {
      const tones = ['#c4bcac', '#b6ae9e', '#bdb5a5', '#c9c1b2'];
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          g.fillStyle = tones[(ty * 2 + tx + ((rnd() * 2) | 0)) % 4];
          g.fillRect(tx * 8, ty * 8, 8, 8);
        }
      g.fillStyle = '#9d9585';
      g.fillRect(0, 7, 16, 1);
      g.fillRect(0, 15, 16, 1);
      g.fillRect(7, 0, 1, 16);
      g.fillRect(15, 0, 1, 16);
    }, true);
    const texCurb = G.canvasTex(16, 16, (g) => {
      // מדרכה עם אבן שפה אדומה-לבנה (ישראלית) בצד הכביש
      const tones = ['#c4bcac', '#b6ae9e', '#bdb5a5'];
      for (let y = 0; y < 16; y += 4) for (let x = 0; x < 13; x += 4) { g.fillStyle = tones[(x + y) % 3]; g.fillRect(x, y, 4, 4); }
      g.fillStyle = '#9d9585';
      for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 13, 1);
      for (let y = 0; y < 16; y++) {
        g.fillStyle = (y >> 2) % 2 ? '#e8e4dc' : '#c0392b';
        g.fillRect(13, y, 3, 1);
      }
    }, true);

    // ================= ריבונים: כבישים, מדרכות, שבילים =================
    function Ribbon() {
      return { pos: [], uv: [] };
    }
    function ribbon(buf, pts, w, y, uScale, vLen, sideOffset) {
      let acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
        if (L < 0.01) continue;
        const ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
        const ext = Math.min(w / 2, 4);
        const sx = ax - ux * ext, sz = az - uz * ext, ex = bx + ux * ext, ez = bz + uz * ext;
        const o = sideOffset || 0;
        const h = w / 2;
        const p = [
          [sx + nx * (o - h), sz + nz * (o - h)], [sx + nx * (o + h), sz + nz * (o + h)],
          [ex + nx * (o + h), ez + nz * (o + h)], [ex + nx * (o - h), ez + nz * (o - h)],
        ];
        const v0 = (acc - ext) / vLen, v1 = (acc + L + ext) / vLen;
        const uvs = [[0, v0], [uScale, v0], [uScale, v1], [0, v1]];
        for (const k of [0, 1, 2, 0, 2, 3]) {
          buf.pos.push(p[k][0], y, p[k][1]);
          buf.uv.push(uvs[k][0], uvs[k][1]);
        }
        acc += L;
      }
    }
    function ribbonMesh(buf, mat) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(buf.pos, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(buf.uv, 2));
      g.computeVertexNormals();
      const m = new T.Mesh(g, mat);
      m.receiveShadow = true;
      scene.add(m);
      return m;
    }
    const bufMajor = Ribbon(), bufMinor = Ribbon(), bufPath = Ribbon(), bufWalk = Ribbon(), bufFlood = Ribbon();
    for (const r of roads) {
      if (r.cls === 'path') ribbon(bufPath, r.pts, r.w, 0.022, 1, 2, 0);
      else {
        ribbon(r.cls === 'major' ? bufMajor : bufMinor, r.pts, r.w, r.cls === 'major' ? 0.04 : 0.034, 1, r.w, 0);
        if (r.t !== 'service') {
          ribbon(bufWalk, r.pts, 2.8, 0.03, 1, 2, r.w / 2 + 1.4);
          ribbon(bufWalk, r.pts, 2.8, 0.03, -1, 2, -(r.w / 2 + 1.4));
        }
        if (r.name === 'הבנים') ribbon(bufFlood, r.pts, r.w + 1, 0.06, 1, 4, 0);
      }
    }
    ribbonMesh(bufWalk, lam(0xffffff, { map: texCurb }));
    ribbonMesh(bufPath, lam(0xffffff, { map: texPave }));
    ribbonMesh(bufMinor, lam(0xffffff, { map: texMinor, polygonOffset: true, polygonOffsetFactor: -1 }));
    ribbonMesh(bufMajor, lam(0xffffff, { map: texMajor, polygonOffset: true, polygonOffsetFactor: -2 }));
    W.floodMesh = ribbonMesh(bufFlood, new T.MeshBasicMaterial({ color: 0x4f86c6, transparent: true, opacity: 0, depthWrite: false }));
    W.floodMesh.visible = false;
    W.isFlooded = (x, z) => {
      let f = false;
      near(x - 8, z - 8, x + 8, z + 8, (o) => {
        if (f || o.t !== 4 || o.rd.name !== 'הבנים') return;
        const ex = o.bx - o.ax, ez = o.bz - o.az, L2 = ex * ex + ez * ez;
        let t = L2 ? ((x - o.ax) * ex + (z - o.az) * ez) / L2 : 0;
        t = G.clamp(t, 0, 1);
        if (Math.hypot(x - o.ax - ex * t, z - o.az - ez * t) < o.w / 2 + 0.5) f = true;
      });
      return f;
    };

    // ================= שטחים: פארקים, חניות, בתי ספר =================
    const AREA_STYLE = {
      park: ['#5f9c45', 0.012], garden: ['#679f4a', 0.012], playground: ['#c9b083', 0.013], grass: ['#6da34f', 0.011], recreation_ground: ['#cdbb9b', 0.013],
      village_green: ['#6da34f', 0.011], meadow: ['#86a45a', 0.01], dog_park: ['#7aa456', 0.012], pitch: ['#4f9a48', 0.014], parking: ['#5c5e63', 0.016],
      school: ['#d6c9a6', 0.008], kindergarten: ['#d6c9a6', 0.008], landuse_farmland: ['#93a061', 0.006], orchard: ['#7f9a52', 0.007],
      landuse_construction: ['#a08a6a', 0.009], landuse_retail: ['#c9c1b2', 0.009], wood: ['#5d8a45', 0.01], scrub: ['#82955a', 0.009],
    };
    const areaBufs = {};
    const areaPolys = [];
    for (const a of D.areas) {
      const st = AREA_STYLE[a.k];
      if (!st || a.p.length < 6) continue;
      const contour = [];
      for (let i = 0; i < a.p.length; i += 2) contour.push(new T.Vector2(a.p[i], a.p[i + 1]));
      let tris;
      try {
        tris = T.ShapeUtils.triangulateShape(contour, []);
      } catch (e) {
        continue;
      }
      const key = st[0] + '|' + st[1];
      const b = areaBufs[key] || (areaBufs[key] = { pos: [], col: st[0], y: st[1] });
      for (const [i0, i1, i2] of tris) {
        let A = contour[i0], B = contour[i1], C = contour[i2];
        if ((B.y - A.y) * (C.x - A.x) - (B.x - A.x) * (C.y - A.y) < 0) [B, C] = [C, B];
        b.pos.push(A.x, st[1], A.y, B.x, st[1], B.y, C.x, st[1], C.y);
      }
      areaPolys.push({ k: a.k, n: a.n, p: a.p });
    }
    for (const k in areaBufs) {
      const b = areaBufs[k];
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
      const uv = [];
      for (let i = 0; i < b.pos.length; i += 3) uv.push(b.pos[i] / 6, b.pos[i + 2] / 6);
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      const tex = G.canvasTex(32, 32, grassDraw(b.col, 200), true);
      const m = new T.Mesh(g, lam(0xffffff, { map: tex, polygonOffset: true, polygonOffsetFactor: -0.5 }));
      m.receiveShadow = true;
      scene.add(m);
    }

    // ================= בניינים =================
    // טקסטורת חזית ישראלית: טיח בהיר, תריסים, וילונות, מזגנים; 4×4 חלונות (16×12.8 מטר)
    const resLit = [];
    const resTex = G.canvasTex(64, 64, (g) => {
      G.speckle(g, 64, 64, '#f1ede6', rnd, 600, 0.12);
      for (let cy = 0; cy < 4; cy++) {
        g.fillStyle = '#ddd7cc';
        g.fillRect(0, cy * 16 + 15, 64, 1);
        for (let cx = 0; cx < 4; cx++) {
          const ox = cx * 16, oy = cy * 16, kind = rnd();
          resLit.push(kind);
          g.fillStyle = '#c9c2b6';
          g.fillRect(ox + 3, oy + 3, 10, 10);
          g.fillStyle = '#2a3a52';
          g.fillRect(ox + 4, oy + 4, 8, 8);
          g.fillStyle = '#4e6a8e';
          g.fillRect(ox + 4, oy + 4, 3, 2);
          if (kind < 0.45) {
            // תריס גלילה חצי סגור
            const sh = 2 + ((rnd() * 5) | 0);
            g.fillStyle = '#9da3a8';
            g.fillRect(ox + 4, oy + 4, 8, sh);
            g.fillStyle = '#868c91';
            for (let y = oy + 5; y < oy + 4 + sh; y += 2) g.fillRect(ox + 4, y, 8, 1);
          } else if (kind < 0.7) {
            g.fillStyle = pick(['#e8d8b0', '#c0392b', '#7fb3d5', '#d7bde2', '#f5b041']);
            g.fillRect(ox + 4, oy + 4, 2, 8);
            g.fillRect(ox + 10, oy + 4, 2, 8);
          } else if (kind < 0.82) {
            g.fillStyle = '#9da3a8';
            g.fillRect(ox + 4, oy + 4, 8, 8);
            g.fillStyle = '#868c91';
            for (let y = oy + 5; y < oy + 12; y += 2) g.fillRect(ox + 4, y, 8, 1);
          }
          g.fillStyle = '#d9d3c8';
          g.fillRect(ox + 2, oy + 12, 12, 1);
          if (rnd() < 0.3) {
            // מזגן מתחת לחלון
            g.fillStyle = '#e6e6e2';
            g.fillRect(ox + 9, oy + 13, 5, 2);
            g.fillStyle = '#9a9a96';
            g.fillRect(ox + 10, oy + 13, 3, 1);
          }
        }
      }
    }, true);
    const resEmi = G.canvasTex(64, 64, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 64, 64);
      resLit.forEach((kind, i) => {
        if (kind >= 0.82 || rnd() < 0.4) return;
        const ox = (i % 4) * 16, oy = ((i / 4) | 0) * 16;
        g.fillStyle = rnd() < 0.5 ? '#ffcf6b' : '#ffb347';
        g.fillRect(ox + 4, oy + 4, 8, 8);
      });
    }, true);
    const offTex = G.canvasTex(64, 64, (g) => {
      G.speckle(g, 64, 64, '#e2e4e6', rnd, 300, 0.1);
      for (let cy = 0; cy < 4; cy++) {
        g.fillStyle = '#3a5774';
        g.fillRect(0, cy * 16 + 3, 64, 10);
        g.fillStyle = '#5f86a8';
        g.fillRect(0, cy * 16 + 3, 64, 2);
        for (let cx = 0; cx < 8; cx++) {
          g.fillStyle = '#c6cacd';
          g.fillRect(cx * 8 + 7, cy * 16 + 3, 1, 10);
        }
      }
    }, true);
    const offEmi = G.canvasTex(64, 64, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 64, 64);
      for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 8; cx++) if (rnd() < 0.45) { g.fillStyle = '#ffd890'; g.fillRect(cx * 8, cy * 16 + 3, 7, 10); }
    }, true);
    const roofTex = G.canvasTex(16, 16, (g) => {
      G.speckle(g, 16, 16, '#c8c3b9', rnd, 90, 0.2);
      g.fillStyle = '#b3aea4';
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 0, 1, 16);
    }, true);
    const tileTex = G.canvasTex(32, 32, (g) => {
      for (let ty = 0; ty < 4; ty++)
        for (let tx = 0; tx < 5; tx++) {
          const ox = tx * 8 - (ty % 2) * 4, oy = ty * 8;
          g.fillStyle = '#b8533a';
          g.fillRect(ox, oy, 8, 8);
          g.fillStyle = '#d4694a';
          g.fillRect(ox + 1, oy + 1, 6, 3);
          g.fillStyle = '#8a3a27';
          g.fillRect(ox, oy + 7, 8, 1);
          g.fillRect(ox + 7, oy, 1, 8);
        }
      g.fillStyle = '#ffffff';
      g.fillRect(30, 0, 2, 2);
    }, true);
    const wallRes = new T.MeshLambertMaterial({ map: resTex, emissive: 0xffffff, emissiveMap: resEmi, emissiveIntensity: 0, vertexColors: true });
    const wallOff = new T.MeshLambertMaterial({ map: offTex, emissive: 0xffffff, emissiveMap: offEmi, emissiveIntensity: 0, vertexColors: true });
    const roofMat = new T.MeshLambertMaterial({ map: roofTex, vertexColors: true });
    const gableMat = new T.MeshLambertMaterial({ map: tileTex, vertexColors: true });
    const PLASTER = ['#f4efe6', '#ece4d4', '#e7ddcc', '#f5f2ec', '#dfd8ca', '#ebdec6', '#dccfb8', '#f0e3cb', '#e6e6df', '#dbcaa9', '#d0dadd', '#ead2b6'];
    const HOUSE_K = new Set(['house', 'detached', 'semidetached_house', 'bungalow', 'terrace']);

    function levelsFor(b) {
      if (b.lv) return Math.max(1, Math.min(14, b.lv));
      if (b.hm) return Math.max(1, Math.round(b.hm / 3.2));
      const a = b.area, k = b.kind;
      if (HOUSE_K.has(k)) return 1 + (rnd() < 0.6 ? 1 : 0);
      if (k === 'apartments' || k === 'residential') return a > 300 ? 4 + ((rnd() * 4) | 0) : 3 + ((rnd() * 2) | 0);
      if (k === 'retail' || k === 'commercial' || k === 'supermarket' || k === 'kiosk') return 1 + (a > 400 ? 1 : 0);
      if (k === 'school' || k === 'public' || k === 'civic' || k === 'synagogue' || k === 'religious' || k === 'kindergarten') return 2;
      if (k === 'garage' || k === 'garages' || k === 'shed' || k === 'carport' || k === 'hut' || k === 'roof' || k === 'service') return 1;
      if (k === 'office') return 4 + ((rnd() * 4) | 0);
      if (a < 50) return 1;
      if (a < 160) return 1 + ((rnd() * 2) | 0);
      if (a < 420) return 2 + ((rnd() * 2) | 0);
      if (a < 1000) return 3 + ((rnd() * 3) | 0);
      return 4 + ((rnd() * 3) | 0);
    }

    const B = [];
    for (const d of D.buildings) {
      const p = d.p.slice();
      const n = p.length / 2;
      if (n < 3) continue;
      let A = 0, cx = 0, cz = 0, minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
      for (let i = 0; i < n; i++) {
        const x0 = p[i * 2], z0 = p[i * 2 + 1], x1 = p[((i + 1) % n) * 2], z1 = p[((i + 1) % n) * 2 + 1];
        const c = x0 * z1 - x1 * z0;
        A += c;
        cx += (x0 + x1) * c;
        cz += (z0 + z1) * c;
        minx = Math.min(minx, x0);
        maxx = Math.max(maxx, x0);
        minz = Math.min(minz, z0);
        maxz = Math.max(maxz, z0);
      }
      A /= 2;
      if (Math.abs(A) < 4) continue;
      cx /= 6 * A;
      cz /= 6 * A;
      const b = { p, n, area: Math.abs(A), cx, cz, minx, maxx, minz, maxz, kind: d.k, name: d.n, amen: d.a, lv: d.l, hm: d.h, used: false };
      b.levels = levelsFor(b);
      b.h = b.levels * 3.2;
      b.office = d.k === 'office' || (b.levels >= 6 && rnd() < 0.4);
      b.tint = new T.Color(pick(PLASTER));
      B.push(b);
      gridAdd({ t: 3, b }, minx, minz, maxx, maxz);
      for (let i = 0; i < n; i++) addSeg(p[i * 2], p[i * 2 + 1], p[((i + 1) % n) * 2], p[((i + 1) % n) * 2 + 1]);
    }
    W.B = B;

    // בניית גיאומטריה מאוחדת לפי אריחים (קריאת ציור אחת לכל סוג בכל אריח)
    const TILE = 110, tiles = new Map();
    const tileOf = (x, z) => {
      const k = Math.floor(x / TILE) + ',' + Math.floor(z / TILE);
      let t = tiles.get(k);
      if (!t) tiles.set(k, (t = { res: { p: [], n: [], u: [], c: [] }, off: { p: [], n: [], u: [], c: [] }, roof: { p: [], n: [], u: [], c: [] }, gab: { p: [], n: [], u: [], c: [] } }));
      return t;
    };
    function pushV(buf, x, y, z, nx, ny, nz, u, v, c) {
      buf.p.push(x, y, z);
      buf.n.push(nx, ny, nz);
      buf.u.push(u, v);
      buf.c.push(c.r, c.g, c.b);
    }
    const tmpC = new T.Color();
    function wallsFor(buf, b, y0, y1, uOff) {
      const p = b.p, n = b.n;
      let acc = uOff;
      b.edges = b.edges || [];
      for (let i = 0; i < n; i++) {
        const ax = p[i * 2], az = p[i * 2 + 1], bx = p[((i + 1) % n) * 2], bz = p[((i + 1) % n) * 2 + 1];
        const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
        if (L < 0.05) continue;
        let nx = -dz / L, nz = dx / L;
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        if (pip(mx + nx * 0.08, mz + nz * 0.08, p)) {
          nx = -nx;
          nz = -nz;
        }
        if (y0 === 0) b.edges.push({ ax, az, bx, bz, L, mx, mz, nx, nz });
        const flip = Math.abs(nx - -dz / L) > 1e-6 || Math.abs(nz - dx / L) > 1e-6;
        const ys = y0 === 0 && y1 > 4.6 ? [0, 4.5, y1] : [y0, y1];
        for (let r = 0; r < ys.length - 1; r++) {
          const ya = ys[r], yb = ys[r + 1];
          const ao = (y) => (y0 > 0 || y >= 4.5 ? 1 : 0.6 + 0.4 * Math.pow(G.clamp(y / 4.5, 0, 1), 0.7));
          const ca = tmpC.copy(b.tint).multiplyScalar(ao(ya)).clone(), cb = tmpC.copy(b.tint).multiplyScalar(ao(yb)).clone();
          const u0 = acc / 16, u1 = (acc + L) / 16, va = ya / 12.8, vb = yb / 12.8;
          const V = [
            [ax, ya, az, u0, va, ca], [bx, ya, bz, u1, va, ca], [bx, yb, bz, u1, vb, cb], [ax, yb, az, u0, vb, cb],
          ];
          const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
          for (const k of order) pushV(buf, V[k][0], V[k][1], V[k][2], nx, 0, nz, V[k][3], V[k][4], V[k][5]);
        }
        acc += L;
      }
    }
    function roofFor(buf, b, y, col) {
      const contour = [];
      for (let i = 0; i < b.n; i++) contour.push(new T.Vector2(b.p[i * 2], b.p[i * 2 + 1]));
      let tris;
      try {
        tris = T.ShapeUtils.triangulateShape(contour, []);
      } catch (e) {
        return;
      }
      for (const [i0, i1, i2] of tris) {
        let A = contour[i0], Bv = contour[i1], C = contour[i2];
        if ((Bv.y - A.y) * (C.x - A.x) - (Bv.x - A.x) * (C.y - A.y) < 0) [Bv, C] = [C, Bv];
        for (const v of [A, Bv, C]) pushV(buf, v.x, y, v.y, 0, 1, 0, v.x / 8, v.y / 8, col);
      }
    }
    // גג רעפים לבתים מלבניים קטנים
    function gableFor(buf, b) {
      if (b.n !== 4) return false;
      const e = [];
      for (let i = 0; i < 4; i++) {
        const ax = b.p[i * 2], az = b.p[i * 2 + 1], bx = b.p[((i + 1) % 4) * 2], bz = b.p[((i + 1) % 4) * 2 + 1];
        e.push({ dx: bx - ax, dz: bz - az, L: Math.hypot(bx - ax, bz - az) });
      }
      // מלבן בערך: צלעות נגדיות שוות וזוויות ישרות
      if (Math.abs(e[0].L - e[2].L) > 0.15 * e[0].L || Math.abs(e[1].L - e[3].L) > 0.15 * e[1].L) return false;
      if (Math.abs(e[0].dx * e[1].dx + e[0].dz * e[1].dz) / (e[0].L * e[1].L) > 0.12) return false;
      const long = e[0].L >= e[1].L ? e[0] : e[1], Lx = Math.max(e[0].L, e[1].L), Lz = Math.min(e[0].L, e[1].L);
      const ux = long.dx / long.L, uz = long.dz / long.L, vx = -uz, vz = ux;
      const a = Lx / 2 + 0.35, end = Lx / 2, bw = Lz / 2 + 0.45, rh = Lz * 0.36, y0 = b.h;
      const W2 = (lx, ly, lz) => [b.cx + ux * lx + vx * lz, y0 + ly, b.cz + uz * lx + vz * lz];
      const slope = Math.hypot(bw, rh);
      const white = new T.Color(1, 1, 1);
      const tri = (P, U, C, nrm) => {
        for (let k = 0; k < 3; k++) pushV(buf, P[k][0], P[k][1], P[k][2], nrm[0], nrm[1], nrm[2], U[k][0], U[k][1], C);
      };
      const quad = (q, side) => {
        const nl = [0, bw / slope, (side * rh) / slope];
        const nrm = [vx * nl[2], nl[1], vz * nl[2]];
        const U = [[0, 0], [(2 * a) / 4, 0], [(2 * a) / 4, slope / 3.2], [0, slope / 3.2]];
        const P = q.map((v) => W2(v[0], v[1], v[2]));
        const ord = side > 0 ? [[0, 1, 2], [0, 2, 3]] : [[0, 2, 1], [0, 3, 2]];
        for (const o of ord) tri(o.map((k) => P[k]), o.map((k) => U[k]), white, nrm);
      };
      quad([[-a, 0, bw], [a, 0, bw], [a, rh, 0], [-a, rh, 0]], 1);
      quad([[-a, 0, -bw], [a, 0, -bw], [a, rh, 0], [-a, rh, 0]], -1);
      const wu = [[0.98, 0.98], [0.98, 0.98], [0.98, 0.98]];
      for (const s of [1, -1]) {
        const P = [W2(s * end, 0, Lz / 2), W2(s * end, 0, -Lz / 2), W2(s * end, rh * 0.92, 0)];
        const nrm = [ux * s, 0, uz * s];
        const ord = s > 0 ? [0, 1, 2] : [0, 2, 1];
        tri(ord.map((k) => P[k]), wu, b.tint, nrm);
      }
      return true;
    }

    const solar = [];
    for (const b of B) {
      const t = tileOf(b.cx, b.cz);
      wallsFor(b.office ? t.off : t.res, b, 0, b.h, rnd() * 64);
      const isHouse = HOUSE_K.has(b.kind) || (b.kind === 'yes' && b.area > 70 && b.area < 260 && b.levels <= 2);
      if (isHouse && rnd() < 0.55 && gableFor(t.gab, b)) {
        b.gable = true;
      } else {
        const g = 0.72 + rnd() * 0.14;
        roofFor(t.roof, b, b.h, new T.Color(g, g * 0.98, g * 0.95));
        // דוד שמש על הגג — סמל של כל עיר בישראל
        if (!b.office && b.area > 50 && b.area < 1200 && b.kind !== 'garage' && b.kind !== 'roof') {
          const cnt = b.area < 250 ? 1 : b.area < 600 ? 2 : 3;
          for (let k = 0; k < cnt; k++) {
            const x = b.cx + (rnd() - 0.5) * Math.min(6, b.maxx - b.minx - 2), z = b.cz + (rnd() - 0.5) * Math.min(6, b.maxz - b.minz - 2);
            if (pip(x, z, b.p)) solar.push([x, b.h, z, ((rnd() * 4) | 0) * (Math.PI / 2)]);
          }
        }
      }
    }
    for (const t of tiles.values()) {
      for (const [key, mat, cast] of [['res', wallRes, true], ['off', wallOff, true], ['roof', roofMat, false], ['gab', gableMat, true]]) {
        const bf = t[key];
        if (!bf.p.length) continue;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(bf.p, 3));
        g.setAttribute('normal', new T.Float32BufferAttribute(bf.n, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(bf.u, 2));
        g.setAttribute('color', new T.Float32BufferAttribute(bf.c, 3));
        g.computeBoundingSphere();
        const m = new T.Mesh(g, mat);
        m.castShadow = cast;
        m.receiveShadow = true;
        m.userData = { wall: mat, roof: mat, mats: [], fade: 1, tr: false, hit: false };
        scene.add(m);
        W.buildings.push(m);
      }
    }
    const solarGeo = G.mergeParts([
      { w: 1.3, h: 0.06, d: 1.0, y: 0.5, z: 0.25, rx: -0.55, c: '#22406a' },
      { g: 'cyl', r: 0.3, h: 1.3, y: 0.95, z: -0.4, rz: Math.PI / 2, c: '#ececec' },
      { w: 0.06, h: 0.7, d: 0.06, x: -0.5, y: 0.35, z: -0.4, c: '#777' },
      { w: 0.06, h: 0.7, d: 0.06, x: 0.5, y: 0.35, z: -0.4, c: '#777' },
    ]);
    const solarIM = new T.InstancedMesh(solarGeo, vcMat(), solar.length);
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), s3 = new T.Vector3(1, 1, 1), p3 = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
    solar.forEach(([x, y, z, ry], i) => {
      q4.setFromAxisAngle(UP, ry);
      p3.set(x, y, z);
      m4.compose(p3, q4, s3);
      solarIM.setMatrixAt(i, m4);
    });
    solarIM.castShadow = true;
    scene.add(solarIM);

    // ================= עזרים לבניית מקומות בסיפור =================
    function put(obj, x, y, z, parent) {
      obj.position.set(x, y, z);
      (parent || scene).add(obj);
      return obj;
    }
    function boxMesh(w, h, d, mat, x, y, z, parent) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      m.castShadow = m.receiveShadow = true;
      return put(m, x, y, z, parent);
    }
    W.boxMesh = boxMesh;
    function sign(text, w, h, x, y, z, o, parent) {
      o = o || {};
      const tex = G.textTex(text, o);
      const mat = new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.lit ? 0.3 : 0.08 });
      if (o.lit) W.litSigns.push(mat);
      return put(new T.Mesh(new T.PlaneGeometry(w, h), mat), x, y, z, parent);
    }
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
    W.makeLights = makeLights;
    // מסגרת מקומית: מוצא, וזווית שבה +z המקומי פונה החוצה (לרחוב)
    const F = (fr, lx, lz) => [fr.x + lx * Math.cos(fr.ang) + lz * Math.sin(fr.ang), fr.z - lx * Math.sin(fr.ang) + lz * Math.cos(fr.ang)];
    const spot = (fr, lx, lz, face) => {
      const [x, z] = F(fr, lx, lz);
      return { x, z, rot: fr.ang + (face || 0) };
    };
    const grp = (fr) => {
      const g = new T.Group();
      g.position.set(fr.x, 0, fr.z);
      g.rotation.y = fr.ang;
      scene.add(g);
      return g;
    };
    const circLocal = (fr, lx, lz, r) => {
      const [x, z] = F(fr, lx, lz);
      W.addCircle(x, z, r);
    };
    function buildingNear(x, z, pred) {
      let best = null, bd = 1e9;
      for (const b of B) {
        if (b.used || (pred && !pred(b))) continue;
        const d = Math.hypot(b.cx - x, b.cz - z);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      return best;
    }
    // חזית הבניין: הצלע הארוכה מספיק שהכי קרובה לכביש ופונה אליו
    function frontOf(b) {
      let best = null, bs = 1e9;
      for (const e of b.edges) {
        if (e.L < 3) continue;
        const r = nearestRoad(e.mx, e.mz, 120, (o) => o.rd.t !== 'service');
        if (!r) continue;
        const toR = Math.hypot(r.x - e.mx, r.z - e.mz) || 1;
        const dot = (e.nx * (r.x - e.mx) + e.nz * (r.z - e.mz)) / toR;
        const sc = r.d - dot * 8 - Math.min(e.L, 12) * 0.3;
        if (sc < bs) {
          bs = sc;
          best = { x: e.mx, z: e.mz, ang: Math.atan2(e.nx, e.nz), w: e.L, b, road: r };
        }
      }
      b.used = true;
      if (!best) {
        const r = nearestRoad(b.cx, b.cz, 400) || { x: b.cx + 10, z: b.cz, dx: 1, dz: 0, d: 10 };
        best = { x: b.cx, z: b.cz, ang: Math.atan2(r.x - b.cx, r.z - b.cz), w: 6, b, road: r };
      }
      return best;
    }
    const roadSpot = (r, r0) => ({ x: r.x, z: r.z, r: r0 || 7, h: Math.atan2(r.dx, r.dz) });
    const pois = D.pois || [];
    const poi = (re) => pois.find((p) => p.n && re.test(p.n));
    const findB = (re) => B.find((b) => b.name && re.test(b.name));
    const areaBy = (re) => areaPolys.find((a) => a.n && re.test(a.n));
    function centroidOf(p) {
      let x = 0, z = 0;
      for (let i = 0; i < p.length; i += 2) {
        x += p[i];
        z += p[i + 1];
      }
      return [x / (p.length / 2), z / (p.length / 2)];
    }
    const SP = W.spots;
    const placeName = (he, en, x, z, r) => W.places.push({ he, en, x, z, r });

    // ================= בית חב״ד =================
    const chB = buildingNear(285, -175, (b) => b.area > 90 && b.area < 450 && b.levels <= 3 && !b.name && !b.gable);
    const CH = frontOf(chB);
    W.chabadFrame = CH;
    const chG = grp(CH);
    put(new T.Mesh(new T.PlaneGeometry(1.7, 2.5), lam(0xffd23f)), 0, 1.25, 0.04, chG);
    put(new T.Mesh(new T.PlaneGeometry(1.3, 2.2), lam(0x6b3e1f)), 0, 1.1, 0.05, chG);
    boxMesh(2.2, 0.15, 0.6, lam(0x9a9a9a), 0, 0.075, 0.32, chG);
    sign('בית חב״ד', 2.8, 0.7, 0, 2.95, 0.06, { w: 96, h: 24, size: 16, bg: '#1b3a8a', fg: '#ffffff', border: '#ffd23f', lit: true }, chG);
    W.places.chabadDoor = spot(CH, 0, 0.7);
    SP.moshe = spot(CH, -1.3, 1.4);
    SP.playerStart = spot(CH, 0.3, 2.3);
    SP.crate = spot(CH, -2.9, 2.6);
    SP.kitchen = spot(CH, 2.4, 0.9);
    SP.zalmanAfter = spot(CH, -2.5, 1.0);
    SP.vanStart = roadSpot(CH.road);
    // כלי רכב נוספים ליד בית חב״ד: קטנוע ואופניים על המדרכה, מכונית על הכביש
    {
      const r = CH.road, w = r.seg.w;
      let nx = -r.dz, nz = r.dx;
      if (nx * (CH.x - r.x) + nz * (CH.z - r.z) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const side = (along, off) => ({ x: r.x + r.dx * along + nx * off, z: r.z + r.dz * along + nz * off, h: Math.atan2(r.dx, r.dz) });
      SP.rides = [
        Object.assign({ type: 'scooter', id: 'scooter1' }, side(5, w / 2 + 1.3)),
        Object.assign({ type: 'bike', id: 'bike1' }, side(6.3, w / 2 + 1.3)),
        Object.assign({ type: 'car', id: 'car1' }, side(-8, Math.min(w / 4, 1.6))),
      ];
    }
    placeName('בית חב״ד', 'Chabad House', CH.x, CH.z, 9);
    const L2 = new T.Group(), L2roof = new T.Group(), L3 = new T.Group();
    L2.visible = L2roof.visible = L3.visible = false;
    chG.add(L2, L2roof, L3);
    const chH = chB.h;
    sign('בית חב״ד', 6, 1.5, 0, chH + 1.0, -0.5, { w: 128, h: 32, size: 22, bg: '#1b3a8a', fg: '#ffd23f', border: '#ffd23f', lit: true }, L2roof);
    sign('מטבח שבת', 2.2, 0.55, 2.4, 2.1, 0.06, { w: 96, h: 24, size: 15, bg: '#ffd23f', fg: '#1b3a8a', border: '#1b3a8a', lit: true }, L2);
    boxMesh(2.4, 0.08, 0.9, lam(0xffffff), 2.0, 0.82, 2.4, L2);
    for (const [lx, lz] of [[1.0, 2.1], [3.0, 2.1], [1.0, 2.7], [3.0, 2.7]]) boxMesh(0.08, 0.8, 0.08, lam(0x6b3e1f), lx, 0.4, lz, L2);
    boxMesh(0.6, 0.25, 0.3, lam(0xc98a3a), 1.5, 0.98, 2.4, L2);
    boxMesh(0.14, 0.4, 0.14, lam(0x7b1e3a), 2.6, 1.06, 2.4, L2);
    const fw = Math.min(CH.w / 2 - 0.4, 5);
    makeLights([-fw, 3.6, 0.2], [fw, 3.6, 0.2], 12, L2);
    for (const fx of [-fw + 0.5, fw - 0.5]) {
      boxMesh(0.08, 2.2, 0.08, lam(0xdddddd), fx, chH + 1.1, -1.5, L2roof);
      boxMesh(0.04, 0.7, 1.1, lam(0xffd23f), fx, chH + 1.85, -0.95, L2roof);
    }
    // דרגה 3: קומה נוספת על אותו קונטור
    {
      const buf = { p: [], n: [], u: [], c: [] }, rb = { p: [], n: [], u: [], c: [] };
      wallsFor(buf, chB, chH, chH + 3.2, 0);
      roofFor(rb, chB, chH + 3.2, new T.Color(0.8, 0.78, 0.75));
      for (const [bf, mat] of [[buf, wallRes], [rb, roofMat]]) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(bf.p, 3));
        g.setAttribute('normal', new T.Float32BufferAttribute(bf.n, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(bf.u, 2));
        g.setAttribute('color', new T.Float32BufferAttribute(bf.c, 3));
        const m = new T.Mesh(g, mat);
        m.castShadow = m.receiveShadow = true;
        m.position.set(-CH.x, 0, -CH.z);
        const holder = new T.Group();
        holder.rotation.y = -CH.ang;
        holder.add(m);
        L3.add(holder);
      }
      sign('מרכז קהילתי חב״ד', 7.5, 1.4, 0, chH + 4.3, -0.5, { w: 160, h: 30, size: 19, bg: '#1b3a8a', fg: '#ffd23f', border: '#ffd23f', lit: true }, L3);
      makeLights([-fw, 6.8, 0.2], [fw, 6.8, 0.2], 12, L3);
    }
    let l2Applied = false;
    W.setChabadLevel = function (l) {
      L2.visible = l >= 2;
      L2roof.visible = l === 2;
      L3.visible = l >= 3;
      if (l >= 2 && !l2Applied) {
        l2Applied = true;
        circLocal(CH, 2.0, 2.4, 1.2);
      }
    };
    W.dormTable = null;

    // ================= מכולת כהן =================
    const grB = buildingNear(394, -437, (b) => b.area > 60 && b.area < 1500);
    const GR = frontOf(grB);
    const grG = grp(GR);
    const awW = Math.min(GR.w - 0.6, 9);
    const awnTex = G.canvasTex(16, 4, (g) => {
      for (let x = 0; x < 16; x++) {
        g.fillStyle = (x >> 1) % 2 ? '#ffffff' : '#2e9d5f';
        g.fillRect(x, 0, 1, 4);
      }
    }, true);
    awnTex.repeat.set(Math.round(awW / 2), 1);
    const awn = boxMesh(awW, 0.12, 1.5, lam(0xffffff, { map: awnTex }), 0, 2.9, 0.75, grG);
    awn.rotation.x = 0.25;
    sign('מכולת כהן', 4.4, 0.85, 0, 3.75, 0.06, { w: 112, h: 24, size: 16, bg: '#2e7d4f', fg: '#ffffff', border: '#ffd23f', lit: true }, grG);
    put(new T.Mesh(new T.PlaneGeometry(1.4, 2.2), lam(0x2b3a55)), 1.6, 1.1, 0.05, grG);
    const fruit = [0xe74c3c, 0xf39c12, 0x27ae60, 0xf1c40f];
    for (let k = 0; k < 3; k++) {
      boxMesh(0.85, 0.5, 0.7, lam(0x9c6b3c), -1.4 - k * 0.95, 0.25, 0.6, grG);
      boxMesh(0.75, 0.12, 0.6, lam(fruit[k]), -1.4 - k * 0.95, 0.55, 0.6, grG);
      circLocal(GR, -1.4 - k * 0.95, 0.6, 0.45);
    }
    SP.cohen = spot(GR, 1.6, 1.3);
    W.placeLights.cohen = makeLights([-awW / 2, 3.45, 0.15], [awW / 2, 3.45, 0.15], 11, grG);
    placeName('מכולת כהן', 'Cohen Grocery', GR.x, GR.z, 9);

    // ================= בית הכנסת =================
    const shB = findB(/האשכנזי/) || findB(/בית כנסת|בית הכנסת/) || buildingNear(540, -396);
    const SH = frontOf(shB);
    const shG = grp(SH);
    sign('בית הכנסת', 3, 0.7, 0, Math.min(shB.h - 0.6, 4.2), 0.06, { w: 96, h: 22, size: 14, bg: '#e9e4d8', fg: '#1b3a8a', border: '#1b3a8a' }, shG);
    const shw = Math.min(SH.w / 2 - 0.4, 5);
    W.shulLights = makeLights([-shw, 3.4, 0.2], [shw, 3.4, 0.2], 10, shG);
    W.shulLights.visible = false;
    SP.shulDoor = spot(SH, 0, 0.6);
    SP.zoneShul = roadSpot(SH.road, 7);
    placeName(shB.name || 'בית הכנסת', 'Synagogue', SH.x, SH.z, 12);

    // ================= תחנת אוטובוס ברחוב הבנים =================
    {
      const r = nearestRoad(335, -90, 200, (o) => o.rd.name === 'הבנים') || nearestRoad(335, -90, 200);
      let nx = -r.dz, nz = r.dx;
      const off = r.seg.w / 2 + 2.0;
      if (!isFree(r.x + nx * off, r.z + nz * off, 1.6)) {
        nx = -nx;
        nz = -nz;
      }
      const BF = { x: r.x + nx * off, z: r.z + nz * off, ang: Math.atan2(-nx, -nz), w: 4 };
      const bG = grp(BF);
      const shelterMat = lam(0x2f6f9f);
      boxMesh(3.6, 0.15, 1.5, shelterMat, 0, 2.5, -0.1, bG);
      boxMesh(3.4, 2.3, 0.06, new T.MeshLambertMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.55 }), 0, 1.25, -0.75, bG);
      boxMesh(0.12, 2.5, 0.12, shelterMat, -1.7, 1.25, -0.7, bG);
      boxMesh(0.12, 2.5, 0.12, shelterMat, 1.7, 1.25, -0.7, bG);
      boxMesh(2.4, 0.12, 0.5, lam(0x8b5a2b), 0, 0.55, -0.45, bG);
      boxMesh(0.1, 2.8, 0.1, lam(0x666666), 2.4, 1.4, 0.4, bG);
      sign('תחנה', 1.0, 0.6, 2.4, 2.75, 0.46, { w: 48, h: 28, size: 14, bg: '#2f6f9f', fg: '#ffffff', border: '#ffffff' }, bG);
      for (const lx of [-1.4, 0, 1.4]) circLocal(BF, lx, -0.7, 0.45);
      SP.yossi = spot(BF, 1.3, 0.8);
      W.placeLights.yossi = makeLights([-1.7, 2.7, 0.6], [1.7, 2.7, 0.6], 7, bG);
      placeName('תחנת הבנים', 'HaBanim Bus Stop', BF.x, BF.z, 6);
    }

    // ================= בית הקפה =================
    const cfB = buildingNear(395, -304, (b) => b.area > 50 && b.area < 2000);
    const CF = frontOf(cfB);
    const cfG = grp(CF);
    sign('קפה בוקר טוב', 4.6, 0.85, 0, 3.0, 0.06, { w: 128, h: 24, size: 15, bg: '#6b3e1f', fg: '#ffe7b0', border: '#ffd23f', lit: true }, cfG);
    for (const tx of [-2.4, 2.4]) {
      put(new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.08, 8), lam(0xffffff)), tx, 0.78, 1.9, cfG);
      boxMesh(0.08, 2.3, 0.08, lam(0x444444), tx, 1.15, 1.9, cfG);
      const umb = new T.Mesh(new T.ConeGeometry(1.2, 0.5, 8), lam(tx < 0 ? 0xd62828 : 0x1b3a8a, { flatShading: true }));
      umb.castShadow = true;
      put(umb, tx, 2.35, 1.9, cfG);
      circLocal(CF, tx, 1.9, 0.6);
    }
    SP.daniel = spot(CF, 0, 1.5);
    const cw = Math.min(CF.w / 2 - 0.3, 4.5);
    W.placeLights.daniel = makeLights([-cw, 3.35, 0.2], [cw, 3.35, 0.2], 10, cfG);
    placeName('קפה בוקר טוב', 'Boker Tov Cafe', CF.x, CF.z, 8);

    // ================= תחנת הדלק =================
    {
      const fp = poi(/סונול/) || pois.find((p) => p.k === 'amenity:fuel') || { x: 441, z: -136 };
      const r = nearestRoad(fp.x, fp.z, 120);
      const ang = Math.atan2(r.x - fp.x, r.z - fp.z);
      // מזיזים את מרכז התחנה עד שיש מקום פנוי לגגון
      let cx = fp.x, cz = fp.z;
      for (let k = 0; k < 8 && !isFree(cx, cz, 3.2); k++) {
        cx += Math.sin(ang) * 1.5;
        cz += Math.cos(ang) * 1.5;
      }
      const GF = { x: cx, z: cz, ang };
      const gG = grp(GF);
      const roomy = isFree(cx, cz, 5);
      if (roomy) {
        boxMesh(9, 0.5, 6, lam(0xffffff), 0, 4.6, 0, gG);
        boxMesh(9.1, 0.22, 6.1, lam(0x1f5fbf), 0, 4.4, 0, gG);
        for (const [px, pz] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5]]) {
          boxMesh(0.35, 4.3, 0.35, lam(0xdddddd), px, 2.15, pz, gG);
          circLocal(GF, px, pz, 0.3);
        }
        sign('סונול', 2.6, 0.6, 0, 5.2, 3.06, { w: 80, h: 20, size: 14, bg: '#1f5fbf', fg: '#ffd23f', border: '#ffffff', lit: true }, gG);
        W.placeLights.roi = makeLights([-4.3, 4.2, 3.05], [4.3, 4.2, 3.05], 12, gG, 0.15);
      } else W.placeLights.roi = makeLights([-2.5, 2.8, 0.8], [2.5, 2.8, 0.8], 8, gG, 0.15);
      for (const px of [-1.8, 1.8]) {
        boxMesh(0.8, 1.6, 1.1, lam(0x1f5fbf), px, 0.8, 0, gG);
        boxMesh(0.82, 0.4, 0.55, lam(0x222222), px, 1.25, 0, gG);
        circLocal(GF, px, 0, 0.7);
      }
      SP.roi = spot(GF, 0, 1.4);
      SP.genHome = spot(GF, 2.6, 2.0);
      SP.kiosk = spot(GF, -2.8, 1.8);
      sign('נתיכים · שמן · מים', 2.4, 0.5, -2.8, 1.6, 1.25, { w: 96, h: 20, size: 11, bg: '#ffd23f', fg: '#1f5fbf', border: '#1f5fbf' }, gG);
      boxMesh(2.4, 1.1, 0.5, lam(0xe8e2d6), -2.8, 0.55, 1.0, gG);
      circLocal(GF, -2.8, 1.0, 0.7);
      // רכב תקוע של שמעון (משימה 2)
      let carSpot = null;
      for (const [lx, lz] of [[6.5, 2.5], [-6.5, 2.5], [6.5, -2], [-6.5, -2], [0, 6]]) {
        const [x, z] = F(GF, lx, lz);
        if (isFree(x, z, 2.2)) {
          carSpot = [lx, lz];
          break;
        }
      }
      if (carSpot) {
        const stuck = G.makeCar(0x7f8c8d);
        stuck.position.set(carSpot[0], 0, carSpot[1]);
        const hood = new T.Mesh(new T.BoxGeometry(1.7, 0.08, 1.2), lam(0x7f8c8d));
        hood.position.set(0, 1.45, 1.5);
        hood.rotation.x = -0.9;
        stuck.add(hood);
        gG.add(stuck);
        circLocal(GF, carSpot[0], carSpot[1] + 1.1, 1.0);
        circLocal(GF, carSpot[0], carSpot[1] - 1.1, 1.0);
        SP.shimon = spot(GF, carSpot[0] - 1.6 * Math.sign(carSpot[0] || 1), carSpot[1] + 1.5);
      } else SP.shimon = spot(GF, -1.5, 3.2);
      placeName('תחנת הדלק סונול', 'Sonol Gas Station', cx, cz, 12);
    }

    // ================= פארק השחר =================
    {
      const pa = areaBy(/פארק השחר/) || areaPolys.find((a) => a.k === 'park');
      const [pcx, pcz] = centroidOf(pa.p);
      const path = [];
      for (let i = 0; i < pa.p.length; i += 2) {
        const dx = pa.p[i] - pcx, dz = pa.p[i + 1] - pcz, L = Math.hypot(dx, dz) || 1;
        const k = Math.max(0.3, 1 - 4 / L);
        path.push([pcx + dx * k, pcz + dz * k]);
      }
      W.jogPath = path;
      SP.ido = { x: path[0][0], z: path[0][1], rot: 0 };
      // ספסל ואברהם במרכז הפארק
      let bx = pcx, bz = pcz;
      if (!pip(bx, bz, pa.p)) [bx, bz] = path[(path.length / 2) | 0];
      const PF = { x: bx, z: bz, ang: 0 };
      const pG = grp(PF);
      boxMesh(1.7, 0.12, 0.55, lam(0x8b5a2b), 0, 0.5, 0, pG);
      boxMesh(1.7, 0.5, 0.1, lam(0x8b5a2b), 0, 0.8, -0.25, pG);
      W.addCircle(bx, bz, 0.8);
      SP.avraham = { x: bx + 1.5, z: bz + 0.6, rot: 0 };
      const lights = new T.Group();
      boxMesh(0.12, 3, 0.12, lam(0x444444), -4, 1.5, 2.2, lights);
      boxMesh(0.12, 3, 0.12, lam(0x444444), 4, 1.5, 2.2, lights);
      makeLights([-4, 2.9, 2.2], [4, 2.9, 2.2], 14, lights, 0.4);
      pG.add(lights);
      W.placeLights.ido = lights;
      const flowerCols = [0xff5e7e, 0xffd23f, 0xffffff, 0xb07cff];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        boxMesh(0.35, 0.3, 0.35, lam(flowerCols[k % 4]), Math.cos(a) * 3.2, 0.15, Math.sin(a) * 3.2, pG);
      }
      placeName(pa.n || 'פארק השחר', 'HaShachar Park', pcx, pcz, 45);
    }

    // ================= רחבת השחר: מקום החנוכייה =================
    {
      const pl = areaBy(/רחבת השחר/) || areaPolys.find((a) => a.k === 'recreation_ground');
      let [cx, cz] = pl ? centroidOf(pl.p) : [356, 46];
      for (let k = 0; k < 10 && !isFree(cx, cz, 3); k++) cx += 2;
      const r = nearestRoad(cx, cz, 150);
      const PL = { x: cx, z: cz, ang: Math.atan2(r.x - cx, r.z - cz) };
      SP.menorah = { x: cx, z: cz, rot: PL.ang };
      SP.juncs = [spot(PL, -2.6, 1.0), spot(PL, 2.6, 1.0), spot(PL, 0.5, -2.4)];
      SP.genPlaced = spot(PL, -2.4, -2.0);
      SP.zonePlaza = roadSpot(r, 8);
      SP.crowd = [];
      for (let ring = 0; ring < 2; ring++)
        for (let k = 0; k < 7; k++) {
          const a = -1.2 + (k / 6) * 2.4, rad = 4.6 + ring * 1.6;
          const [x, z] = F(PL, Math.sin(a) * rad, Math.cos(a) * rad);
          if (isFree(x, z, 0.5)) SP.crowd.push({ x, z });
        }
      if (SP.crowd.length < 6) for (let k = 0; k < 8; k++) SP.crowd.push(spot(PL, -3.5 + k, 5));
      SP.helperRoi = { from: spot(PL, 7, 6), to: spot(PL, 2.2, 2.6) };
      SP.helperDaniel = { from: spot(PL, -7, 6), to: spot(PL, -2.2, 2.6) };
      placeName((pl && pl.n) || 'רחבת השחר', 'HaShachar Plaza', cx, cz, 18);
    }

    // ================= ״הבאר — מקום לצעירים״: הסטודנטים =================
    {
      const yb = findB(/הבאר/) || buildingNear(586, -321);
      const YF = frontOf(yb);
      const yG = grp(YF);
      const table = new T.Group();
      table.visible = false;
      yG.add(table);
      boxMesh(3.2, 0.08, 1.0, lam(0xffffff), 0, 0.82, 2.0, table);
      for (const [lx, lz] of [[-1.4, 1.6], [1.4, 1.6], [-1.4, 2.4], [1.4, 2.4]]) boxMesh(0.08, 0.8, 0.08, lam(0x6b3e1f), lx, 0.4, lz, table);
      boxMesh(0.6, 0.25, 0.3, lam(0xc98a3a), -0.8, 0.98, 2.0, table);
      boxMesh(0.14, 0.4, 0.14, lam(0x7b1e3a), 0.1, 1.06, 2.0, table);
      boxMesh(0.5, 0.3, 0.5, lam(0x555555), 0.9, 1.0, 2.0, table);
      const candleMat = new T.MeshBasicMaterial({ color: 0xffd27a });
      for (const cx of [-1.3, -1.0]) {
        boxMesh(0.08, 0.35, 0.08, lam(0xffffff), cx, 1.04, 1.75, table);
        boxMesh(0.07, 0.1, 0.07, candleMat, cx, 1.27, 1.75, table);
      }
      const yw = Math.min(YF.w / 2 - 0.3, 4.5);
      makeLights([-yw, 3.2, 0.2], [yw, 3.2, 0.2], 11, table);
      W.dormTable = table;
      sign('הבאר · מקום לצעירים', 4.8, 0.7, 0, 3.0, 0.06, { w: 144, h: 22, size: 13, bg: '#5b3f8c', fg: '#ffffff', border: '#ffd23f', lit: true }, yG);
      SP.alon = spot(YF, -1.8, 3.0);
      SP.maya = spot(YF, 1.8, 3.0);
      SP.zoneDorm = roadSpot(YF.road, 7);
      placeName('הבאר — מקום לצעירים', 'HaBe\'er Youth Center', YF.x, YF.z, 10);
    }

    // ================= הבית של ר׳ זלמן =================
    {
      const zb = buildingNear(-420, 300, (b) => b.area > 80 && b.area < 600 && !b.name);
      const ZF = frontOf(zb);
      const zG = grp(ZF);
      boxMesh(0.5, 0.08, 0.5, lam(0x8b5a2b), 0.9, 0.45, 1.1, zG);
      boxMesh(0.5, 0.5, 0.08, lam(0x8b5a2b), 0.9, 0.7, 0.88, zG);
      for (const [lx, lz] of [[0.7, 0.9], [1.1, 0.9], [0.7, 1.3], [1.1, 1.3]]) boxMesh(0.05, 0.45, 0.05, lam(0x5a3a1a), lx, 0.22, lz, zG);
      boxMesh(0.4, 0.5, 0.4, lam(0x9c6b3c), -1.0, 0.25, 0.6, zG);
      SP.zalman = spot(ZF, 0.2, 1.4);
    }

    // קטנועים ואופניים פזורים ליד מקומות מרכזיים
    for (const [k, p] of [['scooter', SP.zonePlaza], ['bike', SP.zonePlaza], ['bike', SP.zoneDorm], ['scooter', SP.zoneShul], ['bike', SP.avraham], ['scooter', SP.cohen]]) {
      if (!p) continue;
      const r = nearestRoad(p.x, p.z, 80);
      if (!r) continue;
      let nx = -r.dz, nz = r.dx;
      for (const s of [1, -1]) {
        const x = r.x + nx * s * (r.seg.w / 2 + 1.3) + r.dx * 4, z = r.z + nz * s * (r.seg.w / 2 + 1.3) + r.dz * 4;
        if (isFree(x, z, 0.8)) {
          SP.rides.push({ type: k, id: k + SP.rides.length, x, z, h: Math.atan2(r.dx, r.dz) });
          break;
        }
      }
    }

    // ================= עצים, דקלים, פנסים, רכבים חונים =================
    const trees = [], palms = [], lamps = [], cars = [];
    const treeOK = (x, z, r) => isFree(x, z, r);
    for (const rd of roads) {
      if (rd.cls === 'path' || rd.t === 'service') continue;
      let acc = 0, nextT = rnd() * 8, nextL = rnd() * 20, nextC = 4 + rnd() * 10;
      for (let i = 0; i < rd.pts.length - 1; i++) {
        const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 0.1) continue;
        const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
        for (let s = 0; s < L; s += 1) {
          const d = acc + s, x = ax + ux * s, z = az + uz * s;
          if (d >= nextT) {
            nextT = d + 9 + rnd() * 6;
            for (const side of [1, -1]) {
              if (rnd() < 0.4) continue;
              const tx = x + nx * side * (rd.w / 2 + 2.6), tz = z + nz * side * (rd.w / 2 + 2.6);
              if (treeOK(tx, tz, 1.2)) {
                (rd.cls === 'major' && rnd() < 0.45 ? palms : trees).push([tx, tz, 0.85 + rnd() * 0.45]);
                W.addCircle(tx, tz, 0.4);
              }
            }
          }
          if (rd.cls === 'major' && d >= nextL) {
            nextL = d + 24 + rnd() * 6;
            const lx = x + nx * (rd.w / 2 + 0.9), lz = z + nz * (rd.w / 2 + 0.9);
            if (treeOK(lx, lz, 0.6)) {
              lamps.push([lx, lz]);
              W.addCircle(lx, lz, 0.22);
            }
          }
          if (rd.cls === 'minor' && d >= nextC) {
            nextC = d + 7 + rnd() * 16;
            if (rnd() < 0.45 && rd.w >= 6) {
              const side = rnd() < 0.5 ? 1 : -1, off = rd.w / 2 - 1.1;
              const cx = x + nx * side * off, cz = z + nz * side * off;
              let ok = true;
              near(cx - 4, cz - 4, cx + 4, cz + 4, (o) => {
                if (o.t === 4 && o.rd !== rd && o.drive) {
                  const ex = o.bx - o.ax, ez = o.bz - o.az, L2 = ex * ex + ez * ez;
                  let t = L2 ? ((cx - o.ax) * ex + (cz - o.az) * ez) / L2 : 0;
                  t = G.clamp(t, 0, 1);
                  if (Math.hypot(cx - o.ax - ex * t, cz - o.az - ez * t) < o.w / 2 + 3) ok = false;
                }
              });
              if (ok && Math.hypot(cx - SP.vanStart.x, cz - SP.vanStart.z) > 8) {
                cars.push([cx, cz, Math.atan2(ux, uz) + (rnd() < 0.5 ? Math.PI : 0)]);
                W.addCircle(cx + ux * 1.1, cz + uz * 1.1, 0.95);
                W.addCircle(cx - ux * 1.1, cz - uz * 1.1, 0.95);
              }
            }
          }
        }
        acc += L;
      }
    }
    // עצים בפארקים ובחצרות
    for (const a of areaPolys) {
      if (!['park', 'garden', 'grass', 'village_green', 'dog_park', 'wood', 'orchard', 'scrub'].includes(a.k)) continue;
      let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
      for (let i = 0; i < a.p.length; i += 2) {
        minx = Math.min(minx, a.p[i]);
        maxx = Math.max(maxx, a.p[i]);
        minz = Math.min(minz, a.p[i + 1]);
        maxz = Math.max(maxz, a.p[i + 1]);
      }
      const n = Math.min(60, ((maxx - minx) * (maxz - minz)) / 160);
      for (let k = 0; k < n; k++) {
        const x = minx + rnd() * (maxx - minx), z = minz + rnd() * (maxz - minz);
        if (!pip(x, z, a.p) || !treeOK(x, z, 1.5)) continue;
        if (W.jogPath && W.jogPath.some((p) => Math.hypot(p[0] - x, p[1] - z) < 2.5)) continue;
        (rnd() < 0.15 ? palms : trees).push([x, z, 0.9 + rnd() * 0.6]);
        W.addCircle(x, z, 0.45);
      }
    }
    for (let k = 0; k < 2600 && trees.length < 2400; k++) {
      const x = (rnd() - 0.5) * 1280, z = (rnd() - 0.5) * 1280;
      if (!treeOK(x, z, 1.8)) continue;
      if (nearestRoad(x, z, 16)) {
        const r = nearestRoad(x, z, 16);
        if (r && r.d < r.seg.w / 2 + 3) continue;
      }
      trees.push([x, z, 0.8 + rnd() * 0.6]);
      W.addCircle(x, z, 0.45);
    }
    const col = new T.Color();
    {
      const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.17, 0.24, 1.6, 6), lam(0x6b4a2b), trees.length);
      const leaves = new T.InstancedMesh(new T.IcosahedronGeometry(1.35, 0), lam(0xffffff, { flatShading: true }), trees.length);
      const leaves2 = new T.InstancedMesh(new T.IcosahedronGeometry(0.95, 0), lam(0xffffff, { flatShading: true }), trees.length);
      trees.forEach(([x, z, s], i) => {
        const hue = 0.22 + rnd() * 0.09, li = 0.27 + rnd() * 0.08;
        q4.setFromAxisAngle(UP, rnd() * 6);
        s3.set(s, s, s);
        p3.set(x, 0.8 * s, z);
        m4.compose(p3, q4, s3);
        trunks.setMatrixAt(i, m4);
        s3.set(s, s * 0.9, s);
        p3.set(x, 2.2 * s, z);
        m4.compose(p3, q4, s3);
        leaves.setMatrixAt(i, m4);
        col.setHSL(hue, 0.45, li);
        leaves.setColorAt(i, col);
        s3.set(s, s, s);
        p3.set(x + 0.25 * s, 3.05 * s, z + 0.25 * s);
        m4.compose(p3, q4, s3);
        leaves2.setMatrixAt(i, m4);
        col.setHSL(hue + 0.02, 0.48, li + 0.09);
        leaves2.setColorAt(i, col);
      });
      trunks.castShadow = leaves.castShadow = leaves2.castShadow = true;
      scene.add(trunks, leaves, leaves2);
    }
    {
      // דקלים: גזע גבוה ועלים כמו כוכב
      const frond = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        frond.push({ w: 0.35, h: 0.06, d: 2.4, x: Math.sin(a) * 1.0, y: 0, z: Math.cos(a) * 1.0, ry: a, rx: 0.35, c: k % 2 ? '#3f7d34' : '#4d8f3c' });
      }
      const frondGeo = G.mergeParts(frond);
      const pTr = new T.InstancedMesh(new T.CylinderGeometry(0.16, 0.24, 6, 6), lam(0x8a6a44), palms.length);
      const pLf = new T.InstancedMesh(frondGeo, vcMat(), palms.length);
      palms.forEach(([x, z, s], i) => {
        q4.setFromAxisAngle(UP, rnd() * 6);
        s3.set(s, s, s);
        p3.set(x, 3 * s, z);
        m4.compose(p3, q4, s3);
        pTr.setMatrixAt(i, m4);
        p3.set(x, 6 * s, z);
        m4.compose(p3, q4, s3);
        pLf.setMatrixAt(i, m4);
      });
      pTr.castShadow = pLf.castShadow = true;
      scene.add(pTr, pLf);
    }
    const lampGeo = G.mergeParts([
      { w: 0.4, h: 0.3, d: 0.4, y: 0.15, c: '#2c3039' },
      { g: 'cyl', r: 0.08, h: 4.6, y: 2.4, c: '#3a3f4a', seg: 6 },
      { w: 0.5, h: 0.08, d: 0.5, y: 4.78, c: '#2c3039' },
    ]);
    const postIM = new T.InstancedMesh(lampGeo, vcMat(), lamps.length);
    const bulbMat = new T.MeshBasicMaterial({ color: 0xcccccc });
    const bulbIM = new T.InstancedMesh(new T.BoxGeometry(0.36, 0.38, 0.36), bulbMat, lamps.length);
    const glowGeo = new T.PlaneGeometry(8, 8);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new T.MeshBasicMaterial({ map: G.glowTex('255,214,130'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
    const glowIM = new T.InstancedMesh(glowGeo, glowMat, lamps.length);
    lamps.forEach(([x, z], i) => {
      m4.makeTranslation(x, 0, z);
      postIM.setMatrixAt(i, m4);
      m4.makeTranslation(x, 4.55, z);
      bulbIM.setMatrixAt(i, m4);
      m4.makeTranslation(x, 0.08, z);
      glowIM.setMatrixAt(i, m4);
    });
    postIM.castShadow = true;
    scene.add(postIM, bulbIM, glowIM);
    {
      const carGeo = G.mergeParts([
        { w: 1.8, h: 0.75, d: 3.9, y: 0.65, c: '#ffffff' },
        { w: 1.62, h: 0.44, d: 2.02, y: 1.24, z: -0.25, c: '#26303d' },
        { w: 1.6, h: 0.14, d: 1.9, y: 1.52, z: -0.25, c: '#ffffff' },
        { w: 0.24, h: 0.6, d: 0.6, x: -0.86, y: 0.3, z: 1.25, c: '#1a1a1a' },
        { w: 0.24, h: 0.6, d: 0.6, x: 0.86, y: 0.3, z: 1.25, c: '#1a1a1a' },
        { w: 0.24, h: 0.6, d: 0.6, x: -0.86, y: 0.3, z: -1.25, c: '#1a1a1a' },
        { w: 0.24, h: 0.6, d: 0.6, x: 0.86, y: 0.3, z: -1.25, c: '#1a1a1a' },
      ]);
      const carIM = new T.InstancedMesh(carGeo, vcMat(), cars.length);
      const CAR_COLS = [0xc0392b, 0x2980b9, 0x16a085, 0xf39c12, 0x8e44ad, 0x7f8c8d, 0xecf0f1, 0x2c3e50, 0xbdc3c7, 0x34495e, 0xd35400];
      cars.forEach(([x, z, ry], i) => {
        q4.setFromAxisAngle(UP, ry);
        p3.set(x, 0, z);
        m4.compose(p3, q4, s3);
        carIM.setMatrixAt(i, m4);
        carIM.setColorAt(i, col.set(pick(CAR_COLS)));
      });
      carIM.castShadow = true;
      scene.add(carIM);
    }

    // ================= חזיתות חנויות לאורך רחובות ראשיים =================
    const SHOPS = [['פיצה', '#c0392b'], ['פלאפל', '#e67e22'], ['מכולת', '#27ae60'], ['קפה', '#6b3e1f'], ['ספרים', '#2c3e50'], ['פרחים', '#8e44ad'], ['מספרה', '#2980b9'], ['בורקס', '#d35400'], ['יודאיקה', '#1b3a8a'], ['ירקות', '#3f8f3a'], ['אופטיקה', '#16a085'], ['שווארמה', '#a0522d']];
    const shopFronts = [];
    const shopBase = G.canvasTex(32, 20, (g) => {
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
      g.fillStyle = '#8a8a8a';
      g.fillRect(0, 18, 32, 2);
    }, true);
    const shopEmi = G.canvasTex(32, 20, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 32, 20);
      g.fillStyle = '#ffd890';
      g.fillRect(2, 2, 18, 15);
    }, true);
    const signMats = {};
    for (const b of B) {
      if (b.used || b.office || b.area < 60 || b.area > 3000 || !b.edges) continue;
      let best = null, bd = 1e9;
      for (const e of b.edges) {
        if (e.L < 5) continue;
        const r = nearestRoad(e.mx, e.mz, 16, (o) => o.cls === 'major');
        if (!r || r.d > r.seg.w / 2 + 6) continue;
        const dot = e.nx * (r.x - e.mx) + e.nz * (r.z - e.mz);
        if (dot <= 0) continue;
        if (r.d < bd) {
          bd = r.d;
          best = e;
        }
      }
      if (!best || rnd() < 0.25) continue;
      b.shop = true;
      (W.shops || (W.shops = [])).push({ x: best.mx + best.nx * 1.6, z: best.mz + best.nz * 1.6, ang: Math.atan2(best.nx, best.nz), nx: best.nx, nz: best.nz, ux: (best.bx - best.ax) / best.L, uz: (best.bz - best.az) / best.L });
      const fl = Math.min(best.L - 0.6, 14);
      const tex = shopBase.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(fl / 4)), 1);
      const front = new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: shopEmi, emissiveIntensity: 0 });
      shopFronts.push(front);
      const kind = pick(SHOPS);
      const sm = signMats[kind[0]] || (signMats[kind[0]] = (() => {
        const t = G.textTex(kind[0], { w: 128, h: 24, size: 17, bg: kind[1], fg: '#ffffff', border: '#ffffff' });
        const m = new T.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15 });
        W.litSigns.push(m);
        return m;
      })());
      const g = new T.Group();
      g.position.set(best.mx, 0, best.mz);
      g.rotation.y = Math.atan2(best.nx, best.nz);
      const fp = new T.Mesh(new T.PlaneGeometry(fl, 2.55), front);
      fp.position.set(0, 1.3, 0.05);
      const sp = new T.Mesh(new T.PlaneGeometry(Math.min(fl, 5), 0.7), sm);
      sp.position.set(0, 3.0, 0.07);
      g.add(fp, sp);
      scene.add(g);
    }

    // ================= מרפסות, כניסות ומספרי בתים =================
    // מאוחדים לרשת אחת לכל אריח, כך שאלפי הפרטים לא מכבידים על הציור
    {
      const detailTiles = new Map();
      const addD = (x, z, spec) => {
        const k = Math.floor(x / TILE) + ',' + Math.floor(z / TILE);
        let a = detailTiles.get(k);
        if (!a) detailTiles.set(k, (a = []));
        a.push(spec);
      };
      const RAILS = ['#9fc4d6', '#e8e4dc', '#3a3f46', '#c9c2b6'];
      const DOORS = ['#6b3e1f', '#3d3d3d', '#7a5a3a', '#2c3e50', '#8a8a8a'];
      let houseNo = 1;
      for (const b of B) {
        if (!b.edges || b.area < 40 || b.kind === 'garage' || b.kind === 'roof' || b.kind === 'shed') continue;
        // הצלע הקדמית: הקרובה ביותר לכביש ופונה אליו
        let front = null, fs = 1e9;
        for (const e of b.edges) {
          if (e.L < 3) continue;
          const r = nearestRoad(e.mx, e.mz, 40);
          if (!r) continue;
          const dot = e.nx * (r.x - e.mx) + e.nz * (r.z - e.mz);
          if (dot <= 0) continue;
          if (r.d < fs) {
            fs = r.d;
            front = e;
          }
        }
        const ang = (e) => Math.atan2(-(e.bz - e.az) / e.L, (e.bx - e.ax) / e.L);
        // כניסה: דלת, משקוף, מנורה ושלט מספר כחול
        if (front && !b.shop && !b.used && !b.office) {
          const ux = (front.bx - front.ax) / front.L, uz = (front.bz - front.az) / front.L;
          const t = front.L * (0.3 + rnd() * 0.4);
          const x = front.ax + ux * t, z = front.az + uz * t, ry = ang(front);
          const P = (o, ly) => [x + front.nx * o, z + front.nz * o];
          const [dx, dz] = P(0.05), [fx, fz] = P(0.03), [sx, sz] = P(0.25), [nx, nz] = P(0.04);
          addD(x, z, { w: 1.6, h: 2.5, d: 0.06, x: fx, y: 1.25, z: fz, ry, c: '#d9d3c8' });
          addD(x, z, { w: 1.2, h: 2.2, d: 0.1, x: dx, y: 1.1, z: dz, ry, c: pick(DOORS) });
          addD(x, z, { w: 1.9, h: 0.12, d: 0.6, x: sx, y: 0.06, z: sz, ry, c: '#b9b3a8' });
          addD(x, z, { w: 1.9, h: 0.1, d: 0.8, x: sx, y: 2.62, z: sz, ry, c: '#cfc8bb' });
          const [px, pz] = [nx + ux * 1.15, nz + uz * 1.15];
          addD(x, z, { w: 0.34, h: 0.24, d: 0.04, x: px, y: 1.9, z: pz, ry, c: '#1f5fbf' });
          b.no = houseNo++;
        }
        // מרפסות בבנייני דירות
        if (b.levels >= 3 && !b.office) {
          const rail = pick(RAILS);
          for (const e of b.edges) {
            if (e.L < 6.5) continue;
            const isFront = e === front;
            if (!isFront && rnd() < 0.55) continue;
            const ux = (e.bx - e.ax) / e.L, uz = (e.bz - e.az) / e.L, ry = ang(e);
            const n = Math.min(3, Math.floor(e.L / 5.5));
            for (let k = 0; k < n; k++) {
              const t = ((k + 0.5) / n) * e.L;
              for (let fl = 1; fl < b.levels; fl++) {
                const y = fl * 3.2 + 0.05;
                const cx = e.ax + ux * t, cz = e.az + uz * t;
                const at = (o) => [cx + e.nx * o, cz + e.nz * o];
                const [sx, sz] = at(0.6), [rx, rz] = at(1.18);
                addD(cx, cz, { w: 3.0, h: 0.16, d: 1.2, x: sx, y, z: sz, ry, c: '#d8d2c6' });
                addD(cx, cz, { w: 3.0, h: 0.95, d: 0.05, x: rx, y: y + 0.55, z: rz, ry, c: rail });
                for (const s of [-1.48, 1.48]) addD(cx, cz, { w: 0.05, h: 0.95, d: 1.2, x: sx + ux * s, y: y + 0.55, z: sz + uz * s, ry, c: rail });
                if (rnd() < 0.25) addD(cx, cz, { w: 0.4, h: 0.45, d: 0.4, x: sx + ux * 0.9, y: y + 0.3, z: sz + uz * 0.9, ry, c: '#3f8f3a' });
              }
            }
          }
        }
      }
      const dMat = vcMat();
      for (const specs of detailTiles.values()) {
        const m = new T.Mesh(G.mergeParts(specs), dMat);
        m.castShadow = true;
        m.receiveShadow = true;
        scene.add(m);
      }
    }

    // ================= מסלולי הליכה להולכי רגל =================
    for (const rd of roads) {
      if (rd.cls === 'path' || rd.t === 'service') continue;
      let len = 0;
      for (let i = 0; i < rd.pts.length - 1; i++) len += Math.hypot(rd.pts[i + 1][0] - rd.pts[i][0], rd.pts[i + 1][1] - rd.pts[i][1]);
      if (len < 40) continue;
      for (const side of [1, -1]) {
        const off = side * (rd.w / 2 + 1.4);
        const pts = rd.pts.map((p, i) => {
          const a = rd.pts[Math.max(0, i - 1)], b = rd.pts[Math.min(rd.pts.length - 1, i + 1)];
          const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
          return [p[0] - (dz / L) * off, p[1] + (dx / L) * off];
        });
        W.paths.push({ pts, closed: false });
      }
    }

    // ================= מפה ושמות מקומות =================
    W.drawMap = function (g, S, E) {
      const X = (x) => (x + E) * S, Z = (z) => (z + E) * S;
      g.fillStyle = '#8f9d63';
      g.fillRect(0, 0, 2 * E * S, 2 * E * S);
      const poly = (p, fill, stroke) => {
        g.beginPath();
        g.moveTo(X(p[0]), Z(p[1]));
        for (let i = 2; i < p.length; i += 2) g.lineTo(X(p[i]), Z(p[i + 1]));
        g.closePath();
        g.fillStyle = fill;
        g.fill();
        if (stroke) {
          g.strokeStyle = stroke;
          g.lineWidth = 1;
          g.stroke();
        }
      };
      for (const a of areaPolys) {
        const st = AREA_STYLE[a.k];
        if (st) poly(a.p, st[0]);
      }
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const pass of ['walk', 'road']) {
        for (const r of roads) {
          if (pass === 'walk' && r.cls === 'path') continue;
          g.strokeStyle = pass === 'walk' ? '#c9c1b2' : r.cls === 'major' ? '#f2f2f2' : r.cls === 'path' ? '#d8cdb5' : '#e2e2e2';
          g.lineWidth = (pass === 'walk' ? r.w + 5 : r.w) * S;
          g.beginPath();
          g.moveTo(X(r.pts[0][0]), Z(r.pts[0][1]));
          for (const p of r.pts) g.lineTo(X(p[0]), Z(p[1]));
          g.stroke();
        }
      }
      for (const b of B) poly(b.p, b.office ? '#9fb1c2' : '#c9b99d', 'rgba(60,50,40,0.5)');
      poly(chB.p, '#3b6fd8', '#ffd23f');
    };
    W.locationName = function (x, z) {
      for (const p of W.places) if (Math.hypot(x - p.x, z - p.z) < p.r) return [p.he, p.en];
      const r = nearestRoad(x, z, 40, (o) => !!o.rd.name);
      if (r && r.d < 30) return [r.seg.rd.name, r.seg.rd.ne || 'Hod HaSharon'];
      return ['הוד השרון', 'Hod HaSharon'];
    };

    // ================= יום, לילה ותנועה =================
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
    cloudTex.repeat.set(10, 10);
    const cloudMat = new T.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.15, depthWrite: false });
    const clouds = new T.Mesh(new T.PlaneGeometry(1600, 1600), cloudMat);
    clouds.rotation.x = -Math.PI / 2;
    clouds.position.y = 0.1;
    clouds.renderOrder = 1;
    scene.add(clouds);
    const dayBulb = new T.Color(0xc9c9c9), nightBulb = new T.Color(0xfff0b0);
    W.setNight = function (n) {
      wallRes.emissiveIntensity = wallOff.emissiveIntensity = n * 0.9;
      for (const s of shopFronts) s.emissiveIntensity = n * 0.8;
      bulbMat.color.copy(dayBulb).lerp(nightBulb, n);
      glowMat.opacity = n * 0.6;
      cloudMat.opacity = 0.15 * (1 - n);
      for (const m of W.litSigns) m.emissiveIntensity = 0.3 + n * 0.7;
    };
    W.update = function (t) {
      cloudTex.offset.set(t * 0.0012, t * 0.0006);
    };
    return W;
  };
})();
