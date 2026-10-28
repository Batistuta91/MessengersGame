// פרק 2 — פתח תקווה: ״שוק של ברכות״, ״ביקור חולים בשניידר״, ״ספר תורה לבית הכנסת הגדול״
// אותו ממשק כמו js/missions.js (המשחק בוחר לפי העיר)
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeMissionsPT = function (api) {
    const { scene, W, A, player, van, isTouch } = api;
    const ACT = isTouch ? 'כפתור הפעולה' : 'E';
    const S = () => api.S;
    const SP = W.spots || {};
    const lam = (c) => new T.MeshLambertMaterial({ color: c });
    const vanNear = () => S().inVan || Math.hypot(player.x - van.x, player.z - van.z) < 24;
    const vanZone = (z, r) => z && Math.hypot(van.x - z.x, van.z - z.z) < (r || z.r || 8);

    // ================= מצב =================
    const DEF = {
      pt1: () => ({ status: 'locked', timeLeft: 300, elapsed: 0, bag: false, got: {}, owners: {}, joy: 0, comm: 0 }),
      pt2: () => ({ status: 'locked', timeLeft: 360, elapsed: 0, step: 'load', gifts: 0, intact: 3, bumps: 0, joy: 0, comm: 0 }),
      ptB: () => ({ status: 'locked', elapsed: 0, joy: 0, comm: 0 }),
      pt3: () => ({ status: 'locked', elapsed: 0, step: 'march', lags: 0, lagT: 0, joy: 0, comm: 0 }),
      ptS: () => ({ status: 'locked', elapsed: 0, step: 'meet', story: 0, storyT: 0, joy: 0, comm: 0 }),
    };
    const QIDS = ['pt1', 'pt2', 'ptB', 'pt3'];
    if (!S().quests) S().quests = {};
    for (const id of [...QIDS, 'ptS']) {
      S().quests[id] = Object.assign(DEF[id](), S().quests[id] || {});
      // משימה שהייתה באמצע כשנסגר המשחק — ממשיכים ממנה (המצב הוויזואלי משוחזר בסוף, ב-resume)
    }
    const q = (id) => S().quests[id];
    const done = (id) => q(id).status === 'complete';
    const activeId = () => [...QIDS, 'ptS'].find((id) => q(id).status === 'active') || null;
    const available = (id) => (id === 'pt1' ? true : id === 'pt2' ? done('pt1') : id === 'ptB' ? done('pt2') : done('ptB') || done('pt3'));
    const nextQuest = () => QIDS.find((id) => !done(id)) || null;
    const TITLES = { ptS: '✦ משימה סודית · ״הנכד של המייסדים״', pt1: 'פרק 2 · משימה 1 · ״שוק של ברכות״', pt2: 'פרק 2 · משימה 2 · ״ביקור חולים״', ptB: 'פרק 2 · משימה 3 · ״לשמח את העיר״', pt3: 'פרק 2 · משימה 4 · ״ספר תורה לבית הכנסת הגדול״' };
    const MEN = 'ר׳ מנחם';

    // ================= סימון מקום עצירה לטנק: עמוד אור + טבעת ועיגול זוהר על הרצפה =================
    const beamMat = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const ringMat = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide });
    const discMat = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide });
    function makeBeam(z, r) {
      const g = new T.Group();
      const c = new T.Mesh(new T.CylinderGeometry(r, r, 8, 24, 1, true), beamMat);
      c.position.y = 4;
      const rg = new T.Mesh(new T.RingGeometry(r - 0.35, r, 40), ringMat);
      rg.rotation.x = -Math.PI / 2;
      rg.position.y = 0.22;
      const dc = new T.Mesh(new T.CircleGeometry(r - 0.35, 40), discMat);
      dc.rotation.x = -Math.PI / 2;
      dc.position.y = 0.21;
      g.add(c, rg, dc);
      g.position.set(z ? z.x : 0, 0, z ? z.z : 0);
      g.visible = false;
      scene.add(g);
      return { g, rg };
    }
    const BEAMS = { hosp: makeBeam(SP.zoneHosp, 4.2), great: makeBeam(SP.zoneGreat, 4.2) };

    // ================= משימה 1: שוק של ברכות =================
    // ארבעה בעלי דוכנים לפני שבת; לכל אחד מבצע אחר. ערכת המבצעים בתא המטען של הטנק.
    const OWNERS = [
      { id: 'pt_shimshon', name: 'שמשון', role: 'ירקן בשוק', need: 'mezuzah', look: { shirt: 0x2e9d5f, apron: 0x8d6e63, pants: 0x3b3b44, skin: 0xd9a27a, cap: 0x1b3a8a, beard: 0x333333 } },
      { id: 'pt_avi', name: 'אבי', role: 'דוכן תבלינים', need: 'tefillin', look: { shirt: 0xf39c12, pants: 0x2c3e50, skin: 0xc98e62, hair: 0x222222 } },
      { id: 'pt_moti', name: 'מוטי', role: 'דוכן פירות', need: 'tzedakah', look: { shirt: 0xd62828, apron: 0xf3efe2, pants: 0x34495e, skin: 0xf0c8a0, hair: 0x6b4423 } },
      { id: 'pt_rachamim', name: 'רחמים', role: 'חמוצים וזיתים', need: 'candles', look: { shirt: 0xffffff, pants: 0x2b2b2b, skin: 0xe2b088, kippah: 0x222222, hair: 0x9a9a9a, beard: 0xbbbbbb } },
    ];
    const ITEM = { mezuzah: 'מזוזה', tefillin: 'תפילין', tzedakah: 'קופת צדקה', candles: 'נרות שבת' };
    OWNERS.forEach((o, i) => {
      const s = (SP.stalls && SP.stalls[i]) || { x: -650 + i * 3, z: -640, rot: 0 };
      o.n = api.addNPC({ id: o.id, name: o.name, role: o.role, x: s.x, z: s.z, rot: s.rot, look: o.look });
    });
    const N = (id) => api.npcById[id];
    // קונים בשוק: מסתובבים בין הדוכנים (רק לאווירה)
    const shoppers = [];
    if (SP.stalls && SP.stalls.length) {
      const SH_LOOKS = [
        { shirt: 0x8fb3d9, pants: 0x2c3e50, skin: 0xd9a27a, kippah: 0x1b3a8a, hair: 0x333333 },
        { shirt: 0xf39c12, pants: 0x34495e, skin: 0xf0c8a0, cap: 0xd62828 },
        { shirt: 0xffffff, jacket: 0x2b2b33, pants: 0x2b2b33, skin: 0xe8b98f, hat: 'fedora', beard: 0x777777 },
        { shirt: 0x27ae60, pants: 0x222222, skin: 0xc98e62, hair: 0x222222, backpack: 0x9b59b6 },
        { shirt: 0xe84393, pants: 0x2d3436, skin: 0xf5d6b8, hair: 0x6b4423 },
        { shirt: 0xbdc3c7, pants: 0x3b3b44, skin: 0xe2b088, kippah: 0xffffff, beard: 0x5a3a1a },
      ];
      const a0 = SP.stalls[0], a1 = SP.stalls[SP.stalls.length - 1];
      const fx = Math.sin(a0.rot), fz = Math.cos(a0.rot);
      SH_LOOKS.forEach((lk, i) => {
        const p = G.makePerson(lk);
        p.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(p.group);
        // מסלול: לאורך שורת הדוכנים, קצת מולם
        const off = 1.6 + (i % 3) * 0.9;
        shoppers.push({ p, ax: a0.x - fx * off, az: a0.z - fz * off, bx: a1.x - fx * off, bz: a1.z - fz * off, t: i / SH_LOOKS.length, sp: 0.04 + (i % 3) * 0.015, dir: i % 2 ? 1 : -1, wait: 0, ph: i });
      });
    }
    function updateShoppers(dt, t) {
      for (const s of shoppers) {
        const near = Math.hypot((s.ax + s.bx) / 2 - player.x, (s.az + s.bz) / 2 - player.z);
        if (near > 160) {
          s.p.group.visible = false;
          continue;
        }
        s.p.group.visible = true;
        let moving = false;
        if (s.wait > 0) s.wait -= dt;
        else {
          s.t += s.dir * s.sp * dt;
          moving = true;
          if (s.t > 1 || s.t < 0) {
            s.dir = -s.dir;
            s.t = G.clamp(s.t, 0, 1);
            s.wait = 2 + Math.random() * 3;
          } else if (Math.random() < dt * 0.08) s.wait = 1.5 + Math.random() * 2.5;
        }
        const x = s.ax + (s.bx - s.ax) * s.t, z = s.az + (s.bz - s.az) * s.t;
        const bob = G.animatePerson(s.p, t * 6 + s.ph, moving ? 1 : 0);
        s.p.group.position.set(x, bob, z);
        s.p.group.rotation.y = moving ? Math.atan2((s.bx - s.ax) * s.dir, (s.bz - s.az) * s.dir) : SP.stalls[0].rot;
      }
    }
    function giveTo(o, kind) {
      const st = q('pt1');
      st.owners[o.id] = kind;
      if (kind === 'yes') {
        api.addJoy(10);
        api.addCommunity(1);
        A.success();
        api.toast(o.name + ': ' + ITEM[o.need] + ' — ' + { mezuzah: 'נקבעה על הדוכן!', tefillin: 'הניח תפילין!', tzedakah: 'קופת הצדקה על הדוכן!', candles: 'ידליקו נרות שבת בבית!' }[o.need] + ' +10 שמחה', 'gold');
      } else {
        api.addJoy(3);
        api.toast(o.name + ' — לא הפעם. אבל חיוך נשאר. +3 שמחה');
      }
      if (OWNERS.every((x) => st.owners[x.id])) completePt1('done');
      api.save();
    }
    function dlgOwner(o) {
      const st = q('pt1');
      if (st.owners[o.id] === 'yes') return { a: { s: 'npc', t: 'שבת שלום, שליח! תבוא גם בשבוע הבא.' } };
      if (st.owners[o.id] === 'no') return { a: { s: 'npc', t: 'אני באמצע עבודה... נדבר בשבוע הבא.' } };
      const has = st.bag;
      const noBag = { t: '(עוד אין לי את ערכת המבצעים — היא בטנק)', go: 'nb' };
      const nb = { s: 'narr', t: 'ערכת המבצעים נמצאת בתא המטען של הטנק. ' + (isTouch ? 'גשו לאחורי הטנק ולחצו על כפתור הפעולה.' : 'גשו לאחורי הטנק ולחצו E.') };
      if (o.need === 'mezuzah')
        return {
          a: { s: 'npc', t: '(צועק) עגבניות! מלפפונים! שלושה קילו בעשר! — כן, שליח, מה אתה צריך? אין לי זמן, שישי היום!', c: [{ t: 'ראיתי שאין מזוזה בכניסה לדוכן. יש לי אחת כשרה — דקה ואני קובע לך.', go: 'b' }, { t: 'רציתי רק לאחל שבת שלום!', go: 'x' }] },
          b: { s: 'npc', t: 'מזוזה? אבא שלי תמיד אמר שדוכן בלי מזוזה זה כמו קופה בלי מנעול. יאללה, תקבע!', c: [has ? { t: 'קובע: ״ברוך אתה... לקבוע מזוזה״.', fx: () => giveTo(o, 'yes') } : noBag] },
          x: { s: 'npc', t: 'שבת שלום גם לך! ...רגע, לא רצית משהו?', c: [{ t: 'בעצם כן — מזוזה לדוכן.', go: 'b' }, { t: 'לא, רק שבת שלום.', fx: () => giveTo(o, 'no') }] },
          nb,
        };
      if (o.need === 'tefillin')
        return {
          a: { s: 'npc', t: 'ריח של זעתר, אה? תבלינים מכל העולם. אתה רוצה לקנות או לשכנע?', c: [{ t: 'קצת משניהם. הנחת היום תפילין?', go: 'b' }, { t: 'רק לקנות — חצי קילו זעתר!', go: 'c' }] },
          b: { s: 'npc', t: 'האמת? מהבוקר אני פה, אין לי זמן אפילו לשתות קפה.', c: [has ? { t: 'חמש דקות — ואני גם שומר לך על הדוכן.', go: 'd' } : noBag, { t: 'אין לחץ, אולי בשבוע הבא.', fx: () => giveTo(o, 'no') }] },
          c: { s: 'npc', t: '(שוקל) הנה. אתה בחור טוב. מה עוד?', c: [{ t: 'יש לי תפילין בטנק. חמש דקות?', go: 'b' }] },
          d: { s: 'npc', t: 'שומר לי על הדוכן? עסקה! ...איך מתחילים, יד שמאל?', end: () => giveTo(o, 'yes') },
          nb,
        };
      if (o.need === 'tzedakah')
        return {
          a: { s: 'npc', t: 'אפרסמונים! ענבים! ...שליח, אתה יודע מה המצב? הפרנסה קשה השנה.', c: [{ t: 'צדקה מביאה ברכה. מה דעתך על קופת צדקה על הדוכן?', go: 'b' }, { t: 'תתחזק, יהיה טוב!', go: 'c' }] },
          b: { s: 'npc', t: 'קופה? ...כל לקוח שמשאיר שקל — ברכה לכולנו. אני אוהב את זה.', c: [has ? { t: 'הנה, שמתי אותה ליד המשקל.', fx: () => giveTo(o, 'yes') } : noBag] },
          c: { s: 'npc', t: 'תודה. אבל מילים לא משלמות שכירות...', c: [{ t: 'אז בוא נזמין ברכה — קופת צדקה לדוכן.', go: 'b' }, { t: 'שבת שלום, מוטי.', fx: () => giveTo(o, 'no') }] },
          nb,
        };
      return {
        a: { s: 'npc', t: 'זיתים מרוקאים, חמוצים של סבתא! טעם אחד — ואתה חוזר כל שבוע.', c: [{ t: 'שבת מתקרבת — יש בבית נרות שבת?', go: 'b' }, { t: 'טעים! אפשר עוד אחד?', go: 'c' }] },
        b: { s: 'npc', t: 'נרות? האישה שלי תמיד מדליקה... אבל השבוע הנרות נגמרו, ואין לי זמן לקפוץ לחנות.', c: [has ? { t: 'יש לי ערכת נרות שבת במתנה — תביא לה הביתה.', fx: () => giveTo(o, 'yes') } : noBag] },
        c: { s: 'npc', t: '(מגיש) קח, קח. ומה מביא אותך לשוק?', c: [{ t: 'נרות שבת — יש לכם בבית?', go: 'b' }] },
        nb,
      };
    }
    function startPt1() {
      const st = Object.assign(DEF.pt1(), { status: 'active' });
      S().quests.pt1 = st;
      A.success();
      api.toast('״שוק של ברכות״ — ארבעה דוכנים, חמש דקות עד שהשוק נסגר לשבת!', 'gold');
      api.save();
    }
    function completePt1(reason) {
      const st = q('pt1');
      if (st.status !== 'active') return;
      st.status = 'complete';
      const yes = OWNERS.filter((o) => st.owners[o.id] === 'yes').length;
      api.addJoy(8);
      api.save();
      api.results({
        stars: yes >= 4 ? 3 : yes >= 2 ? 2 : 1,
        title: reason === 'time' ? 'השוק נסגר לשבת — ובכל זאת, הרבה ברכה' : 'שוק של ברכות!',
        rows: [['בעלי דוכנים שקיבלו מבצע', yes + ' מתוך 4'], ['זמן', api.fmtTime(300 - Math.max(0, st.timeLeft))], ['שמחה', '+' + st.joy], ['קשרים', '+' + st.comm]],
        changes: ['בשוק כבר מכירים את השליח מחב״ד', 'ר׳ מנחם רוצה לדבר איתך על ביקור חולים'],
      });
    }

    // ================= משימה 2: ביקור חולים בשניידר =================
    const giftGrp = new T.Group();
    const giftCols = [0xe84393, 0x3b82f6, 0xf1c40f];
    for (let i = 0; i < 3; i++) {
      const b = new T.Mesh(new T.BoxGeometry(0.6, 0.5, 0.6), lam(giftCols[i]));
      b.position.set(i * 0.7 - 0.7, 0.25, 0);
      b.castShadow = true;
      const rib = new T.Mesh(new T.BoxGeometry(0.62, 0.52, 0.12), lam(0xffffff));
      rib.position.copy(b.position);
      giftGrp.add(b, rib);
    }
    const crateAt = SP.crate || SP.playerStart || { x: player.x, z: player.z };
    giftGrp.position.set(crateAt.x, 0, crateAt.z);
    giftGrp.visible = false;
    scene.add(giftGrp);
    // בלונים על גג הטנק — מתפוצצים בתאונות
    const balloons = new T.Group();
    const bCols = [0xff5e7e, 0x6ec6ff, 0xffd23f];
    for (let i = 0; i < 3; i++) {
      const b = new T.Mesh(new T.SphereGeometry(0.35, 8, 6), lam(bCols[i]));
      b.position.set(i * 0.5 - 0.5, 1.4 + (i % 2) * 0.3, -1.2);
      const str = new T.Mesh(new T.BoxGeometry(0.02, 1.2, 0.02), lam(0xffffff));
      str.position.set(i * 0.5 - 0.5, 0.75, -1.2);
      balloons.add(b, str);
    }
    balloons.position.y = (van.m.roofY || 2.9) - 0.4;
    balloons.visible = false;
    van.m.body.add(balloons);
    const father = api.addNPC({ id: 'pt_father', name: 'יגאל', role: 'אבא של נועם', x: (SP.hospDoor || crateAt).x, z: (SP.hospDoor || crateAt).z, rot: (SP.hospDoor || {}).rot || 0, look: { shirt: 0x8fb3d9, pants: 0x2c3e50, skin: 0xe8c0a0, hair: 0x4a2f1b, kippah: 0x1b3a8a } });
    father.hidden = true;
    function startPt2() {
      S().quests.pt2 = Object.assign(DEF.pt2(), { status: 'active' });
      giftGrp.visible = true;
      A.success();
      api.toast('״ביקור חולים״ — שלוש מתנות מבית חב״ד לשניידר. סעו בעדינות!', 'gold');
      api.save();
    }
    let prevV = 0;
    function pt2Update(dt) {
      const st = q('pt2');
      // מכה חזקה: ירידה חדה במהירות כשהמתנות בטנק
      if (st.step === 'drive') {
        const v = Math.abs(van.v);
        if (prevV - v > 7 && st.intact > 0) {
          st.intact--;
          st.bumps++;
          const kids = balloons.children;
          for (let i = 0; i < kids.length; i += 2) if (kids[i].visible) {
            kids[i].visible = kids[i + 1].visible = false;
            break;
          }
          A.crash && A.crash(0.6);
          api.toast(st.intact ? '💥 בום! בלון התפוצץ — עדינות, יש מתנות בטנק! (' + st.intact + '/3)' : '💥 כל הבלונים התפוצצו... אבל המתנות עוד אצלנו', '');
        }
        prevV = v;
      } else prevV = Math.abs(van.v);
      if (st.timeLeft <= 0) completePt2('time');
    }
    function completePt2(reason) {
      const st = q('pt2');
      if (st.status !== 'active') return;
      st.status = 'complete';
      father.hidden = true;
      balloons.visible = false;
      giftGrp.visible = false;
      if (W.placeLights.hosp) W.placeLights.hosp.visible = true;
      api.addJoy(12);
      api.addCommunity(2);
      api.save();
      api.results({
        stars: reason === 'time' ? 1 : st.intact >= 3 ? 3 : st.intact >= 1 ? 2 : 1,
        title: reason === 'time' ? 'שעות הביקור נגמרו — נחזור מחר' : 'ביקור חולים בשניידר',
        note: reason === 'time' ? null : '״ביקור חולים — נוטל אחד משישים מחוליו״. לפעמים מתנה קטנה ושיחה טובה הם בדיוק מה שצריך.',
        rows: [['מתנות', reason === 'time' ? 'לא הגיעו' : '3 נמסרו'], ['בלונים שלמים', st.intact + '/3'], ['זמן', api.fmtTime(360 - Math.max(0, st.timeLeft))]],
        changes: ['יגאל ונועם מוזמנים לשבת בבית חב״ד', 'ר׳ מנחם מכין משהו גדול לבית הכנסת הגדול...'],
      });
    }
    function dlgFather() {
      return {
        a: { s: 'npc', t: '(מרים את הראש) שלום... אתם מבית חב״ד? נועם, הבן שלי, כבר שבוע פה. הוא משתעמם נורא.', go: 'b' },
        b: { s: 'npc', t: 'מתנות? בשבילו? ...ובשביל הילדים בחדר ליד? אתה לא יודע כמה זה ישמח אותם.', c: [{ t: 'ויש גם ברכה מהרבי — רפואה שלמה. נועם יחזור הביתה בקרוב.', go: 'c' }] },
        c: { s: 'npc', t: 'אמן. ...תגיד, אפשר שתבוא שוב? נועם יאהב לראות את הטנק מהחלון.', c: [{ t: 'בטח. ונעשה לו מסיבה כשהוא יוצא!', end: () => completePt2('done') }] },
      };
    }

    // ================= משימה 3: הכנסת ספר תורה =================
    const marchers = [];
    const MARCH_LOOKS = [
      { shirt: 0xffffff, jacket: 0x1a1a1a, pants: 0x1a1a1a, skin: 0xe8b98f, hat: 'fedora', beard: 0xdddddd, tzitzit: true },
      { shirt: 0xffffff, pants: 0x222222, skin: 0xf0c8a0, kippah: 0x1b3a8a, hair: 0x4a2f1b },
      { shirt: 0xffffff, pants: 0x2b2b33, skin: 0xd9a27a, kippah: 0x222222, beard: 0x333333 },
      { shirt: 0xffffff, pants: 0x1f1f1f, skin: 0xc98e62, kippah: 0xffffff, hair: 0x222222 },
      { shirt: 0x3d7dd8, pants: 0x2f3e5c, skin: 0xf0c8a0, kippah: 0x1b3a8a, hair: 0x6b4423 },
      { shirt: 0xffffff, jacket: 0x2b2b33, pants: 0x2b2b33, skin: 0xe2b088, hat: 'fedora', beard: 0x5a3a1a },
      { shirt: 0xf3efe2, pants: 0x4b3b2b, skin: 0xe8c0a0, kippah: 0x222222, hair: 0x8a8a8a },
      { shirt: 0xffffff, pants: 0x222222, skin: 0xf5d6b8, kippah: 0xffffff, hair: 0x4a2f1b },
    ];
    for (const lk of MARCH_LOOKS) {
      const p = G.makePerson(lk);
      p.group.visible = false;
      p.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(p.group);
      marchers.push({ p, x: 0, z: 0, ph: Math.random() * 6 });
    }
    // ספר התורה (בידי הראשון) וחופה מעליו
    const torah = new T.Group();
    const mantle = new T.Mesh(new T.BoxGeometry(0.34, 0.7, 0.26), lam(0x7b1e3a));
    const crown = new T.Mesh(new T.CylinderGeometry(0.14, 0.18, 0.18, 8), lam(0xd4a017));
    crown.position.y = 0.45;
    torah.add(mantle, crown);
    torah.position.set(0, 1.45, 0.3);
    marchers[0].p.group.add(torah);
    const chuppah = new T.Group();
    const cloth = new T.Mesh(new T.BoxGeometry(2.2, 0.06, 2.2), lam(0x1b3a8a));
    cloth.position.y = 2.6;
    const star = new T.Mesh(new T.BoxGeometry(0.5, 0.07, 0.5), lam(0xffd23f));
    star.position.y = 2.64;
    star.rotation.y = Math.PI / 4;
    chuppah.add(cloth, star);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pole = new T.Mesh(new T.BoxGeometry(0.06, 2.6, 0.06), lam(0xd4a017));
      pole.position.set(x, 1.3, z);
      chuppah.add(pole);
    }
    chuppah.visible = false;
    scene.add(chuppah);
    let trail = [];
    function placeMarchers() {
      const fx = Math.sin(van.h), fz = Math.cos(van.h);
      trail = [];
      for (let k = 0; k < 40; k++) trail.push([van.x - fx * k, van.z - fz * k]);
      marchers.forEach((m, i) => {
        m.x = van.x - fx * (6 + i * 1.3) + (i % 2 ? 0.8 : -0.8) * fz;
        m.z = van.z - fz * (6 + i * 1.3) - (i % 2 ? 0.8 : -0.8) * fx;
        m.p.group.visible = true;
      });
      chuppah.visible = true;
    }
    function startPt3() {
      S().quests.pt3 = Object.assign(DEF.pt3(), { status: 'active' });
      placeMarchers();
      A.success();
      api.setRadio(1);
      api.toast('הכנסת ספר תורה! הובילו את התהלוכה לבית הכנסת הגדול — לאט, שכולם יעמדו בקצב 🎶', 'gold');
      api.save();
    }
    function headDist() {
      const m = marchers[0];
      return Math.hypot(m.x - van.x, m.z - van.z);
    }
    function pt3Update(dt, t) {
      const st = q('pt3');
      // שובל הדרך של הטנק — התהלוכה הולכת בעקבותיו
      const last = trail[0];
      if (!last || Math.hypot(van.x - last[0], van.z - last[1]) > 1) {
        trail.unshift([van.x, van.z]);
        if (trail.length > 140) trail.pop();
      }
      if (st.step === 'march') {
        marchers.forEach((m, i) => {
          const idx = Math.min(trail.length - 1, 7 + Math.floor(i / 2) * 2);
          const side = i % 2 ? 0.8 : -0.8;
          const a = trail[idx], b = trail[Math.max(0, idx - 1)];
          const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
          const tx = a[0] - (dz / L) * side, tz = a[1] + (dx / L) * side;
          const d = Math.hypot(tx - m.x, tz - m.z);
          const sp = Math.min(d, 4.6 * dt);
          if (d > 0.05) {
            m.x += ((tx - m.x) / d) * sp;
            m.z += ((tz - m.z) / d) * sp;
            m.p.group.rotation.y = Math.atan2(tx - m.x, tz - m.z);
          }
          const bob = G.animatePerson(m.p, t * 7 + m.ph, d > 0.3 ? 1 : 0.3);
          m.p.group.position.set(m.x, bob + Math.abs(Math.sin(t * 5 + m.ph)) * 0.12, m.z);
          if (i > 0) {
            m.p.armL.rotation.x = m.p.armR.rotation.x = -2.4 + Math.sin(t * 6 + m.ph) * 0.4;
          } else m.p.armL.rotation.x = m.p.armR.rotation.x = -1.2;
        });
        const m0 = marchers[0];
        chuppah.position.set(m0.x, 0, m0.z);
        chuppah.rotation.y = m0.p.group.rotation.y;
        // הטנק רחוק מדי מהתהלוכה
        const far = headDist() > 24;
        if (far) {
          st.lagT += dt;
          if (st.lagT > 1.5 && !st.lagWarn) {
            st.lagWarn = true;
            st.lags++;
            api.toast('🐢 התהלוכה נשארה מאחור! עצרו וחכו להם', '');
          }
        } else if (st.lagT > 0) {
          st.lagT = 0;
          st.lagWarn = false;
        }
        if (vanZone(SP.zoneGreat, 10) && headDist() < 16 && Math.abs(van.v) < 2) startCeremony();
      } else if (st.step === 'ceremony') {
        st.cerT += dt;
        const gs = SP.greatDoor;
        marchers.forEach((m, i) => {
          const a = (i / marchers.length) * Math.PI * 2 + st.cerT * 1.3;
          const cx = gs.x + Math.sin(gs.rot) * 4, cz = gs.z + Math.cos(gs.rot) * 4;
          const tx = cx + Math.cos(a) * 2.6, tz = cz + Math.sin(a) * 2.6;
          m.x += (tx - m.x) * Math.min(1, dt * 3);
          m.z += (tz - m.z) * Math.min(1, dt * 3);
          const bob = G.animatePerson(m.p, t * 9 + m.ph, 1);
          m.p.group.position.set(m.x, bob + Math.abs(Math.sin(t * 7 + i)) * 0.3, m.z);
          m.p.group.rotation.y = a + Math.PI;
          if (i > 0) m.p.armL.rotation.x = m.p.armR.rotation.x = -2.7 + Math.sin(t * 7 + i) * 0.3;
        });
        chuppah.position.set(marchers[0].x, 0, marchers[0].z);
        if (st.cerT > 3 && !st.cheer) {
          st.cheer = true;
          A.cheer && A.cheer();
        }
        if (st.cerT > 14) completePt3();
      }
    }
    function startCeremony() {
      const st = q('pt3');
      st.step = 'ceremony';
      st.cerT = 0;
      if (W.greatLights) W.greatLights.visible = true;
      A.cheer && A.cheer();
      api.toast('🎉 הגעתם לבית הכנסת הגדול! ריקודים עם ספר התורה', 'gold');
    }
    function completePt3() {
      const st = q('pt3');
      if (st.status !== 'active') return;
      st.status = 'complete';
      marchers.forEach((m) => (m.p.group.visible = false));
      chuppah.visible = false;
      api.addJoy(20);
      api.addCommunity(3);
      api.save();
      api.results({
        stars: st.lags === 0 ? 3 : st.lags <= 2 ? 2 : 1,
        title: 'ספר תורה חדש בבית הכנסת הגדול!',
        note: 'פרק 2 הושלם. פתח תקווה — ״אם המושבות״ — קיבלה את השליח בזרועות פתוחות. המשך יבוא...',
        rows: [['פעמים שהתהלוכה נשארה מאחור', String(st.lags)], ['זמן', api.fmtTime(st.elapsed)]],
        changes: ['בבית הכנסת הגדול דולקים אורות של שמחה', 'פתח תקווה מכירה את בית חב״ד'],
      });
    }

    // ================= משימה סודית: הנכד של המייסדים =================
    // ר׳ יואל יושב לבד בכיכר המתנדבים. לוקחים אותו בטנק לבית הכנסת הגדול, שבו התפלל סבא שלו.
    const sq = W.places.find((p) => /כיכר המתנדבים/.test(p.he || '')) || { x: (SP.greatDoor || player).x + 25, z: (SP.greatDoor || player).z + 25 };
    let yx = sq.x, yz = sq.z;
    for (let k = 0; k < 12 && W.collide(yx, yz, 0.6).hit; k++) yx += 1.5;
    const yoel = api.addNPC({ id: 'pt_yoel', name: 'ר׳ יואל', role: 'נכד של מייסדי המושבה', x: yx, z: yz, rot: 0, look: { shirt: 0xffffff, jacket: 0x5d5d6b, pants: 0x3b3b44, skin: 0xe8c0a0, hat: 'fedora', beard: 0xf0f0f0 } });
    yoel.hidden = true;
    const STORIES = [
      'סבא שלי הגיע לכאן ב־1878. ביצות, יתושים, קדחת... כולם אמרו שהם משוגעים.',
      'הם קראו למקום ״פתח תקווה״ — מהפסוק ״ועמק עכור לפתח תקווה״. מקום של ייאוש שהפך לתקווה.',
      'כל ערב שבת סבא היה הולך לבית הכנסת הגדול. אני הייתי ילד, מחזיק לו את היד.',
      'אחרי שהוא נפטר... הפסקתי ללכת. שישים שנה לא נכנסתי לשם.',
    ];
    function dlgYoel() {
      const st = q('ptS');
      if (done('ptS')) return { a: { s: 'npc', t: 'שבת שלום, שליח. אני כבר לא יושב לבד בכיכר — יש לי מקום קבוע בבית הכנסת.' } };
      if (st.step !== 'meet') return { a: { s: 'npc', t: 'אני מוכן. ניסע לאט, כן?' } };
      return {
        a: { s: 'narr', t: 'זקן יושב על ספסל בכיכר, מחזיק סידור ישן עם כריכה מתפוררת. הוא מסתכל על בית הכנסת הגדול מרחוק.', c: [{ t: 'לשבת לידו בשקט', go: 'b' }, { t: 'שלום! רוצה להניח תפילין?', go: 'a2' }] },
        a2: { s: 'npc', t: '(מחייך בעצב) תפילין... אולי. קודם תשב רגע, בחור.', go: 'b' },
        b: { s: 'npc', t: 'זה הסידור של סבא שלי. מייסדי המושבה, אתה יודע? הוא התפלל שם, בבית הכנסת הגדול.', c: [{ t: 'ואתה? אתה מתפלל שם?', go: 'c' }] },
        c: { s: 'npc', t: 'אני? ...שישים שנה לא הייתי. הרגליים כבר לא מה שהיו, והלב... גם הוא לא.', c: [{ t: 'יש לי טנק עם מזגן וניגונים. ניסע ביחד?', go: 'd' }] },
        d: { s: 'npc', t: '(שותק רגע ארוך) ...טוב. אבל לאט. ואתה מקשיב לסיפורים של זקן.', end: () => { st.step = 'ride'; api.toast('הביאו את הטנק לכיכר ואספו את ר׳ יואל', 'gold'); api.save(); } },
      };
    }
    function startSecretPT() {
      S().quests.ptS = Object.assign(DEF.ptS(), { status: 'active' });
      yoel.hidden = false;
      api.toast('״הנכד של המייסדים״ — בלי שעון. רק להקשיב.', 'gold');
      api.save();
    }
    function ptSUpdate(dt) {
      const st = q('ptS');
      yoel.hidden = st.step === 'drive' || st.step === 'done';
      if (st.step === 'drive') {
        st.storyT += dt;
        // סיפור כל 14 שניות, רק כשבאמת נוסעים
        if (st.story < STORIES.length && st.storyT > 14 && Math.abs(van.v) > 2) {
          st.storyT = 0;
          const t = STORIES[st.story++];
          api.toast('ר׳ יואל: ״' + t + '״');
          if (G.voice) G.voice.speak(t, 'pt_yoel', 'ר׳ יואל');
        }
      }
    }
    function arriveSecretPT() {
      const st = q('ptS');
      st.step = 'done';
      const gs = SP.greatDoor || player;
      yoel.x = yoel.def.x = gs.x + Math.sin(gs.rot || 0) * 2;
      yoel.z = yoel.def.z = gs.z + Math.cos(gs.rot || 0) * 2;
      yoel.rot = yoel.rotT = (gs.rot || 0) + Math.PI;
      yoel.hidden = false;
      if (W.greatLights) W.greatLights.visible = true;
      api.say({
        id: 'pt_yoel', def: yoel.def, x: yoel.x, z: yoel.z, rot: yoel.rot, p: yoel.p,
        nodes: {
          a: { s: 'narr', t: 'ר׳ יואל יורד מהטנק לאט, נשען עליך. הוא עומד מול הדלת הגדולה ולא זז.', go: 'b' },
          b: { s: 'npc', t: '...שם, ליד ארון הקודש. שם הוא ישב. ואני לידו, עם הרגליים שלא הגיעו לרצפה.', go: 'c' },
          c: { s: 'narr', t: 'על הקיר, בלוח התורמים הישן, חרוט שם: ״יואל בן שמואל — ממייסדי המושבה״. הזקן מעביר אצבע על האותיות.', go: 'd' },
          d: { s: 'npc', t: 'קראו לי על שמו. ...תגיד, בחור, יש לך במקרה תפילין בטנק?', c: [{ t: 'תמיד. ואני אחכה לך גם בשבת הבאה.', go: 'e' }] },
          e: { s: 'narr', t: 'בפעם הראשונה מזה שישים שנה, ר׳ יואל נכנס לבית הכנסת הגדול.', end: completeSecretPT },
        },
      });
    }
    function completeSecretPT() {
      const st = q('ptS');
      st.status = 'complete';
      api.addJoy(20);
      api.addCommunity(3);
      api.save();
      api.results({
        title: 'הנכד של המייסדים',
        note: '״ועמק עכור לפתח תקווה״ — לפעמים התקווה מחכה שישים שנה, בדיוק מעבר לרחוב.',
        rows: [['שעון', 'לא היה'], ['ר׳ יואל', 'חזר לבית הכנסת של סבא']],
        changes: ['ר׳ יואל מתפלל מעכשיו בבית הכנסת הגדול', 'בבית הכנסת דולקים אורות של שמחה'],
      }, 1500);
    }

    // ================= ר׳ מנחם: הצעות, רמזים וטלפון =================
    const OFFER = {
      pt1: () => ({
        a: { s: 'npc', t: (S().flags.ptMet ? '' : 'ברוך הבא לפתח תקווה, שליח! אני מנחם, השליח פה. משה סיפר לי עליך הרבה. ') + 'שישי היום, והשוק של פתח תקווה מלא — ארבעה בעלי דוכנים שאני מכיר מחכים למישהו שיבוא.', go: 'b', fx: () => (S().flags.ptMet = true) },
        b: { s: 'npc', t: 'ערכת מבצעים — מזוזה, תפילין, קופת צדקה ונרות שבת — שמתי בתא המטען של הטנק. יש לך חמש דקות עד שהשוק נסגר לשבת.', c: [{ t: 'יוצא לשוק!', fx: startPt1 }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'אני פה כשתהיה מוכן.' },
      }),
      pt2: () => ({
        a: { s: 'npc', t: 'בשניידר — בית החולים לילדים — יש ילד בשם נועם, כבר שבוע מאושפז. אבא שלו, יגאל, ביקש שמישהו יבוא.', go: 'b' },
        b: { s: 'npc', t: 'הכנו שלוש מתנות ליד הדלת. העמס אותן על הטנק וסע בעדינות — יש בלונים על הגג! שש דקות עד סוף שעות הביקור.', c: [{ t: 'בדרך לשניידר!', fx: startPt2 }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'המתנות מחכות ליד הדלת.' },
      }),
      ptB: () => ({
        a: { s: 'npc', t: 'שמע, החבר׳ה מברסלב הגיעו לעיר עם הניידת והרמקול הענק. הם רוצים לשמח את פתח תקווה — שלוש התקהלויות, ריקודים ברחוב.', go: 'b' },
        b: { s: 'npc', t: 'שמחה של יהודי — זה הכי חב״די שיש! תצטרף אליהם? הניידת מחכה לא רחוק מכאן.', c: [{ t: 'יאללה, לשמח את העיר!', fx: startPtB }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'הם לא הולכים לשום מקום — נ נח נחמ...' },
      }),
      pt3: () => ({
        a: { s: 'npc', t: 'זה היום! ספר תורה חדש, נכתב בשביל הקהילה — ואנחנו מכניסים אותו לבית הכנסת הגדול.', go: 'b' },
        b: { s: 'npc', t: 'אתה מוביל את התהלוכה עם הטנק והניגונים. סע לאט — אנשים הולכים ורוקדים מאחוריך. אם תתרחק מדי, תעצור ותחכה.', c: [{ t: 'יוצאים בשמחה!', fx: startPt3 }, { t: 'עוד רגע', go: 'd' }] },
        d: { s: 'npc', t: 'הספר מחכה, והחופה כבר פרוסה.' },
      }),
    };
    // ================= משימה 3: לשמח את העיר — עם הניידת של ברסלב =================
    let bresRetry = 0;
    function startPtB() {
      S().quests.ptB = Object.assign(DEF.ptB(), { status: 'active' });
      launchBres();
      api.save();
    }
    function launchBres() {
      const EV = api.events && api.events();
      if (!EV) return false;
      const ok = EV.startBreslevQuest(completePtB);
      if (ok) api.toast('הניידת של ברסלב מחכה לך — מסומנת במפה 🎶', 'gold');
      return ok;
    }
    function bresStage() {
      const EV = api.events && api.events(), ev = EV && EV.current;
      if (!ev || ev.type !== 'breslev' || !ev.quest) return null;
      return ev;
    }
    function completePtB() {
      const st = q('ptB');
      if (st.status !== 'active') return;
      st.status = 'complete';
      api.save();
      api.results({
        stars: 3,
        title: 'שימחתם את העיר!',
        note: '״מצווה גדולה להיות בשמחה תמיד״ — ובחב״ד אומרים: ״שמחה פורצת גדר״.',
        rows: [['תחנות', '3 מתוך 3'], ['רקדו ברחוב', 'הרבה!']],
        changes: ['החבר׳ה מברסלב ובית חב״ד — חברים', 'ר׳ מנחם מכין משהו גדול לבית הכנסת הגדול...'],
      }, 800);
    }

    const HINT = {
      pt1: () => (q('pt1').bag ? 'יש לך את הערכה. ארבעה דוכנים בשוק — דבר עם כל אחד מהם.' : 'סעו עם הטנק לשוק (הקו במפה). ערכת המבצעים בטנק — לוקחים אותה כשיורדים.'),
      pt2: () => ({ load: 'המתנות ליד הדלת של בית חב״ד — הטנק צריך להיות קרוב.', drive: 'סע לשניידר ועצור מול הכניסה. בעדינות!', meet: 'יגאל מחכה ליד הכניסה לבית החולים.' }[q('pt2').step]),
      ptB: () => {
        const ev = bresStage();
        if (!ev || ev.state === 'ask') return 'הניידת של ברסלב מחכה (סימון סגול במפה). עולים אליה — ' + ACT + ' ליד הניידת.';
        if (ev.state === 'drive') return 'נוסעים עם החבר׳ה לתחנה ' + (ev.i + 1) + ' מתוך 3.';
        if (ev.state === 'dance') return 'רוקדים! 🎉';
        return 'עוד רגע...';
      },
      pt3: () => (q('pt3').step === 'march' ? 'הובל את התהלוכה לבית הכנסת הגדול. לאט — שכולם יעמדו בקצב.' : 'ריקודים!'),
      ptS: () => ({ meet: 'ר׳ יואל יושב בכיכר המתנדבים. בלי לחץ — פשוט לשבת לידו.', ride: 'הביאו את הטנק לכיכר ואספו את ר׳ יואל.', drive: 'סעו לאט לבית הכנסת הגדול, ותקשיבו לסיפורים.', done: '' }[q('ptS').step]),
    };
    const SECRET_OFFER = () => ({
      a: { s: 'npc', t: 'שליח, יש משהו שלא סיפרתי לך. בכיכר המתנדבים יושב כל יום זקן אחד, ר׳ יואל. נכד של מייסדי המושבה.', go: 'b' },
      b: { s: 'npc', t: 'אין פה שעון ואין פרס. רק... תעבור לידו? סימנתי לך במפה.', c: [{ t: 'אני בדרך.', fx: startSecretPT }, { t: 'אחר כך', fx: () => (q('ptS').status = 'idle') }] },
    });
    function mosheDialog() {
      const a = activeId();
      if (!a && done('pt3') && (q('ptS').status === 'idle' || q('ptS').status === 'locked')) return SECRET_OFFER();
      if (a) return { a: { s: 'npc', t: HINT[a]() + (q(a).timeLeft !== undefined ? ' נשארו ' + api.fmtTime(q(a).timeLeft) + '.' : '') } };
      const nx = nextQuest();
      if (nx && available(nx)) return OFFER[nx]();
      return { a: { s: 'npc', t: 'שליח, מה שעשית בפתח תקווה — השוק, שניידר, ספר התורה' + (done('ptS') ? ', ור׳ יואל' : '') + ' — אין מילים. כשתרצה לחזור להוד השרון, בתפריט ההשהיה. ותבוא לבקר!' } };
    }
    function mosheIcon() {
      if (activeId()) return 'hint';
      const nx = nextQuest();
      if (!nx && q('ptS').status !== 'complete') return 'mission';
      return nx && available(nx) ? 'mission' : null;
    }

    // ================= אינטראקציות =================
    const trunk = () => ({ x: van.x - Math.sin(van.h) * 3.4, z: van.z - Math.cos(van.h) * 3.4 });
    function interactables() {
      const a = activeId(), out = [];
      if (a === 'pt1' && !q('pt1').bag) {
        const tr = trunk();
        out.push({ x: tr.x, z: tr.z, r: 2.4, label: 'לקחת את ערכת המבצעים מתא המטען', run: () => { q('pt1').bag = true; A.load && A.load(); api.toast('יש ערכה: מזוזה, תפילין, קופת צדקה ונרות שבת — לשוק!', 'gold'); } });
      }
      if (a === 'pt2' && q('pt2').step === 'load')
        out.push({
          x: giftGrp.position.x, z: giftGrp.position.z, r: 2.4, label: 'להעמיס את המתנות על הטנק',
          run: () => {
            if (!vanNear()) return api.toast('המתנות כבדות — הביאו את הטנק קרוב');
            const st = q('pt2');
            st.step = 'drive';
            st.gifts = 3;
            giftGrp.visible = false;
            balloons.visible = true;
            balloons.children.forEach((c) => (c.visible = true));
            A.load && A.load();
            api.toast('המתנות בטנק והבלונים על הגג! לשניידר — בעדינות 🎈', 'gold');
          },
        });
      return out;
    }
    function vanAction() {
      const a = activeId();
      if (a === 'ptS') {
        const st = q('ptS');
        if (st.step === 'ride' && Math.hypot(yoel.x - van.x, yoel.z - van.z) < 8)
          return { label: 'לאסוף את ר׳ יואל', run: () => { st.step = 'drive'; st.storyT = 10; A.door && A.door('tank'); api.toast('ר׳ יואל עלה לטנק. נוסעים לאט לבית הכנסת הגדול', 'gold'); api.save(); }, x: yoel.x, z: yoel.z };
        if (st.step === 'drive' && vanZone(SP.zoneGreat, 11)) return { label: 'להוריד את ר׳ יואל ליד בית הכנסת', run: arriveSecretPT };
      }
      if (a === 'pt2' && q('pt2').step === 'drive' && vanZone(SP.zoneHosp, 12))
        return {
          label: 'לפרוק את המתנות מול שניידר',
          run: () => {
            const st = q('pt2');
            st.step = 'meet';
            father.hidden = false;
            A.load && A.load();
            api.toast('המתנות בכניסה. יגאל מחכה ליד הדלת — רדו לדבר איתו', 'gold');
          },
        };
      return null;
    }
    function npcDialog(n) {
      const o = OWNERS.find((x) => x.id === n.id);
      if (o) {
        if (activeId() === 'pt1') return dlgOwner(o);
        if (done('pt1') && q('pt1').owners[o.id] === 'yes') return { a: { s: 'npc', t: 'שבת שלום, שליח! מאז שבאת — הדוכן מלא ברכה.' } };
        return { a: { s: 'npc', t: ['שלושה קילו בעשר!', 'זעתר טרי!', 'פירות העונה!', 'זיתים, חמוצים!'][OWNERS.indexOf(o)] } };
      }
      if (n.id === 'pt_yoel') return dlgYoel();
      if (n.id === 'pt_father') {
        if (activeId() === 'pt2' && q('pt2').step === 'meet') return dlgFather();
        return { a: { s: 'npc', t: 'תודה על הביקור. נועם מחכה לך שוב.' } };
      }
      return null;
    }
    function iconFor(n) {
      const a = activeId();
      const o = OWNERS.find((x) => x.id === n.id);
      if (o && a === 'pt1' && !q('pt1').owners[o.id]) return 'alert';
      if (n.id === 'pt_father' && a === 'pt2' && q('pt2').step === 'meet') return 'alert';
      if (n.id === 'pt_yoel' && a === 'ptS' && q('ptS').step !== 'done') return 'star';
      return null;
    }
    function navTarget() {
      const a = activeId();
      if (a === 'pt1') {
        const st = q('pt1');
        // הערכה בטנק: אם הטנק רחוק — קודם אליו; אחרת ישר לשוק (לוקחים אותה כשיורדים)
        if (!st.bag && !S().inVan && Math.hypot(player.x - van.x, player.z - van.z) > 20) return trunk();
        let best = null, bd = 1e9;
        for (const o of OWNERS) {
          if (st.owners[o.id]) continue;
          const d = Math.hypot(o.n.x - player.x, o.n.z - player.z);
          if (d < bd) {
            bd = d;
            best = o.n;
          }
        }
        return best;
      }
      if (a === 'pt2') {
        const st = q('pt2');
        if (st.step === 'load') return giftGrp.position;
        if (st.step === 'drive') return SP.zoneHosp;
        return father;
      }
      if (a === 'pt3') return q('pt3').step === 'march' ? SP.zoneGreat : null;
      if (a === 'ptS') {
        const st = q('ptS');
        return st.step === 'drive' ? SP.zoneGreat : st.step === 'done' ? null : yoel;
      }
      // משימת ברסלב: לניידת, ואחר כך לתחנה הבאה
      if (a === 'ptB') {
        const ev = bresStage();
        if (!ev) return null;
        if (ev.state === 'ask') return { x: ev.bv.x, z: ev.bv.z };
        if (ev.state === 'drive') return { x: ev.stops[ev.i].cx, z: ev.stops[ev.i].cz };
        return null;
      }
      // אין משימה פעילה אבל יש מה להתחיל: המפה מובילה לר׳ מנחם
      const nx = nextQuest();
      if (!a && ((nx && available(nx)) || q('ptS').status === 'idle')) return api.npcById.moshe;
      return null;
    }
    function mapDots(dot) {
      const t = navTarget();
      if (t) dot(t.x, t.z, 5, 'rgba(255,210,63,0.9)', '#13213f');
      if (activeId() === 'pt3') dot(marchers[0].x, marchers[0].z, 4, '#ffffff', '#1b3a8a');
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
        if (a === 'pt1') {
          row('ערכת מבצעים', st.bag ? '✓ איתך' : 'בטנק 🚐', st.bag ? 'ok' : '');
          for (const o of OWNERS) {
            const s = st.owners[o.id];
            row(o.name + ' <small>' + ITEM[o.need] + '</small>', s === 'yes' ? '✓' : s === 'no' ? 'לא הפעם' : 'ממתין', s === 'yes' ? 'ok' : s === 'no' ? 'no' : '');
          }
        } else if (a === 'pt2') {
          row('מתנות', st.step === 'load' ? 'ליד הדלת' : st.step === 'drive' ? 'בטנק 🚐' : '✓ בשניידר', st.step === 'meet' ? 'ok' : '');
          row('בלונים', st.intact + '/3', st.intact === 3 ? 'ok' : 'later');
        } else if (a === 'ptB') {
          const ev = bresStage();
          row('הניידת', !ev || ev.state === 'ask' ? 'מחכה לך' : '✓ על הניידת', !ev || ev.state === 'ask' ? '' : 'ok');
          row('תחנות', ev ? Math.min(3, ev.i + (ev.state === 'drive' ? 0 : 1)) + '/3' : '0/3', '');
        } else if (a === 'ptS') {
          h += '</ul><div class="tr-obj">' + HINT.ptS() + '</div>';
          return h;
        } else if (a === 'pt3') {
          const d = Math.round(headDist());
          row('התהלוכה', st.step === 'ceremony' ? '🎉 רוקדים' : d > 24 ? 'מאחור! ' + d + ' מ׳' : 'צמודה · ' + d + ' מ׳', st.step === 'ceremony' || d <= 24 ? 'ok' : 'later');
        }
        return h + '</ul><div class="tr-obj">' + HINT[a]() + '</div>';
      }
      const nx = nextQuest();
      if (nx) return '<div class="tr-title">' + TITLES[nx] + '</div><div class="tr-obj">דברו עם <b>' + MEN + '</b> ליד בית חב״ד פתח תקווה <span class="ic blue">!</span></div>';
      if (q('ptS').status === 'idle') return '<div class="tr-title">' + TITLES.ptS + '</div><div class="tr-obj">ר׳ יואל מחכה בכיכר. ' + MEN + ' יודע איפה.</div>';
      return '<div class="tr-title done">✓ פרק 2 הושלם!</div><div class="tr-obj">' + (done('ptS') ? 'גם ר׳ יואל חזר לבית הכנסת. ' : '') + 'פתח תקווה מכירה את השליח. המשך יבוא...</div>';
    }

    // ================= עדכון =================
    const M = {
      rain: 0,
      caller: { id: 'moshe', name: MEN, role: 'בטלפון 📞' },
      callerIntro: 'שליח! מדבר מנחם מפתח תקווה. ',
      onGain(kind, n) {
        const a = activeId();
        if (a) q(a)[kind === 'joy' ? 'joy' : 'comm'] += n;
      },
      timeRate() {
        if (activeId() === 'pt3' && q('pt3').step === 'ceremony') return 0;
        return activeId() && activeId() !== 'pt3' ? 0.5 : 2;
      },
      driveMods(v) {
        // בתהלוכה הטנק נוסע לאט
        if (v === van && activeId() === 'pt3' && q('pt3').step === 'march') return { max: 0.34, grip: 1 };
        return { max: 1, grip: 1 };
      },
      obstacles(out) {
        if (activeId() === 'pt3') for (const m of marchers) out.push({ x: m.x, z: m.z, r: 0.4 });
        if (giftGrp.visible) out.push({ x: giftGrp.position.x, z: giftGrp.position.z, r: 1.1 });
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
        // את הפגישה הראשונה עושים פנים אל פנים, ליד בית חב״ד
        if (nx === 'pt1' && !S().flags.ptMet) return null;
        if (!nx && q('ptS').status === 'locked') return { id: 'ptS', nodes: SECRET_OFFER() };
        return nx && available(nx) ? { id: nx, nodes: OFFER[nx]() } : null;
      },
      update(dt) {
        const a = activeId();
        for (const o of OWNERS) o.n.hidden = false;
        updateShoppers(dt, performance.now() / 1000);
        if (a) {
          const st = q(a);
          st.elapsed += dt;
          if (st.timeLeft !== undefined) st.timeLeft -= dt;
          // ערכת המבצעים נלקחת לבד כשיורדים מהטנק או עומדים לידו
          if (a === 'pt1' && !st.bag && !S().inVan && Math.hypot(player.x - van.x, player.z - van.z) < 7) {
            st.bag = true;
            A.load && A.load();
            api.toast('לקחתם מהטנק את ערכת המבצעים: מזוזה, תפילין, קופת צדקה ונרות שבת 🎒', 'gold');
          }
          if (a === 'pt1' && st.timeLeft <= 0) {
            api.toast('השוק נסגר לשבת!', 'gold');
            completePt1('time');
          }
          if (a === 'pt2') pt2Update(dt);
          if (a === 'pt3') pt3Update(dt, performance.now() / 1000);
          if (a === 'ptS') ptSUpdate(dt);
          // המשימה פעילה אבל אין ניידת (למשל אחרי טעינה מחדש) — מזמינים אותה שוב
          if (a === 'ptB' && !bresStage() && (bresRetry -= dt) <= 0) {
            bresRetry = 3;
            launchBres();
          }
        }
        if (a !== 'ptS') yoel.hidden = !done('ptS');
        if (a !== 'pt2') {
          father.hidden = !(q('pt2').status === 'active' && q('pt2').step === 'meet');
        }
      },
      visuals(dt, t) {
        // מראים איפה לעצור רק כשבאמת צריך לעצור שם עם הטנק
        const a = activeId();
        BEAMS.hosp.g.visible = a === 'pt2' && q('pt2').step === 'drive';
        BEAMS.great.g.visible = (a === 'pt3' && q('pt3').step === 'march') || (a === 'ptS' && q('ptS').step === 'drive');
        const pulse = 1 + Math.sin((t || performance.now() / 1000) * 4) * 0.05;
        BEAMS.hosp.rg.scale.setScalar(pulse);
        BEAMS.great.rg.scale.setScalar(pulse);
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
      const a = activeId();
      if (a === 'pt2') {
        const st = q('pt2');
        giftGrp.visible = st.step === 'load';
        balloons.visible = st.step === 'drive';
        balloons.children.forEach((c, i) => (c.visible = Math.floor(i / 2) < st.intact));
      }
      if (a === 'pt3') {
        q('pt3').step = 'march';
        placeMarchers();
      }
      if (a === 'ptS' && q('ptS').step === 'done') q('ptS').step = 'drive';
      if (a) setTimeout(() => api.toast('ממשיכים מאיפה שעצרנו: ' + TITLES[a], 'gold'), 1200);
    })();
    return M;
  };
})();
