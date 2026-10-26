// מודלים פשוטים בסגנון low-poly: אנשים, טנק המבצעים ומכוניות חונות
(function () {
  'use strict';
  const G = window.G, T = THREE;

  const geoCache = {};
  function bgeo(w, h, d) {
    const k = w + '_' + h + '_' + d;
    return geoCache[k] || (geoCache[k] = new T.BoxGeometry(w, h, d));
  }
  const matCache = {};
  function lmat(c) {
    return matCache[c] || (matCache[c] = new T.MeshLambertMaterial({ color: c }));
  }
  function box(parent, w, h, d, c, x, y, z) {
    const m = new T.Mesh(bgeo(w, h, d), typeof c === 'number' ? lmat(c) : c);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  G.box = box;
  G.lmat = lmat;

  // דמות: כל איבר מאוחד לרשת אחת עם צבעי קודקודים (6 קריאות ציור לדמות במקום ~40)
  const personMat = new T.MeshLambertMaterial({ vertexColors: true });
  const geoMemo = new Map();
  function limb(parts) {
    const key = JSON.stringify(parts);
    let geo = geoMemo.get(key);
    if (!geo) geoMemo.set(key, (geo = G.mergeParts(parts)));
    const m = new T.Mesh(geo, personMat);
    m.castShadow = true;
    return m;
  }

  G.makePerson = function (o) {
    o = o || {};
    const g = new T.Group();
    const skin = o.skin !== undefined ? o.skin : 0xf1c9a0;
    const pants = o.pants !== undefined ? o.pants : 0x333333;
    const shirt = o.shirt !== undefined ? o.shirt : 0xffffff;
    const top = o.jacket !== undefined ? o.jacket : shirt;
    const shoes = o.shoes !== undefined ? o.shoes : 0x1c1c1c;
    const longSleeve = o.jacket !== undefined;
    const cyl = (r, r2, h, x, y, z, c, seg, extra) => Object.assign({ g: 'cyl', r, r2, h, x, y, z, c, seg: seg || 8 }, extra || {});
    const bx = (w, h, d, x, y, z, c, extra) => Object.assign({ w, h, d, x, y, z, c }, extra || {});
    const sph = (r, x, y, z, c, sx, sy, sz, hemi) => ({ g: 'sph', r, x, y, z, c, sx: sx || 1, sy: sy || 1, sz: sz || 1, hemi: !!hemi });

    // רגליים
    const legParts = [];
    if (o.shorts) {
      legParts.push(cyl(0.095, 0.085, 0.4, 0, -0.2, 0, pants));
      legParts.push(cyl(0.065, 0.055, 0.46, 0, -0.62, 0, skin));
    } else legParts.push(cyl(0.09, 0.07, 0.86, 0, -0.43, 0, pants));
    legParts.push(bx(0.13, 0.09, 0.27, 0, -0.87, 0.05, shoes));
    const legL = new T.Group(), legR = new T.Group();
    legL.position.set(-0.11, 0.92, 0);
    legR.position.set(0.11, 0.92, 0);
    legL.add(limb(legParts));
    legR.add(limb(legParts));
    g.add(legL, legR);

    // גוף: אגן, פלג גוף, חזה, צוואר ואביזרים
    const tp = [
      bx(0.36, 0.2, 0.22, 0, 0.95, 0, pants),
      cyl(0.21, 0.17, 0.62, 0, 1.33, 0, top, 10, { sz: 0.62 }),
      sph(0.21, 0, 1.6, 0, top, 1, 0.35, 0.62, true),
      cyl(0.05, 0.055, 0.12, 0, 1.68, 0, skin),
    ];
    if (o.jacket !== undefined) tp.push(bx(0.11, 0.5, 0.02, 0, 1.36, 0.135, shirt));
    if (o.apron !== undefined) tp.push(bx(0.32, 0.6, 0.02, 0, 1.12, 0.14, o.apron));
    if (o.tzitzit) tp.push(bx(0.02, 0.32, 0.02, -0.17, 0.78, 0.08, 0xffffff), bx(0.02, 0.32, 0.02, 0.17, 0.78, 0.08, 0xffffff));
    if (o.backpack !== undefined) tp.push(bx(0.34, 0.42, 0.16, 0, 1.33, -0.2, o.backpack));
    const torso = limb(tp);
    g.add(torso);

    // ידיים
    const armParts = (right) => {
      const a = [cyl(0.058, 0.05, 0.34, 0, -0.17, 0, top), cyl(0.048, 0.042, 0.3, 0, -0.47, 0, longSleeve ? top : skin), sph(0.047, 0, -0.65, 0.01, skin, 0.9, 1.1, 0.8)];
      if (right && o.phone) a.push(bx(0.05, 0.13, 0.08, 0, -0.68, 0.06, 0x111111));
      return a;
    };
    const armL = new T.Group(), armR = new T.Group();
    armL.position.set(-0.25, 1.58, 0);
    armR.position.set(0.25, 1.58, 0);
    armL.add(limb(armParts(false)));
    armR.add(limb(armParts(true)));
    g.add(armL, armR);

    // ראש: פנים, שיער, זקן וכובע
    const brow = o.hair !== undefined ? o.hair : o.beard !== undefined ? o.beard : 0x3a2a1a;
    const hp = [
      sph(0.115, 0, 0, 0, skin, 1, 1.15, 1.05),
      bx(0.03, 0.05, 0.05, 0, -0.01, 0.12, skin),
      bx(0.03, 0.05, 0.03, -0.115, 0, 0, skin),
      bx(0.03, 0.05, 0.03, 0.115, 0, 0, skin),
      bx(0.028, 0.022, 0.01, -0.042, 0.025, 0.112, 0x1a1a1a),
      bx(0.028, 0.022, 0.01, 0.042, 0.025, 0.112, 0x1a1a1a),
      bx(0.04, 0.01, 0.01, -0.042, 0.052, 0.114, brow),
      bx(0.04, 0.01, 0.01, 0.042, 0.052, 0.114, brow),
      bx(0.04, 0.008, 0.01, 0, -0.06, 0.112, 0x9a4a3a),
    ];
    if (o.hair !== undefined) hp.push(sph(0.123, 0, 0.015, -0.005, o.hair, 1, 1.15, 1.07, true), bx(0.2, 0.12, 0.05, 0, -0.02, -0.1, o.hair));
    if (o.beard !== undefined) hp.push(sph(0.1, 0, -0.085, 0.045, o.beard, 1.05, 0.95, 0.75), bx(0.04, 0.1, 0.12, -0.1, -0.03, 0.01, o.beard), bx(0.04, 0.1, 0.12, 0.1, -0.03, 0.01, o.beard));
    if (o.hat === 'fedora') hp.push(cyl(0.21, 0.21, 0.02, 0, 0.1, 0, 0x111111, 14), cyl(0.115, 0.13, 0.15, 0, 0.18, 0, 0x151515, 12), cyl(0.131, 0.131, 0.035, 0, 0.125, 0, 0x2c2c2c, 12));
    if (o.kippah !== undefined) hp.push(cyl(0.07, 0.075, 0.02, 0, 0.13, -0.03, o.kippah, 10));
    if (o.cap !== undefined) hp.push(sph(0.125, 0, 0.03, 0, o.cap, 1, 0.9, 1.05, true), bx(0.16, 0.02, 0.12, 0, 0.04, 0.15, o.cap));
    if (o.headphones)
      hp.push(
        bx(0.27, 0.025, 0.04, 0, o.cap !== undefined ? 0.15 : 0.14, 0, 0x222222),
        cyl(0.05, 0.05, 0.04, -0.13, 0, 0, 0xe74c3c, 10, { rz: Math.PI / 2 }),
        cyl(0.05, 0.05, 0.04, 0.13, 0, 0, 0xe74c3c, 10, { rz: Math.PI / 2 })
      );
    const head = new T.Group();
    head.position.set(0, 1.85, 0);
    head.add(limb(hp));
    g.add(head);
    return { group: g, legL, legR, armL, armR, head, torso };
  };

  // מחזיר את גובה הקפיצה הקטנה של ההליכה
  G.animatePerson = function (p, phase, amt) {
    const s = Math.sin(phase) * 0.6 * amt;
    p.legL.rotation.x = s;
    p.legR.rotation.x = -s;
    p.armL.rotation.x = -s * 0.75;
    p.armR.rotation.x = s * 0.75;
    p.armL.rotation.z = -0.06;
    p.armR.rotation.z = 0.06;
    p.head.rotation.z = 0;
    p.torso.rotation.y = s * 0.12;
    return Math.abs(Math.cos(phase)) * 0.05 * amt;
  };

  G.makeVan = function () {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    box(body, 2.1, 1.75, 4.6, 0xf4f1e8, 0, 1.3, 0);
    box(body, 2.12, 0.32, 4.62, 0x1b3a8a, 0, 0.78, 0);
    box(body, 2.12, 0.12, 4.62, 0xffd23f, 0, 1.0, 0);
    box(body, 1.9, 0.7, 0.04, 0x22334d, 0, 1.72, 2.31);
    box(body, 0.04, 0.6, 1.0, 0x22334d, -1.06, 1.78, 1.5);
    box(body, 0.04, 0.6, 1.0, 0x22334d, 1.06, 1.78, 1.5);
    box(body, 2.0, 0.25, 0.16, 0x555555, 0, 0.55, 2.33);
    box(body, 2.0, 0.25, 0.16, 0x555555, 0, 0.55, -2.33);
    const lightMat = new T.MeshBasicMaterial({ color: 0xfff1c4 });
    box(body, 0.42, 0.22, 0.05, lightMat, -0.7, 1.2, 2.32);
    box(body, 0.42, 0.22, 0.05, lightMat, 0.7, 1.2, 2.32);
    box(body, 1.0, 0.3, 0.05, 0x2a2a2a, 0, 1.2, 2.33);
    box(body, 0.12, 0.3, 0.3, 0x222222, -1.16, 1.75, 1.95);
    box(body, 0.12, 0.3, 0.3, 0x222222, 1.16, 1.75, 1.95);
    box(body, 1.7, 0.08, 2.6, 0x9a9a9a, 0, 2.21, -0.6);
    box(body, 0.04, 1.2, 0.5, 0x2b3a55, 1.06, 1.45, 2.0);
    box(body, 0.04, 1.2, 0.5, 0x2b3a55, -1.06, 1.45, 2.0);
    box(body, 0.3, 0.3, 0.05, 0xd62828, -0.8, 1.2, -2.32);
    box(body, 0.3, 0.3, 0.05, 0xd62828, 0.8, 1.2, -2.32);

    const signMat = new T.MeshLambertMaterial({
      map: G.textTex('מבצע תפילין', { w: 128, h: 26, size: 18, bg: '#ffffff', fg: '#1b3a8a', border: '#1b3a8a' }),
    });
    const sR = new T.Mesh(new T.PlaneGeometry(3.0, 0.62), signMat);
    sR.position.set(1.07, 1.55, -0.45);
    sR.rotation.y = Math.PI / 2;
    body.add(sR);
    const sL = new T.Mesh(new T.PlaneGeometry(3.0, 0.62), signMat);
    sL.position.set(-1.07, 1.55, -0.45);
    sL.rotation.y = -Math.PI / 2;
    body.add(sL);
    const rear = new T.Mesh(
      new T.PlaneGeometry(1.7, 0.45),
      new T.MeshLambertMaterial({ map: G.textTex('בית חב״ד', { w: 96, h: 24, size: 16, bg: '#1b3a8a', fg: '#ffd23f' }) })
    );
    rear.position.set(0, 1.7, -2.32);
    rear.rotation.y = Math.PI;
    body.add(rear);

    // רמקול על הגג
    box(body, 0.12, 0.3, 0.12, 0x555555, 0, 2.3, 0.2);
    box(body, 0.7, 0.2, 0.7, 0x777777, 0, 2.27, 0.2);
    const hornGeo = new T.CylinderGeometry(0.34, 0.12, 0.75, 8);
    const h1 = new T.Mesh(hornGeo, lmat(0xd9d9d9));
    h1.rotation.x = Math.PI / 2;
    h1.position.set(0, 2.62, 0.6);
    h1.castShadow = true;
    body.add(h1);
    const h2 = new T.Mesh(hornGeo, lmat(0xd9d9d9));
    h2.rotation.x = -Math.PI / 2;
    h2.position.set(0, 2.62, -0.2);
    h2.castShadow = true;
    body.add(h2);

    const wheels = [];
    const wGeo = new T.CylinderGeometry(0.42, 0.42, 0.3, 10);
    for (const [x, z] of [[-0.98, 1.45], [0.98, 1.45], [-0.98, -1.45], [0.98, -1.45]]) {
      const w = new T.Mesh(wGeo, lmat(0x1e1e1e));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.42, z);
      w.castShadow = true;
      g.add(w);
      wheels.push(w);
    }

    const glowMat = new T.MeshBasicMaterial({
      map: G.glowTex('255,236,170'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending,
    });
    const glowGeo = new T.PlaneGeometry(4.5, 7);
    glowGeo.rotateX(-Math.PI / 2);
    const glow = new T.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0.08, 5.2);
    g.add(glow);
    return { group: g, body, wheels, glowMat, lightMat };
  };

  // קטנוע (קורקינט ממונע עירוני)
  G.makeScooter = function (color) {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    box(body, 0.42, 0.12, 1.05, 0x2a2a2a, 0, 0.32, -0.05);
    box(body, 0.44, 0.45, 0.62, color, 0, 0.6, -0.3);
    box(body, 0.38, 0.12, 0.62, 0x1a1a1a, 0, 0.88, -0.28);
    box(body, 0.42, 0.55, 0.16, color, 0, 0.62, 0.42);
    const col = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.75, 6), lmat(0x555555));
    col.position.set(0, 0.9, 0.5);
    col.rotation.x = -0.25;
    col.castShadow = true;
    body.add(col);
    box(body, 0.62, 0.05, 0.05, 0x222222, 0, 1.25, 0.58);
    box(body, 0.16, 0.1, 0.06, 0xfff1c4, 0, 1.08, 0.62);
    box(body, 0.36, 0.3, 0.32, 0x2a2a2a, 0, 1.0, -0.62);
    const wheels = [];
    for (const z of [0.55, -0.55]) {
      const w = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.12, 12), lmat(0x1a1a1a));
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.24, z);
      w.castShadow = true;
      g.add(w);
      wheels.push(w);
    }
    return { group: g, body, wheels };
  };

  // אופניים
  G.makeBike = function (color) {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    const wheels = [];
    for (const z of [0.52, -0.52]) {
      const w = new T.Mesh(new T.TorusGeometry(0.32, 0.035, 6, 18), lmat(0x1a1a1a));
      w.rotation.y = Math.PI / 2;
      w.position.set(0, 0.34, z);
      w.castShadow = true;
      g.add(w);
      wheels.push(w);
    }
    const bar = (len, x, y, z, rx, c) => {
      const m = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, len, 5), lmat(c || color));
      m.position.set(x, y, z);
      m.rotation.x = rx;
      m.castShadow = true;
      body.add(m);
    };
    bar(0.8, 0, 0.62, 0.05, Math.PI / 2 - 0.25);
    bar(0.55, 0, 0.55, -0.32, 0.5);
    bar(0.55, 0, 0.55, 0.42, -0.35);
    bar(0.42, 0, 0.6, -0.12, 0);
    box(body, 0.14, 0.05, 0.26, 0x1a1a1a, 0, 0.92, -0.18);
    box(body, 0.5, 0.04, 0.04, 0x333333, 0, 1.0, 0.5);
    box(body, 0.1, 0.1, 0.1, 0x333333, 0, 0.36, 0);
    return { group: g, body, wheels };
  };

  // מכונית לנהיגה (עם גוף וגלגלים נפרדים לאנימציה)
  G.makeDriveCar = function (color) {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    box(body, 1.8, 0.7, 3.9, color, 0, 0.7, 0);
    box(body, 1.64, 0.46, 2.04, 0x26303d, 0, 1.28, -0.2);
    box(body, 1.62, 0.12, 1.92, color, 0, 1.56, -0.2);
    box(body, 1.7, 0.2, 0.1, 0x222222, 0, 0.55, 1.97);
    box(body, 0.36, 0.16, 0.05, 0xfff1c4, -0.6, 0.85, 1.96);
    box(body, 0.36, 0.16, 0.05, 0xfff1c4, 0.6, 0.85, 1.96);
    box(body, 0.32, 0.16, 0.05, 0xd62828, -0.62, 0.85, -1.96);
    box(body, 0.32, 0.16, 0.05, 0xd62828, 0.62, 0.85, -1.96);
    const wheels = [];
    for (const [x, z] of [[-0.86, 1.25], [0.86, 1.25], [-0.86, -1.25], [0.86, -1.25]]) {
      const w = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.24, 10), lmat(0x1a1a1a));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.33, z);
      w.castShadow = true;
      g.add(w);
      wheels.push(w);
    }
    return { group: g, body, wheels };
  };

  G.makeCar = function (color) {
    const g = new T.Group();
    box(g, 1.8, 0.75, 3.9, color, 0, 0.65, 0);
    box(g, 1.62, 0.44, 2.02, 0x22334d, 0, 1.24, -0.25);
    box(g, 1.6, 0.14, 1.9, color, 0, 1.52, -0.25);
    for (const [x, z] of [[-0.86, 1.25], [0.86, 1.25], [-0.86, -1.25], [0.86, -1.25]]) box(g, 0.24, 0.6, 0.6, 0x1a1a1a, x, 0.3, z);
    box(g, 0.36, 0.16, 0.05, 0xfff1c4, -0.6, 0.78, 1.96);
    box(g, 0.36, 0.16, 0.05, 0xfff1c4, 0.6, 0.78, 1.96);
    return g;
  };
})();
