// משימת פסח: ״מצה שמורה לכל השכונה״ — אופים במאפייה, מחלקים בעיר, וסדר משותף מול בית חב״ד
// עובדת בשתי הערים; נפתחת אחרי פרק 2. משתלבת עם מנהל המשימות של העיר (combineMissions)
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makePesach = function (api) {
    const { scene, W, A, player, van, isTouch } = api;
    const S = () => api.S;
    const ACT = isTouch ? 'כפתור הפעולה' : 'E';
    const city = W.cityId || 'hod';
    const NEED = 6;
    const TITLE = '🫓 פרק 2 · משימה 4 · ״מצה שמורה לכל השכונה״';
    const CALLER = city === 'pt' ? 'ר׳ מנחם' : 'משה';
    const N = (id) => api.npcById[id];

    if (!S().quests) S().quests = {};
    const DEF = () => ({ status: 'locked', step: 'bake', best: 0, delivered: {}, recips: [], city: null });
    S().quests.pesach = Object.assign(DEF(), S().quests.pesach || {});
    const q = () => S().quests.pesach;
    // נפתחת אחרי הסיבוב עם ברסלב (משימה 3 בפרק 2), וסוגרת את הפרק
    const ch2Done = () => ['ptB', 'pt3'].some((id) => S().quests[id] && S().quests[id].status === 'complete');
    const active = () => q().status === 'active';

    // מי מקבל מצה: דמויות קבועות בעיר הנוכחית שגלויות עכשיו
    const POOL = city === 'pt' ? ['pt_shimshon', 'pt_avi', 'pt_moti', 'pt_rachamim', 'pt_yoel', 'pt_father'] : ['cohen', 'roi', 'daniel', 'yossi', 'zalman', 'avraham'];
    function pickRecipients() {
      const list = POOL.filter((id) => N(id) && !N(id).hidden).slice(0, 5);
      q().recips = list;
      q().city = city;
      q().delivered = {};
    }
    // אם עברו עיר באמצע — המצות בטנק נוסעות איתך, ומחלקים לאנשים בעיר החדשה
    if (active() && q().city !== city && q().step !== 'bake') {
      pickRecipients();
      if (q().step === 'seder') q().step = 'deliver';
    }
    // רענון באמצע הסדר — חוזרים לנקודה שלפני תחילתו
    if (active() && q().step === 'sedertime') q().step = 'seder';

    // ---------- קופסת המצות ליד המטבח ----------
    const kitchen = (W.spots || {}).kitchen || (W.spots || {}).playerStart;
    const box = new T.Group();
    const bm = new T.Mesh(new T.BoxGeometry(0.8, 0.35, 0.6), new T.MeshLambertMaterial({ color: 0xf3e6c4 }));
    bm.position.y = 0.18;
    const band = new T.Mesh(new T.BoxGeometry(0.82, 0.08, 0.62), new T.MeshLambertMaterial({ color: 0x1b3a8a }));
    band.position.y = 0.3;
    box.add(bm, band);
    box.position.set(kitchen.x, 0, kitchen.z + 0.6);
    box.visible = false;
    scene.add(box);

    // ---------- שולחן הסדר מול בית חב״ד ----------
    const fr = W.chabadFrame;
    const F = (lx, lz) => [fr.x + lx * Math.cos(fr.ang) + lz * Math.sin(fr.ang), fr.z - lx * Math.sin(fr.ang) + lz * Math.cos(fr.ang)];
    const seder = new T.Group();
    {
      const lam = (c) => new T.MeshLambertMaterial({ color: c });
      const top = new T.Mesh(new T.BoxGeometry(6.2, 0.08, 1.3), lam(0xffffff));
      top.position.y = 0.8;
      seder.add(top);
      for (const [x, z] of [[-2.9, -0.5], [2.9, -0.5], [-2.9, 0.5], [2.9, 0.5]]) {
        const leg = new T.Mesh(new T.BoxGeometry(0.08, 0.8, 0.08), lam(0x6b3e1f));
        leg.position.set(x, 0.4, z);
        seder.add(leg);
      }
      for (let k = 0; k < 6; k++) {
        const x = -2.5 + k;
        const plate = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.02, 12), lam(0xe8e2d6));
        plate.position.set(x, 0.85, k % 2 ? 0.35 : -0.35);
        const mz = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.015, 10), lam(0xd6a050));
        mz.position.set(x, 0.87, k % 2 ? 0.35 : -0.35);
        const cup = new T.Mesh(new T.CylinderGeometry(0.04, 0.03, 0.12, 8), lam(0x7b1e3a));
        cup.position.set(x + 0.25, 0.9, k % 2 ? 0.35 : -0.35);
        seder.add(plate, mz, cup);
      }
      // ספסלים לאורך השולחן וכיסא בראשו (לשליח)
      for (const z of [-1.0, 1.0]) {
        const bench = new T.Mesh(new T.BoxGeometry(6.0, 0.08, 0.4), lam(0x8a5a32));
        bench.position.set(0, 0.44, z);
        seder.add(bench);
        for (const x of [-2.8, 2.8]) {
          const bl = new T.Mesh(new T.BoxGeometry(0.08, 0.44, 0.34), lam(0x6b3e1f));
          bl.position.set(x, 0.22, z);
          seder.add(bl);
        }
      }
      const chair = new T.Mesh(new T.BoxGeometry(0.45, 0.08, 0.45), lam(0x8a5a32));
      chair.position.set(-3.55, 0.44, 0);
      const chairLeg = new T.Mesh(new T.BoxGeometry(0.4, 0.44, 0.4), lam(0x6b3e1f));
      chairLeg.position.set(-3.55, 0.22, 0);
      seder.add(chair, chairLeg);
      const keara = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.03, 16), lam(0xd4a017));
      keara.position.set(0, 0.86, 0);
      seder.add(keara);
      const candleMat = new T.MeshBasicMaterial({ color: 0xffd27a });
      for (const x of [-0.6, 0.6]) {
        const c = new T.Mesh(new T.BoxGeometry(0.05, 0.25, 0.05), lam(0xffffff));
        c.position.set(x, 0.96, 0);
        const fl = new T.Mesh(new T.BoxGeometry(0.04, 0.07, 0.04), candleMat);
        fl.position.set(x, 1.12, 0);
        seder.add(c, fl);
      }
      if (fr) {
        const [x, z] = F(0, 3.3);
        seder.position.set(x, 0, z);
        seder.rotation.y = fr.ang;
      }
      seder.visible = false;
      scene.add(seder);
      if (W.makeLights && fr) {
        const lights = W.makeLights([-3.2, 2.6, 0], [3.2, 2.6, 0], 14, seder, 0.3);
        lights.visible = true;
      }
    }
    const seatOf = (k) => {
      const lx = -2.5 + (k % 6), lz = 3.3 + (k % 2 ? 1.0 : -1.0);
      const [x, z] = F(lx, lz);
      return { x, z, rot: fr.ang + (k % 2 ? Math.PI : 0) };
    };
    const tableAt = () => (fr ? { x: F(0, 3.3)[0], z: F(0, 3.3)[1] } : W.places.chabadDoor);

    // ---------- התחלה, אפייה, טעינה ----------
    function start() {
      Object.assign(q(), DEF(), { status: 'active', step: 'bake' });
      api.toast('🫓 לאפות מצות! גשו למאפייה ליד המטבח של בית חב״ד — לפחות ' + NEED + ' מצות כשרות', 'gold');
      api.save();
    }
    function onBake(n, quit) {
      if (!active() || q().step !== 'bake' || quit) return;
      q().best = Math.max(q().best || 0, n);
      if (n >= NEED) {
        q().step = 'load';
        pickRecipients();
        box.visible = true;
        setTimeout(() => api.toast('יש ' + n + ' מצות שמורות! קחו את הקופסה מהמטבח לטנק', 'gold'), 600);
      } else setTimeout(() => api.toast('צריך לפחות ' + NEED + ' מצות כשרות — עוד סבב במאפייה!'), 600);
      api.save();
    }
    function load() {
      if (!api.S.inVan && Math.hypot(player.x - van.x, player.z - van.z) > 26) return api.toast('הקופסה כבדה — הביאו את הטנק קרוב לבית חב״ד');
      q().step = 'deliver';
      box.visible = false;
      A.load && A.load();
      api.toast('המצות בטנק! מחלקים ל־' + q().recips.length + ' אנשים בעיר — מסומנים במפה', 'gold');
      api.save();
    }

    // ---------- חלוקה ----------
    const LINES = {
      cohen: ['מצה שמורה? בעבודת יד? ...אבא שלי היה קונה כזאת כל שנה. תודה, שליח.', 'בסדר שלי היא תהיה במרכז השולחן.'],
      roi: ['אחי, מה זה — מצה עגולה? זה כמו פיצה בלי כלום!', 'סתם... תודה. אני אביא אותה לסבתא, היא תתרגש.'],
      daniel: ['רגע, אתם אופים את זה בעצמכם? בשמונה עשרה דקות?', 'אני חייב לבוא לראות את המאפייה הזאת.'],
      yossi: ['מצה בשבילי? איזה קטע — אני עושה השנה סדר ראשון לבד בדירה.', 'אולי... אולי בעצם אבוא לסדר אצלכם?'],
      zalman: ['מצה שמורה... כמו פעם, בבית הכנסת הישן.', '(מחייך) השנה אני אגיד ״הא לחמא עניא״ בנוסח של אבא שלי.'],
      avraham: ['שליח! אתה זוכר את הזקן מהפארק!', 'הנכדים יגיעו בסדר — ויקבלו מצה אמיתית.'],
      pt_shimshon: ['מצות?! אני מוכר ירקות לסדר כל השבוע — ועכשיו גם מקבל!', 'קח חזרת על חשבון הבית.'],
      pt_avi: ['מצה שמורה — והיא עוד חמה מהתנור!', 'ואני אתן לך זעתר לסדר. עסקה.'],
      pt_moti: ['לפרנסה, צדקה; לפסח — מצה. אתם חושבים על הכל.', 'שנה הבאה בירושלים!'],
      pt_rachamim: ['אשתי תשמח — היא תמיד אומרת ״רק מצה שמורה בבית״.', 'תבוא לטעום את החרוסת שלה.'],
      pt_yoel: ['מצה שמורה... סבא שלי היה אופה בעצמו, בבית המושבה.', 'השנה, אחרי שישים שנה, אני עורך סדר.'],
      pt_father: ['מצה? לנועם? הוא יוצא מבית החולים לפני החג!', 'זאת תהיה המצה הכי טעימה שאכל.'],
    };
    function deliverTo(id) {
      const st = q();
      st.delivered[id] = true;
      api.addJoy(5);
      api.addCommunity(1);
      A.success && A.success();
      const left = st.recips.filter((r) => !st.delivered[r]).length;
      api.toast('🫓 ' + N(id).def.name + ' קיבל מצה שמורה! ' + (left ? 'נשארו ' + left : 'כולם קיבלו!'), 'gold');
      if (!left) {
        st.step = 'seder';
        setTimeout(() => api.toast(CALLER + ': ״חזרו לבית חב״ד — עורכים סדר משותף עם כולם!״', 'gold'), 1500);
      }
      api.save();
    }
    function npcDialog(n) {
      if (!active()) return null;
      const st = q();
      if (st.step === 'deliver' && st.recips.includes(n.id) && !st.delivered[n.id]) {
        const L = LINES[n.id] || ['מצה שמורה? תודה רבה!', 'חג כשר ושמח!'];
        if (!api.S.inVan && Math.hypot(player.x - van.x, player.z - van.z) > 30) return { a: { s: 'narr', t: 'המצות בטנק — הביאו את הטנק קרוב יותר.' } };
        return {
          a: { s: 'npc', t: 'שליח! מה הבאת לי הפעם?', c: [{ t: 'מצה שמורה מהמאפייה שלנו — אפינו אותה בעצמנו, ב־18 דקות.', go: 'b' }] },
          b: { s: 'npc', t: L[0], go: 'c' },
          c: { s: 'npc', t: L[1], end: () => deliverTo(n.id) },
        };
      }
      return null;
    }

    // ---------- הסדר ----------
    let moved = [];
    function startSeder() {
      const st = q();
      st.step = 'sedertime';
      seder.visible = true;
      moved = [];
      st.recips.forEach((id, k) => {
        const n = N(id);
        if (!n) return;
        const s = seatOf(k);
        moved.push(n);
        n.hidden = false;
        n.x = s.x;
        n.z = s.z;
        n.rot = n.rotT = s.rot;
        n.sit = true;
      });
      const host = N('moshe');
      const head = fr ? F(3.5, 3.3) : [player.x, player.z];
      if (host) {
        host.x = head[0];
        host.z = head[1];
        host.rot = host.rotT = fr ? fr.ang - Math.PI / 2 : 0;
        moved.push(host);
      }
      if (fr) {
        // השליח יושב בקצה השני של השולחן, מול המארח
        const [px, pz] = F(-3.55, 3.3);
        player.x = px;
        player.z = pz;
        player.rot = fr.ang + Math.PI / 2;
        player.sit = true;
        // מצלמה קבועה מצד הרחוב, מעט מלמעלה — כל השולחן בתמונה
        const [cx, cz] = F(-2.2, 10.5), [lx, lz] = F(0.3, 3.3);
        api.shot && api.shot({ pos: new T.Vector3(cx, 4.6, cz), look: new T.Vector3(lx, 0.9, lz) });
      }
      A.cheer && A.cheer();
      api.say({
        id: 'moshe', def: { name: CALLER, role: 'בית חב״ד' }, x: head[0], z: head[1], rot: 0,
        nodes: {
          a: { s: 'narr', t: 'שולחן ארוך מול בית חב״ד. מפה לבנה, נרות, קערת סדר — וכל מי שקיבל ממך מצה יושב סביבו.', go: 'b' },
          b: { s: 'npc', t: '״הא לחמא עניא״ — זה הלחם שאכלו אבותינו. והשנה — אפינו אותו בעצמנו, ביחד.', go: 'c' },
          c: { s: 'narr', t: 'הילד הכי צעיר ליד השולחן קם: ״מה נשתנה הלילה הזה מכל הלילות?״', go: 'd' },
          d: { s: 'npc', t: 'מה נשתנה? שהשנה אף אחד בשכונה לא עושה סדר לבד.', end: finish },
        },
      });
    }
    function finish() {
      const st = q();
      st.status = 'complete';
      st.step = 'done';
      api.addJoy(15);
      api.addCommunity(2);
      api.save();
      api.results({
        stars: st.best >= 9 ? 3 : st.best >= 7 ? 2 : 1,
        title: 'סדר פסח לכל השכונה!',
        note: '״כל דכפין ייתי ויכול״ — כל מי שרעב, יבוא ויאכל. השנה, השולחן של בית חב״ד היה ארוך מספיק לכולם.',
        rows: [['מצות בסבב הטוב', String(st.best)], ['קיבלו מצה שמורה', st.recips.length + ' אנשים']],
        changes: ['✓ פרק 2 הושלם!', 'כל מי שקיבל מצה ישב בסדר המשותף', 'בהוד השרון: בית חב״ד יכול להפוך ל״מרכז השליחות הגדול״ (770)', 'המאפייה פתוחה תמיד — נסו לשבור את השיא'],
        onClose: () => {
          seder.visible = false;
          player.sit = false;
          api.shot && api.shot(null);
          for (const n of moved) {
            n.sit = false;
            n.x = n.def.x;
            n.z = n.def.z;
            n.rot = n.rotT = n.def.rot || 0;
          }
          moved = [];
        },
      }, 600);
    }

    // ---------- ממשק למנהל המשימות ----------
    const OFFER = () => ({
      a: { s: 'npc', t: 'פסח מתקרב! ואני חושב... השנה, כל אחד בשכונה יקבל מצה שמורה — עגולה, בעבודת יד, מהמאפייה שלנו.', go: 'b' },
      b: { s: 'npc', t: 'אופים לפחות ' + NEED + ' מצות כשרות במאפייה ליד המטבח, מעמיסים על הטנק ומחלקים. ובסוף — סדר משותף מול בית חב״ד!', c: [{ t: 'יאללה, לאפות!', fx: start }, { t: 'עוד רגע', go: 'd' }] },
      d: { s: 'npc', t: 'המאפייה מחכה — ו־18 הדקות לא מתחילות עד שהמים פוגשים את הקמח.' },
    });
    const HINT = () =>
      ({
        bake: 'אפו לפחות ' + NEED + ' מצות כשרות בסבב אחד במאפייה (שלט ״מאפיית מצות״ ליד המטבח).',
        load: 'קחו את קופסת המצות מהמטבח לטנק (' + ACT + ' ליד הקופסה, כשהטנק קרוב).',
        deliver: 'חלקו מצה שמורה לכל מי שמסומן במפה — דברו איתם, והטנק קרוב.',
        seder: 'חזרו לבית חב״ד — הסדר המשותף מחכה!',
        sedertime: 'סדר פסח!',
      }[q().step] || '');
    function nearestRecip() {
      let best = null, bd = 1e9;
      for (const id of q().recips) {
        if (q().delivered[id]) continue;
        const n = N(id);
        if (!n) continue;
        const d = Math.hypot(n.x - player.x, n.z - player.z);
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      return best;
    }
    return {
      onBake,
      activeQuest: () => (active() ? 'pesach' : null),
      callOffer: () => (ch2Done() && q().status === 'locked' ? { id: 'pesach', nodes: OFFER() } : null),
      mosheDialog: () => {
        if (active()) return { a: { s: 'npc', t: HINT() } };
        if (ch2Done() && (q().status === 'locked' || q().status === 'idle')) return OFFER();
        return null;
      },
      mosheIcon: () => (active() ? (q().step === 'sedertime' ? false : 'hint') : ch2Done() && q().status !== 'complete' ? 'mission' : null),
      npcDialog,
      iconFor: (n) => (active() && q().step === 'deliver' && q().recips.includes(n.id) && !q().delivered[n.id] ? 'alert' : null),
      interactables() {
        const out = [];
        if (active() && q().step === 'load' && box.visible) out.push({ x: box.position.x, z: box.position.z, r: 2.2, label: 'להעמיס את קופסת המצות על הטנק', run: load });
        if (active() && q().step === 'seder') {
          const t = tableAt();
          out.push({ x: t.x, z: t.z, r: 4, label: '🍷 להתחיל את הסדר המשותף', run: startSeder });
        }
        return out;
      },
      navTarget() {
        if (!active()) return null;
        const st = q().step;
        if (st === 'bake') return kitchen;
        if (st === 'load') return box.position;
        if (st === 'deliver') return nearestRecip();
        if (st === 'seder') return tableAt();
        return null;
      },
      mapDots(dot) {
        if (!active() || q().step !== 'deliver') return;
        for (const id of q().recips) if (!q().delivered[id] && N(id)) dot(N(id).x, N(id).z, 4, '#f3d38a', '#13213f');
      },
      trackerHTML() {
        if (!active()) return null;
        const st = q();
        let h = '<div class="tr-title">' + TITLE + '</div><ul class="tr-list">';
        const row = (l, s, c) => (h += '<li class="' + (c || '') + '"><span>' + l + '</span><em>' + s + '</em></li>');
        row('אפייה', st.step === 'bake' ? 'שיא: ' + (st.best || 0) + '/' + NEED : '✓', st.step === 'bake' ? '' : 'ok');
        if (st.step !== 'bake') row('קופסת המצות', st.step === 'load' ? 'במטבח' : '✓ בטנק', st.step === 'load' ? '' : 'ok');
        if (st.recips.length && st.step !== 'bake' && st.step !== 'load') for (const id of st.recips) row(N(id) ? N(id).def.name : id, st.delivered[id] ? '✓ קיבל' : 'מחכה', st.delivered[id] ? 'ok' : '');
        return h + '</ul><div class="tr-obj">' + HINT() + '</div>';
      },
      update() {
        box.visible = active() && q().step === 'load';
        if (!(active() && (q().step === 'sedertime'))) {
          if (seder.visible && q().status !== 'complete') seder.visible = false;
        }
      },
    };
  };

  // מחבר משימה נוספת (פסח) למנהל המשימות של העיר
  G.combineMissions = function (base, ps) {
    const pick = (a, b) => (a !== null && a !== undefined ? a : b);
    const over = {
      activeQuest: () => ps.activeQuest() || base.activeQuest(),
      callOffer: () => (base.activeQuest() || ps.activeQuest() ? null : pick(base.callOffer && base.callOffer(), ps.callOffer())),
      mosheDialog: () => (base.activeQuest() ? base.mosheDialog() : pick(ps.mosheDialog(), base.mosheDialog())),
      mosheIcon: () => (base.activeQuest() ? base.mosheIcon() : pick(ps.mosheIcon(), base.mosheIcon())),
      npcDialog: (n) => pick(ps.npcDialog(n), base.npcDialog(n)),
      iconFor: (n) => pick(ps.iconFor(n), base.iconFor(n)),
      interactables: () => base.interactables().concat(ps.interactables()),
      navTarget: () => (ps.activeQuest() ? ps.navTarget() : base.navTarget()),
      mapDots: (dot) => {
        base.mapDots(dot);
        ps.mapDots(dot);
      },
      trackerHTML: () => (ps.activeQuest() ? ps.trackerHTML() : base.trackerHTML()),
      update: (dt) => {
        base.update(dt);
        ps.update(dt);
      },
      timeRate: () => (ps.activeQuest() ? 1 : base.timeRate()),
      onGain: (k, n) => {
        if (!ps.activeQuest()) base.onGain(k, n);
      },
    };
    return new Proxy(base, { get: (t, k) => (k in over ? over[k] : t[k]) });
  };
})();
