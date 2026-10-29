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
      ...(G.SMOOTH
        ? [
            // מראה חלק: עיניים ״מצוירות״ — לבן ואישון
            sph(0.026, -0.042, 0.022, 0.104, 0xffffff, 1, 1.15, 0.5),
            sph(0.026, 0.042, 0.022, 0.104, 0xffffff, 1, 1.15, 0.5),
            sph(0.014, -0.04, 0.02, 0.118, 0x1a1a1a, 1, 1.2, 0.5),
            sph(0.014, 0.04, 0.02, 0.118, 0x1a1a1a, 1, 1.2, 0.5),
          ]
        : [bx(0.028, 0.022, 0.01, -0.042, 0.025, 0.112, 0x1a1a1a), bx(0.028, 0.022, 0.01, 0.042, 0.025, 0.112, 0x1a1a1a)]),
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
    // מראה חלק: ראש מעט גדול יותר — סגנון מצויר
    if (G.SMOOTH) {
      head.scale.setScalar(1.25);
      head.position.y = 1.88;
    }
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

  // טנק המבצעים: קרוואן בסגנון ״ניידות חב״ד״ — עטיפה אדומה-צהובה-לבנה, שמשה גדולה וכיתוב בצדדים
  G.makeVan = function () {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const W = 2.3, Y0 = 0.55, Y1 = 2.9, ZB = -3.0, ZF = 2.95;
    const FONT = '"Rubik", "Arial Hebrew", Arial, sans-serif';
    // עטיפה: אדום למטה, גל כתום-צהוב, ולבן למעלה
    function wrap(g2, w, h) {
      const gr = g2.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, '#c4161c');
      gr.addColorStop(0.2, '#e2231a');
      gr.addColorStop(0.36, '#f47b20');
      gr.addColorStop(0.52, '#ffd200');
      gr.addColorStop(0.68, '#fff3b0');
      gr.addColorStop(0.8, '#fbfaf5');
      gr.addColorStop(1, '#fbfaf5');
      g2.fillStyle = gr;
      g2.fillRect(0, 0, w, h);
    }
    function wave(g2, w, h, y, amp, col, phase) {
      g2.fillStyle = col;
      g2.beginPath();
      g2.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g2.lineTo(x, y + Math.sin(x / w * Math.PI * 3 + phase) * amp);
      g2.lineTo(w, h);
      g2.fill();
    }
    function txt(g2, t, x, y, size, fill, stroke) {
      g2.font = '900 ' + size + 'px ' + FONT;
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      g2.direction = 'rtl';
      if (stroke) {
        g2.lineWidth = size / 6;
        g2.strokeStyle = stroke;
        g2.strokeText(t, x, y);
      }
      g2.fillStyle = fill;
      g2.fillText(t, x, y);
    }
    // צד הקרוואן (מחזית לאחור משמאל לימין בצד שמאל; בצד ימין הפוך)
    function sideTex(flip) {
      return G.canvasTex(1024, 400, (c, w, h) => {
        if (flip) {
          c.translate(w, 0);
          c.scale(-1, 1);
        }
        wrap(c, w, h);
        wave(c, w, h, h * 0.8, 14, '#b5121b', 0.5);
        wave(c, w, h, h * 0.9, 8, '#8e0d14', 2);
        // חלונות ודלת
        c.fillStyle = '#1d2733';
        c.fillRect(w * 0.08, h * 0.12, w * 0.14, h * 0.22);
        c.fillRect(w * 0.62, h * 0.12, w * 0.16, h * 0.2);
        c.fillStyle = 'rgba(255,255,255,.25)';
        c.fillRect(w * 0.085, h * 0.13, w * 0.04, h * 0.2);
        c.fillRect(w * 0.625, h * 0.13, w * 0.04, h * 0.18);
        c.strokeStyle = 'rgba(80,40,10,.55)';
        c.lineWidth = 4;
        c.strokeRect(w * 0.27, h * 0.12, w * 0.11, h * 0.76);
        // תמונות צבעוניות (ספרים, נרות, אנשים) — כתמי צבע
        const blobs = [['#5b3a8c', 0.82, 0.42], ['#2b6cb0', 0.88, 0.5], ['#e85d75', 0.8, 0.6], ['#3a7d44', 0.93, 0.4], ['#f2f2f2', 0.86, 0.36]];
        for (const [col, x, y] of blobs) {
          c.fillStyle = col;
          c.beginPath();
          c.arc(w * x, h * y, h * 0.07, 0, Math.PI * 2);
          c.fill();
        }
        if (flip) {
          c.setTransform(1, 0, 0, 1, 0, 0);
        }
        // הכיתוב — תמיד קריא (לא הפוך)
        const cx = flip ? w * 0.5 : w * 0.5;
        txt(c, 'ניידות חב״ד', cx, h * 0.47, 100, '#c4161c', '#fff8d0');
        txt(c, 'להפצת יהדות', cx, h * 0.7, 76, '#c4161c', '#fff8d0');
        txt(c, 'יחי אדוננו מורנו ורבנו מלך המשיח לעולם ועד', w * 0.5, h * 0.06, 24, '#1b3a8a');
      }, false, true);
    }
    const frontTex = G.canvasTex(512, 256, (c, w, h) => {
      wrap(c, w, h);
      wave(c, w, h, h * 0.86, 6, '#b5121b', 1);
      // סרט ״ברוך הבא מלך המשיח״
      c.fillStyle = '#fffaf0';
      c.strokeStyle = '#d4a017';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(w * 0.04, h * 0.1);
      c.quadraticCurveTo(w * 0.5, h * 0.02, w * 0.96, h * 0.1);
      c.lineTo(w * 0.96, h * 0.32);
      c.quadraticCurveTo(w * 0.5, h * 0.24, w * 0.04, h * 0.32);
      c.closePath();
      c.fill();
      c.stroke();
      txt(c, 'ברוך הבא מלך המשיח', w * 0.5, h * 0.18, 40, '#c4161c');
      // גריל
      c.fillStyle = '#e6e6e6';
      c.fillRect(w * 0.27, h * 0.42, w * 0.46, h * 0.3);
      c.fillStyle = '#2a2a2a';
      for (let i = 0; i < 6; i++) c.fillRect(w * 0.29, h * (0.45 + i * 0.045), w * 0.42, h * 0.025);
      // לוחית רישוי
      c.fillStyle = '#ffd200';
      c.fillRect(w * 0.4, h * 0.78, w * 0.2, h * 0.11);
      c.strokeStyle = '#222';
      c.lineWidth = 2;
      c.strokeRect(w * 0.4, h * 0.78, w * 0.2, h * 0.11);
      c.fillStyle = '#222';
      c.font = 'bold 22px Arial';
      c.textAlign = 'center';
      c.fillText('770-73', w * 0.5, h * 0.865);
    }, false, true);
    const rearTex = G.canvasTex(256, 256, (c, w, h) => {
      wrap(c, w, h);
      wave(c, w, h, h * 0.82, 6, '#b5121b', 2);
      c.fillStyle = '#1b3a8a';
      c.fillRect(w * 0.12, h * 0.18, w * 0.76, h * 0.2);
      txt(c, 'בית חב״ד', w * 0.5, h * 0.28, 34, '#ffd23f');
      txt(c, 'הוד השרון', w * 0.5, h * 0.52, 26, '#c4161c', '#fff');
    }, false, true);
    const gradTex = G.canvasTex(8, 256, (c, w, h) => wrap(c, w, h), false, true);
    const lam = (o) => new T.MeshLambertMaterial(o);
    const cream = lmat(0xfbfaf5);

    // שלד: פרופיל צד של קרוואן (חזית בשיפוע, גג ישר) שמוחצן לרוחב
    const sh = new T.Shape();
    sh.moveTo(ZB, Y0);
    sh.lineTo(ZF, Y0);
    sh.lineTo(ZF, 1.25);
    sh.lineTo(ZF - 0.12, 1.62);
    sh.lineTo(ZF - 0.68, 2.72);
    sh.lineTo(ZF - 0.95, Y1);
    sh.lineTo(ZB, Y1);
    sh.closePath();
    const shell = new T.ExtrudeGeometry(sh, { depth: W, bevelEnabled: false });
    shell.rotateY(-Math.PI / 2);
    shell.translate(W / 2, 0, 0);
    // UV לצדדים לפי גובה בלבד (מעבר הצבע של העטיפה)
    const pos = shell.attributes.position, uv = shell.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5, (pos.getY(i) - Y0) / (Y1 - Y0));
    const shellMesh = new T.Mesh(shell, [lam({ map: gradTex }), lam({ map: gradTex })]);
    shellMesh.castShadow = shellMesh.receiveShadow = true;
    body.add(shellMesh);
    // לוחות מודפסים: צדדים, חזית ואחור
    const L = 4.95, zc = ZB + L / 2 + 0.02;
    const pR = new T.Mesh(new T.PlaneGeometry(L, Y1 - Y0 - 0.04), lam({ map: sideTex(false) }));
    pR.position.set(W / 2 + 0.012, (Y0 + Y1) / 2, zc);
    pR.rotation.y = Math.PI / 2;
    const pL = new T.Mesh(new T.PlaneGeometry(L, Y1 - Y0 - 0.04), lam({ map: sideTex(true) }));
    pL.position.set(-W / 2 - 0.012, (Y0 + Y1) / 2, zc);
    pL.rotation.y = -Math.PI / 2;
    const pF = new T.Mesh(new T.PlaneGeometry(W - 0.02, 1.06), lam({ map: frontTex }));
    pF.position.set(0, Y0 + 0.53 + 0.01, ZF + 0.012);
    const pB = new T.Mesh(new T.PlaneGeometry(W - 0.02, Y1 - Y0 - 0.04), lam({ map: rearTex }));
    pB.position.set(0, (Y0 + Y1) / 2, ZB - 0.012);
    pB.rotation.y = Math.PI;
    body.add(pR, pL, pF, pB);
    // שמשה קדמית גדולה (בשיפוע) וחלונות הנהג
    const glass = lam({ color: 0x1a2532 });
    const ws = new T.Mesh(new T.PlaneGeometry(W - 0.16, 1.18), glass);
    const sx = ZF - 0.12 - 0.27, sy = (1.62 + 2.72) / 2;
    ws.position.set(0, sy, sx + 0.035);
    ws.rotation.x = -Math.atan2(0.56, 1.1);
    body.add(ws);
    const shine = new T.Mesh(new T.PlaneGeometry(0.35, 1.0), new T.MeshBasicMaterial({ color: 0x8fa3b8, transparent: true, opacity: 0.35 }));
    shine.position.set(-0.55, sy, sx + 0.05);
    shine.rotation.x = ws.rotation.x;
    body.add(shine);
    for (const sd of [1, -1]) {
      const dw = new T.Mesh(new T.PlaneGeometry(0.62, 0.62), glass);
      dw.position.set(sd * (W / 2 + 0.02), 2.05, ZF - 0.85);
      dw.rotation.y = (sd * Math.PI) / 2;
      body.add(dw);
      // מראות צד
      box(body, 0.08, 0.36, 0.2, 0x1a1a1a, sd * (W / 2 + 0.2), 2.0, ZF - 0.35);
    }
    // פנסים קדמיים, אחוריים ותאורת גג כתומה
    const lightMat = new T.MeshBasicMaterial({ color: 0xfff1c4 });
    box(body, 0.42, 0.2, 0.05, lightMat, -0.78, 1.05, ZF + 0.02);
    box(body, 0.42, 0.2, 0.05, lightMat, 0.78, 1.05, ZF + 0.02);
    box(body, W + 0.04, 0.22, 0.18, 0x3a3a3a, 0, 0.6, ZF + 0.05);
    box(body, W + 0.04, 0.22, 0.14, 0x3a3a3a, 0, 0.6, ZB - 0.05);
    const tail = new T.MeshBasicMaterial({ color: 0xd62828 });
    box(body, 0.2, 0.42, 0.05, tail, -0.95, 1.15, ZB - 0.03);
    box(body, 0.2, 0.42, 0.05, tail, 0.95, 1.15, ZB - 0.03);
    const amber = new T.MeshBasicMaterial({ color: 0xff8a1a });
    for (const x of [-0.8, -0.3, 0.3, 0.8]) box(body, 0.14, 0.06, 0.1, amber, x, Y1 + 0.03, ZF - 0.97);
    // גג: מזגן וגגון
    box(body, W - 0.1, 0.06, 5.0, 0xe9e7df, 0, Y1 + 0.03, ZB + 2.55);
    box(body, 0.85, 0.28, 0.8, 0xf2f2f2, 0, Y1 + 0.2, -0.3);
    // סוכך מקופל בצד ימין
    box(body, 0.1, 0.1, 3.4, 0x9a9a9a, W / 2 + 0.05, Y1 - 0.18, -0.9);

    // רמקול על הגג
    box(body, 0.12, 0.3, 0.12, 0x555555, 0, Y1 + 0.2, 1.2);
    const hornGeo = new T.CylinderGeometry(0.3, 0.1, 0.65, 8);
    for (const [rx, z] of [[Math.PI / 2, 1.55], [-Math.PI / 2, 0.85]]) {
      const h1 = new T.Mesh(hornGeo, lmat(0xd9d9d9));
      h1.rotation.x = rx;
      h1.position.set(0, Y1 + 0.45, z);
      h1.castShadow = true;
      body.add(h1);
    }

    const wheels = [];
    const wGeo = new T.CylinderGeometry(0.46, 0.46, 0.32, 12);
    const hubGeo = new T.CylinderGeometry(0.22, 0.22, 0.34, 8);
    for (const [x, z] of [[-1.0, 1.95], [1.0, 1.95], [-1.0, -1.75], [1.0, -1.75]]) {
      const w = new T.Mesh(wGeo, lmat(0x1e1e1e));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.46, z);
      w.castShadow = true;
      const hub = new T.Mesh(hubGeo, lmat(0xc8c8c8));
      w.add(hub);
      g.add(w);
      wheels.push(w);
    }

    const glowMat = new T.MeshBasicMaterial({
      map: G.glowTex('255,236,170'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending,
    });
    const glowGeo = new T.PlaneGeometry(4.5, 7);
    glowGeo.rotateX(-Math.PI / 2);
    const glow = new T.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0.08, ZF + 3.6);
    g.add(glow);
    return { group: g, body, wheels, glowMat, lightMat, roofY: Y1 + 0.05 };
  };
  // הניידת של ברסלב: ואן לבן, רמקול ענק על גגון עץ, שלט צהוב ״נ נח נחמ נחמן מאומן״
  G.makeBreslevVan = function () {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    const FONT = '"Rubik", "Arial Hebrew", Arial, sans-serif';
    const NA = 'נ נח נחמ נחמן מאומן';
    const lam = (o) => new T.MeshLambertMaterial(o);
    const side = (flip) => G.canvasTex(512, 200, (c, w, h) => {
      c.fillStyle = '#f7f7f2';
      c.fillRect(0, 0, w, h);
      // חלונות (בצד הקדמי של הוואן)
      c.fillStyle = '#26303b';
      const wx = flip ? w * 0.7 : w * 0.06;
      c.fillRect(wx, h * 0.08, w * 0.24, h * 0.3);
      c.font = '900 50px ' + FONT;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.direction = 'rtl';
      c.fillStyle = '#111';
      c.fillText(NA, w * 0.5, h * 0.62);
      c.fillStyle = '#c9a227';
      c.font = '700 20px ' + FONT;
      c.fillText('שמחה גדולה להיות תמיד בשמחה', w * 0.5, h * 0.86);
    }, false, true);
    const rearTex = G.canvasTex(256, 220, (c, w, h) => {
      c.fillStyle = '#f7f7f2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d232b';
      c.fillRect(w * 0.06, h * 0.06, w * 0.41, h * 0.45);
      c.fillRect(w * 0.53, h * 0.06, w * 0.41, h * 0.45);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.direction = 'rtl';
      c.fillStyle = '#ffd200';
      c.font = '900 20px ' + FONT;
      c.fillText('נ נח נחמ', w * 0.735, h * 0.2);
      c.fillText('נחמן מאומן', w * 0.735, h * 0.34);
      c.fillStyle = '#e03b2f';
      c.fillText('נ נח נחמ', w * 0.265, h * 0.2);
      c.fillText('נחמן מאומן', w * 0.265, h * 0.34);
      // פסים אדום-צהוב בתחתית
      for (let i = 0; i < 12; i++) {
        c.fillStyle = i % 2 ? '#ffd200' : '#d62828';
        c.beginPath();
        c.moveTo(i * 24, h);
        c.lineTo(i * 24 + 24, h);
        c.lineTo(i * 24 + 44, h * 0.88);
        c.lineTo(i * 24 + 20, h * 0.88);
        c.fill();
      }
      c.fillStyle = '#ffd200';
      c.fillRect(w * 0.36, h * 0.62, w * 0.28, h * 0.1);
      c.fillStyle = '#111';
      c.font = 'bold 16px Arial';
      c.fillText('69-024-50', w * 0.5, h * 0.675);
    }, false, true);
    const W = 2.1, L = 5.4, Y0 = 0.5, Y1 = 2.55;
    const white = lam({ color: 0xf7f7f2 });
    // גוף + מכסה מנוע נמוך
    const main = new T.Mesh(new T.BoxGeometry(W, Y1 - Y0, L - 1.0), white);
    main.position.set(0, (Y0 + Y1) / 2, -0.5);
    const hood = new T.Mesh(new T.BoxGeometry(W, 0.85, 1.0), white);
    hood.position.set(0, Y0 + 0.42, L / 2 - 0.5);
    const glassMat = lam({ color: 0x26303b });
    const ws = new T.Mesh(new T.PlaneGeometry(W - 0.2, 0.95), glassMat);
    ws.position.set(0, Y0 + 1.35, L / 2 - 0.98);
    ws.rotation.x = -0.35;
    const wsBlock = new T.Mesh(new T.BoxGeometry(W, 1.15, 0.5), white);
    wsBlock.position.set(0, Y0 + 1.42, L / 2 - 1.25);
    for (const m of [main, hood, wsBlock]) m.castShadow = m.receiveShadow = true;
    body.add(main, hood, wsBlock, ws);
    const pR = new T.Mesh(new T.PlaneGeometry(L - 1.02, Y1 - Y0 - 0.02), lam({ map: side(false) }));
    pR.position.set(W / 2 + 0.01, (Y0 + Y1) / 2, -0.5);
    pR.rotation.y = Math.PI / 2;
    const pL = new T.Mesh(new T.PlaneGeometry(L - 1.02, Y1 - Y0 - 0.02), lam({ map: side(true) }));
    pL.position.set(-W / 2 - 0.01, (Y0 + Y1) / 2, -0.5);
    pL.rotation.y = -Math.PI / 2;
    const pB = new T.Mesh(new T.PlaneGeometry(W - 0.02, Y1 - Y0 - 0.02), lam({ map: rearTex }));
    pB.position.set(0, (Y0 + Y1) / 2, -0.5 - (L - 1.0) / 2 - 0.01);
    pB.rotation.y = Math.PI;
    body.add(pR, pL, pB);
    // פנסים, פגושים, גריל
    const lightMat = new T.MeshBasicMaterial({ color: 0xfff1c4 });
    box(body, 0.36, 0.2, 0.05, lightMat, -0.72, Y0 + 0.55, L / 2 + 0.01);
    box(body, 0.36, 0.2, 0.05, lightMat, 0.72, Y0 + 0.55, L / 2 + 0.01);
    box(body, 0.9, 0.3, 0.05, 0x9a9a9a, 0, Y0 + 0.55, L / 2 + 0.01);
    box(body, W + 0.06, 0.2, 0.16, 0x8a8a8a, 0, Y0 + 0.1, L / 2 + 0.05);
    box(body, W + 0.06, 0.2, 0.16, 0x8a8a8a, 0, Y0 + 0.1, -L / 2 - 0.05);
    const tail = new T.MeshBasicMaterial({ color: 0xd62828 });
    box(body, 0.22, 0.5, 0.06, tail, -0.95, Y0 + 0.75, -L / 2 - 0.02);
    box(body, 0.22, 0.5, 0.06, tail, 0.95, Y0 + 0.75, -L / 2 - 0.02);
    for (const sd of [1, -1]) {
      box(body, 0.08, 0.32, 0.22, 0x1a1a1a, sd * (W / 2 + 0.16), Y0 + 1.3, L / 2 - 1.1);
      const dw = new T.Mesh(new T.PlaneGeometry(0.75, 0.55), glassMat);
      dw.position.set(sd * (W / 2 + 0.015), Y0 + 1.45, L / 2 - 1.35);
      dw.rotation.y = (sd * Math.PI) / 2;
      body.add(dw);
    }
    // סולם מאחור
    for (const x of [-0.45, -0.15]) box(body, 0.05, 1.9, 0.05, 0xbfbfbf, x, Y0 + 1.0, -L / 2 - 0.12);
    for (let i = 0; i < 6; i++) box(body, 0.32, 0.04, 0.04, 0xbfbfbf, -0.3, Y0 + 0.2 + i * 0.32, -L / 2 - 0.12);
    // גגון עץ, מעקה, רמקול ענק ושלט צהוב
    box(body, W - 0.1, 0.1, L - 1.6, 0x8b5a2b, 0, Y1 + 0.22, -0.7);
    for (const x of [-0.9, 0.9]) for (const z of [-2.6, -0.7, 1.2]) box(body, 0.06, 0.24, 0.06, 0xbfbfbf, x, Y1 + 0.1, z);
    for (const x of [-0.98, 0.98]) box(body, 0.05, 0.05, L - 1.6, 0xbfbfbf, x, Y1 + 0.5, -0.7);
    const spk = box(body, 1.05, 0.95, 0.75, 0xdedbd2, 0, Y1 + 0.75, -2.3);
    const cone = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.06, 16), lam({ color: 0x2b2b2b }));
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0.1, Y1 + 0.72, -2.3 - 0.39);
    const dust = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.07, 10), lam({ color: 0x3b5bdb }));
    dust.rotation.x = Math.PI / 2;
    dust.position.set(0.1, Y1 + 0.72, -2.3 - 0.41);
    body.add(cone, dust);
    const signTex = G.canvasTex(512, 64, (c, w, h) => {
      c.fillStyle = '#ffd200';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c9a227';
      c.lineWidth = 4;
      c.strokeRect(2, 2, w - 4, h - 4);
      c.fillStyle = '#111';
      c.font = '900 40px ' + FONT;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.direction = 'rtl';
      c.fillText(NA, w / 2, h / 2 + 2);
    }, false, true);
    const signMat = lam({ map: signTex, side: T.DoubleSide });
    const sign = new T.Mesh(new T.PlaneGeometry(3.4, 0.5), signMat);
    sign.position.set(0, Y1 + 0.62, 0.0);
    sign.rotation.y = Math.PI / 2;
    body.add(sign);
    box(body, 0.04, 0.56, 3.45, 0xc9a227, 0, Y1 + 0.62, 0.0);
    const wheels = [];
    const wGeo = new T.CylinderGeometry(0.4, 0.4, 0.3, 12);
    for (const [x, z] of [[-0.95, 1.75], [0.95, 1.75], [-0.95, -1.75], [0.95, -1.75]]) {
      const w = new T.Mesh(wGeo, lmat(0x1e1e1e));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.4, z);
      w.castShadow = true;
      g.add(w);
      wheels.push(w);
    }
    return { group: g, body, wheels, lightMat, speaker: spk };
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
  G.makeDriveCar = function (color, model) {
    // מודל אמיתי (אם נטען), אחרת — הקופסאות הישנות
    if (G.VEH && G.VEH.has(model || 'q_car1')) return G.VEH.drive(model || 'q_car1', color);
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

  // מכוניות פרטיות לחניה ולתנועה (מודלים אמיתיים)
  G.CAR_MODELS = ['q_car1', 'q_car2', 'q_suv', 'q_sport', 'r_hatch', 'r_sedan', 'r_suv', 'r_pickup', 'r_van'];
  G.makeCar = function (color, model) {
    const g = new T.Group();
    if (G.VEH) {
      const k = model || G.CAR_MODELS[Math.abs(color | 0) % G.CAR_MODELS.length];
      if (G.VEH.has(k)) {
        g.add(G.VEH.mesh(k, color));
        return g;
      }
    }
    box(g, 1.8, 0.75, 3.9, color, 0, 0.65, 0);
    box(g, 1.62, 0.44, 2.02, 0x22334d, 0, 1.24, -0.25);
    box(g, 1.6, 0.14, 1.9, color, 0, 1.52, -0.25);
    for (const [x, z] of [[-0.86, 1.25], [0.86, 1.25], [-0.86, -1.25], [0.86, -1.25]]) box(g, 0.24, 0.6, 0.6, 0x1a1a1a, x, 0.3, z);
    box(g, 0.36, 0.16, 0.05, 0xfff1c4, -0.6, 0.78, 1.96);
    box(g, 0.36, 0.16, 0.05, 0xfff1c4, 0.6, 0.78, 1.96);
    return g;
  };
})();
