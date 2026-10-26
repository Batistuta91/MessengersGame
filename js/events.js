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

    let ev = null, nextT = 45, doneCount = 0;
    const freeAt = (x, z) => !W.collide(x, z, 0.7).hit;
    function pickSpot(minD, maxD) {
      for (let k = 0; k < 60; k++) {
        const p = W.paths[(rnd() * W.paths.length) | 0];
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

    const STARTERS = [startSiddur, startBoxes, startFamily];
    return {
      update(dt, busy) {
        if (ev) {
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
        if (ev.type === 'boxes' && ev.state === 'carry') return boxes.find((b) => b.visible) ? { x: boxes.find((b) => b.visible).position.x, z: boxes.find((b) => b.visible).position.z } : null;
        const n = NP[ev.npc];
        return { x: n.x, z: n.z };
      },
      mapDots(dot) {
        const t = this.navTarget();
        if (t) dot(t.x, t.z, 5, '#b07cff', '#13213f');
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
    };
  };
})();
