// אפקטים קטנים שמחיים את העיר: להקות ציפורים ביום, אבק מהגלגלים, ניצוצות כשעושים מצווה
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeFX = function (scene, isTouch) {
    // ================= ציפורים =================
    // להקה = כמה ציפורים בצורת V שעפות בקו ישר מעל העיר; כשמתרחקות — להקה חדשה במקום אחר
    const birdMat = new T.MeshBasicMaterial({ color: 0x2a2f3a, side: T.DoubleSide, fog: true });
    const wingGeo = new T.BufferGeometry();
    wingGeo.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.14, 0.62, 0, -0.02], 3));
    const FLOCKS = isTouch ? 2 : 3, PER = 5;
    const flocks = [];
    for (let f = 0; f < FLOCKS; f++) {
      const g = new T.Group();
      const birds = [];
      for (let i = 0; i < PER; i++) {
        const b = new T.Group();
        const L = new T.Mesh(wingGeo, birdMat), R = new T.Mesh(wingGeo, birdMat);
        R.scale.x = -1;
        b.add(L, R);
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        b.position.set(side * row * 1.6, (Math.random() - 0.5) * 0.6, -row * 1.4);
        g.add(b);
        birds.push({ L, R, ph: Math.random() * 6 });
      }
      g.visible = false;
      scene.add(g);
      flocks.push({ g, birds, vx: 0, vz: 0, wait: 2 + f * 7 });
    }
    function launch(fl, cx, cz) {
      // נכנסים מקצה אחד של האזור ועוברים מעל השחקן
      const a = Math.random() * Math.PI * 2, d = 140;
      const ox = (Math.random() - 0.5) * 60, oz = (Math.random() - 0.5) * 60;
      fl.g.position.set(cx + ox - Math.sin(a) * d, 26 + Math.random() * 18, cz + oz - Math.cos(a) * d);
      const sp = 7 + Math.random() * 4;
      fl.vx = Math.sin(a) * sp;
      fl.vz = Math.cos(a) * sp;
      fl.g.rotation.y = a;
      fl.g.scale.setScalar(1.2 + Math.random() * 0.5);
      fl.g.visible = true;
    }
    function updateBirds(dt, t, cx, cz, day) {
      for (const fl of flocks) {
        if (!fl.g.visible) {
          fl.wait -= dt;
          if (fl.wait <= 0 && day) launch(fl, cx, cz);
          continue;
        }
        fl.g.position.x += fl.vx * dt;
        fl.g.position.z += fl.vz * dt;
        // גלישה עדינה למעלה ולמטה
        fl.g.position.y += Math.sin(t * 0.7 + fl.wait) * dt * 0.8;
        for (const b of fl.birds) {
          // נפנוף, ומדי פעם גלישה עם כנפיים פתוחות
          const glide = Math.sin(t * 0.5 + b.ph) > 0.55;
          const w = glide ? 0.12 : Math.sin(t * 11 + b.ph) * 0.65;
          b.L.rotation.z = w;
          b.R.rotation.z = -w;
        }
        if (Math.hypot(fl.g.position.x - cx, fl.g.position.z - cz) > 170 || !day) {
          fl.g.visible = false;
          fl.wait = 6 + Math.random() * 14;
        }
      }
    }

    // ================= חלקיקים: אבק וניצוצות =================
    const dustTex = G.glowTex('214,196,164'), sparkTex = G.glowTex('255,240,170');
    // לכל חלקיק חומר משלו (שקיפות נפרדת); אבק רגיל, ניצוצות זוהרים
    const pool = [];
    const MAXP = isTouch ? 36 : 64;
    for (let i = 0; i < MAXP; i++) {
      const spark = i % 3 === 0;
      const s = new T.Sprite(new T.SpriteMaterial({ map: spark ? sparkTex : dustTex, transparent: true, depthWrite: false, blending: spark ? T.AdditiveBlending : T.NormalBlending }));
      s.visible = false;
      s.renderOrder = 2;
      scene.add(s);
      pool.push({ s, spark, life: 0, max: 1, vx: 0, vy: 0, vz: 0, s0: 1, s1: 1, a0: 1, grav: 0 });
    }
    const nextP = { dust: 1, spark: 0 };
    function emit(kind, x, y, z, vx, vy, vz, life, s0, s1, a0, grav) {
      // הבא בתור מהסוג הנכון (כל שלישי הוא ניצוץ)
      let i = nextP[kind];
      for (let n = 0; n < MAXP && pool[i].spark !== (kind === 'spark'); n++) i = (i + 1) % MAXP;
      nextP[kind] = (i + 1) % MAXP;
      const p = pool[i];
      p.s.position.set(x, y, z);
      Object.assign(p, { life, max: life, vx, vy, vz, s0, s1, a0, grav });
      p.s.scale.setScalar(s0);
      p.s.material.opacity = a0;
      p.s.visible = true;
    }
    function updateParticles(dt) {
      for (const p of pool) {
        if (!p.s.visible) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.s.visible = false;
          continue;
        }
        const k = 1 - p.life / p.max;
        p.vy -= p.grav * dt;
        // התנגדות אוויר: האבק נעצר מהר
        const damp = Math.exp(-2 * dt);
        p.vx *= damp;
        p.vz *= damp;
        p.s.position.x += p.vx * dt;
        p.s.position.y += p.vy * dt;
        p.s.position.z += p.vz * dt;
        p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * k);
        p.s.material.opacity = p.a0 * (1 - k) * (k < 0.15 ? k / 0.15 : 1);
      }
    }
    let dustT = 0;
    // אבק מאחורי הגלגלים כשנוסעים מהר או מחליקים בפנייה
    function dust(dt, v, night) {
      if (!v || v.type === 'bike') return;
      const spd = Math.abs(v.v);
      if (spd < 7) return;
      dustT -= dt;
      if (dustT > 0) return;
      dustT = isTouch ? 0.09 : 0.05;
      const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = Math.cos(v.h), rz = -Math.sin(v.h);
      const back = 2.1, side = Math.random() < 0.5 ? -0.9 : 0.9;
      const a = Math.min(0.5, 0.16 + spd * 0.014) * (1 - night * 0.6);
      // האבק נגרר קצת אחרי הרכב (מערבולת) — כך הוא נשאר בתמונה גם במצלמה שמאחור
      const drag = v.v * 0.55;
      emit('dust', v.x - fx * back + rx * side, 0.35, v.z - fz * back + rz * side,
        fx * drag + rx * side * 0.8 + (Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.6, fz * drag + rz * side * 0.8 + (Math.random() - 0.5) * 1.2,
        0.9 + Math.random() * 0.5, 0.7, 3.2, a, 0);
    }
    // פרץ של ניצוצות זהב — כשמישהו שמח (מצווה, ברכה)
    function sparkle(x, z, n) {
      n = Math.min(n || 12, isTouch ? 10 : 18);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 2;
        emit('spark', x, 1.2 + Math.random() * 0.8, z, Math.sin(a) * r, 3 + Math.random() * 2.5, Math.cos(a) * r, 0.8 + Math.random() * 0.5, 0.34, 0.1, 1, 5);
      }
    }

    return {
      sparkle,
      update(dt, t, o) {
        updateBirds(dt, t, o.cx, o.cz, o.day);
        dust(dt, o.drv, o.night);
        updateParticles(dt);
      },
    };
  };
})();
