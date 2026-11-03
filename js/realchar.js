// דמות השליח המציאותית: מודל MakeHuman (CC0) עם אנימציות Quaternius (CC0)
// הקבצים ארוזים ב-data/shaliach.js ונטענים רק כשהאפשרות פעילה. הכובע החב״די והציציות נבנים כאן.
(function () {
  'use strict';
  const G = window.G, T = THREE;

  const b64 = (s) => {
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  };
  const parse = (buf) => new Promise((res, rej) => new T.GLTFLoader().parse(buf, '', res, rej));

  // העברת אנימציה בין שלדים בעלי שמות עצמות זהים אך תנוחת מנוחה שונה:
  // קודם מיישרים כל איבר של היעד לכיוון האיבר המקביל במקור, ואז מעבירים את השינוי בסיבוב (יחסית לשורש)
  function makeRetarget(srcRoot, dstRoot, bones) {
    srcRoot.updateMatrixWorld(true);
    dstRoot.updateMatrixWorld(true);
    const src = {};
    srcRoot.traverse((o) => (src[o.name.toLowerCase()] = o));
    const wp = (o) => o.getWorldPosition(new T.Vector3());
    for (const d of bones) {
      const s = src[d.name.toLowerCase()];
      // רק גפיים (תנוחת A שונה בין השלדים); עמוד השדרה, הצוואר והראש נשארים ביציבה הטבעית של הדמות
      if (!s || /^(root|pelvis|spine_0\d|neck_01|head)$/i.test(d.name)) continue;
      const dc =d.children.find((c) => c.isBone && src[c.name.toLowerCase()]);
      if (!dc) continue;
      const sDir = wp(src[dc.name.toLowerCase()]).sub(wp(s)).normalize(), dDir = wp(dc).sub(wp(d)).normalize();
      const w = d.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromUnitVectors(dDir, sDir));
      d.quaternion.copy(d.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(w));
      d.updateMatrixWorld(true);
    }
    const pairs = [];
    for (const d of bones) {
      const s = src[d.name.toLowerCase()];
      if (!s || /^root$/i.test(d.name)) continue;
      pairs.push({ s, d, sRest: s.getWorldQuaternion(new T.Quaternion()), dRest: d.getWorldQuaternion(new T.Quaternion()) });
    }
    const sp = src.pelvis, dp = bones.find((b) => b.name === 'pelvis');
    const sPos0 = wp(sp), dPos0 = wp(dp), k = dPos0.y / Math.max(0.01, sPos0.y);
    const a = new T.Quaternion(), b = new T.Quaternion(), rootQ = new T.Quaternion(), v = new T.Vector3();
    return function () {
      srcRoot.updateMatrixWorld(true);
      // מעדכן גם את ההורים: כל החישוב על מיקום עדכני, גם כשהדמות זזה או מסתובבת
      dstRoot.updateWorldMatrix(true, true);
      dstRoot.getWorldQuaternion(rootQ);
      // אגן: גם תזוזה (ישיבה, קפיצה) — מוקטנת לפי יחס הגבהים
      v.copy(wp(sp)).sub(sPos0).multiplyScalar(k).add(dPos0);
      dstRoot.localToWorld(v);
      dp.position.copy(dp.parent.worldToLocal(v));
      for (const p of pairs) {
        p.s.getWorldQuaternion(a).multiply(b.copy(p.sRest).invert()).multiply(p.dRest).premultiply(rootQ);
        p.d.parent.getWorldQuaternion(b).invert();
        p.d.quaternion.copy(b.multiply(a));
        p.d.updateMatrixWorld(true);
      }
    };
  }

  // נקודות הרשת אחרי עיוות השלד (כדי למדוד את הראש במצבו האמיתי)
  function skinnedPoints(mesh, minBindY) {
    mesh.skeleton.update();
    const pos = mesh.geometry.attributes.position, v = new T.Vector3(), out = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.y < minBindY) continue;
      mesh.boneTransform(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      out.push(v.clone());
    }
    return out;
  }
  function attachAt(bone, obj, worldPos, root) {
    obj.position.copy(worldPos);
    root.add(obj);
    obj.updateMatrixWorld(true);
    bone.attach(obj);
  }

  // כובע חב״די: לבד שחור, כתר עם שקע לאורך וצביטות מעוגלות, שוליים רחבים וסרט — לפי מידות הראש
  function headRing(body, hair) {
    if (!body.geometry.boundingBox) body.geometry.computeBoundingBox();
    const pts = skinnedPoints(body, body.geometry.boundingBox.max.y - 0.17);
    if (hair) {
      if (!hair.geometry.boundingBox) hair.geometry.computeBoundingBox();
      pts.push(...skinnedPoints(hair, -1e9));
    }
    let top = -1e9;
    for (const p of pts) if (p.y > top) top = p.y;
    const ring = new T.Box3();
    for (const p of pts) if (p.y > top - 0.085 && p.y < top - 0.055) ring.expandByPoint(p);
    return { top, ring, cx: (ring.min.x + ring.max.x) / 2, cz: (ring.min.z + ring.max.z) / 2 };
  }
  // כובע: chabad — כתר גבוה עם שקע וצביטות, שוליים רחבים; homburg — כתר נמוך ומעוגל, שוליים צרים ומקופלים (חרדי אחר)
  function addHat(root, head, body, hair, style) {
    const { top, ring, cx, cz } = headRing(body, hair);
    const hb = style === 'homburg';
    const rB = (ring.max.x - ring.min.x) / 2 + 0.006, zS = ((ring.max.z - ring.min.z) / 2 + 0.006) / rB, rT = rB * (hb ? 0.95 : 0.88), CH = hb ? 0.105 : 0.125;
    const DENT = hb ? 0.012 : 0.024, PINCH = hb ? 0 : 0.09, BR = hb ? 0.048 : 0.071;
    const felt = new T.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.82 }), band = new T.MeshStandardMaterial({ color: 0x050505, roughness: 0.35 });
    const hat = new T.Group();
    const crown = new T.CylinderGeometry(rT, rB, CH, 40, 8);
    const pos = crown.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > CH / 2 - 0.0001) {
        const u = Math.min(1, Math.abs(x) / rT);
        pos.setY(i, y - DENT * (1 - u * u) * (1 - Math.max(0, -z / rT) * 0.5));
      } else if (y > 0) {
        const kk = y / (CH / 2), front = Math.max(0, z / rB);
        pos.setX(i, x * (1 - front * front * kk * kk * kk * PINCH));
      }
    }
    crown.computeVertexNormals();
    const cm = new T.Mesh(crown, felt);
    cm.scale.z = zS;
    cm.position.y = CH / 2;
    const prof = (hb ? [[rB - 0.003, 0.003], [rB + 0.015, 0], [rB + 0.032, 0.006], [rB + 0.044, 0.018], [rB + BR, 0.03]] : [[rB - 0.003, 0.003], [rB + 0.02, 0], [rB + 0.05, 0.002], [rB + 0.064, 0.008], [rB + 0.07, 0.015], [rB + BR, 0.019]]).map(([a, b]) => new T.Vector2(a, b));
    const bm = felt.clone();
    bm.side = T.DoubleSide;
    const brim = new T.Mesh(new T.LatheGeometry(prof, 48), bm);
    brim.scale.z = zS * 0.97;
    const rib = new T.Mesh(new T.CylinderGeometry(rB + 0.0012, rB + 0.0016, 0.03, 40, 1, true), band);
    rib.scale.z = zS;
    rib.position.y = 0.017;
    hat.add(cm, brim, rib);
    hat.traverse((o) => o.isMesh && (o.castShadow = true));
    hat.rotation.x = 0.035;
    attachAt(head, hat, new T.Vector3(cx, top - 0.072, cz), root);
  }

  // כיפה סרוגה: כיפת כדור שטוחה על החלק האחורי-עליון של הראש, עם פס בהיר בשוליים
  // מטפחת (טיכל): מכסה את כל השיער, קשורה מאחור בעורף, האוזניים והצוואר גלויים
  function addTichel(root, head, body, hair, color) {
    const { top, ring, cx, cz } = headRing(body, hair);
    const R = (ring.max.x - ring.min.x) / 2 + 0.014, cloth = new T.MeshStandardMaterial({ color, roughness: 0.92, side: T.DoubleSide });
    const g = new T.Group();
    const shell = new T.Mesh(new T.SphereGeometry(R, 28, 16, 0, Math.PI * 2, 0, 1.85), cloth);
    shell.scale.set(1, 1.02, 1.14);
    shell.rotation.x = -0.62;
    g.add(shell);
    const knot = new T.Mesh(new T.SphereGeometry(0.026, 12, 8), cloth);
    knot.position.set(0, -0.085, -R * 1.12);
    g.add(knot);
    for (const s of [-1, 1]) {
      const tail = new T.Mesh(new T.BoxGeometry(0.035, 0.13, 0.006), cloth);
      tail.position.set(s * 0.014, -0.15, -R * 1.14);
      tail.rotation.z = s * 0.14;
      g.add(tail);
    }
    g.traverse((o) => o.isMesh && (o.castShadow = true));
    attachAt(head, g, new T.Vector3(cx, top - R + 0.012, cz - 0.012), root);
  }

  function addKippah(root, head, body, hair, color, plain, size, dy) {
    const { top, cx, cz } = headRing(body, hair);
    const k = new T.Group();
    if (size) k.scale.setScalar(size);
    const cap = new T.Mesh(new T.SphereGeometry(0.068, 20, 6, 0, Math.PI * 2, 0, 0.62), new T.MeshStandardMaterial({ color, roughness: 0.95 }));
    cap.scale.y = 0.55;
    k.add(cap);
    if (!plain) {
      const rim = new T.Mesh(new T.TorusGeometry(0.039, 0.0045, 4, 24), new T.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.95 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.022;
      k.add(rim);
    }
    k.rotation.x = -0.35;
    attachAt(head, k, new T.Vector3(cx, top - 0.032 + (dy || 0), cz - 0.035), root);
  }

  // משקפיים: מסגרת מתכת דקה, לפי מיקום הפנים הנמדד בגובה העיניים
  function addGlasses(root, head, body, hair) {
    const { top, cx } = headRing(body, hair);
    const eyeY = top - 0.125;
    const pts = skinnedPoints(body, body.geometry.boundingBox.max.y - 0.17);
    let front = -1e9, wide = 0;
    for (const p of pts) {
      if (Math.abs(p.y - eyeY) > 0.012) continue;
      const dx = Math.abs(p.x - cx);
      if (dx > 0.022 && dx < 0.045 && p.z > front) front = p.z;
      if (dx > wide) wide = dx;
    }
    const metal = new T.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.35, metalness: 0.6 });
    const g = new T.Group(), R = 0.021, X = 0.032, TH = 0.0022;
    for (const s of [-1, 1]) {
      const lens = new T.Mesh(new T.TorusGeometry(R, TH, 6, 24), metal);
      lens.position.x = s * X;
      lens.scale.y = 0.82;
      g.add(lens);
      // זרוע עד האוזן
      const armL = 0.09;
      const arm = new T.Mesh(new T.BoxGeometry(TH * 1.4, TH * 1.4, armL), metal);
      arm.position.set(s * (wide + 0.002), 0.004, -armL / 2);
      g.add(arm);
      const hinge = new T.Mesh(new T.BoxGeometry(Math.max(0.004, wide - X - R + 0.002), TH * 1.4, TH * 1.4), metal);
      hinge.position.set(s * ((wide + X + R) / 2), 0.004, 0);
      g.add(hinge);
    }
    const bridge = new T.Mesh(new T.BoxGeometry(2 * (X - R), TH * 1.4, TH * 1.4), metal);
    bridge.position.y = 0.005;
    g.add(bridge);
    attachAt(head, g, new T.Vector3(cx, eyeY, front + 0.004), root);
  }

  // ציציות: שתי פינות בכל צד, 8 חוטים לכל פינה, מתחת לשולי הז׳קט.
  // המיקום נמדד מהבגד עצמו בגובה המותן — צמוד לצדדים גם בדמות רזה וגם בדמות מלאה
  function addTzitzit(root, pelvis, body, cloth) {
    const bb = new T.Box3().setFromObject(body), H = bb.max.y - bb.min.y, hipY = bb.min.y + H * 0.5, len = H * 0.24;
    const src = cloth || body;
    const band = new T.Box3();
    // רק נקודות של הגוף והירכיים (לפי עצם השליטה) — בלי השרוולים שתלויים ליד המותן
    src.skeleton.update();
    const pos = src.geometry.attributes.position, si = src.geometry.attributes.skinIndex, sw = src.geometry.attributes.skinWeight, bones = src.skeleton.bones, v = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      let bi = si.getX(i), bw = sw.getX(i);
      if (sw.getY(i) > bw) { bi = si.getY(i); bw = sw.getY(i); }
      if (sw.getZ(i) > bw) { bi = si.getZ(i); bw = sw.getZ(i); }
      if (sw.getW(i) > bw) bi = si.getW(i);
      if (!/^(pelvis|spine_0[12]|thigh_)/.test(bones[bi].name)) continue;
      v.fromBufferAttribute(pos, i);
      src.boneTransform(i, v);
      v.applyMatrix4(src.matrixWorld);
      if (v.y > hipY - 0.06 && v.y < hipY + 0.04) band.expandByPoint(v);
    }
    const cx = (band.min.x + band.max.x) / 2, cz = (band.min.z + band.max.z) / 2;
    const hx = (band.max.x - band.min.x) / 2 + 0.003, dz = (band.max.z - band.min.z) * 0.22;
    const mat = new T.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 0.9 });
    const geo = new T.CylinderGeometry(0.0035, 0.003, len, 4);
    geo.translate(0, -len / 2, 0);
    const knotGeo = new T.CylinderGeometry(0.012, 0.012, 0.05, 6);
    for (const sx of [-1, 1])
      for (const fz of [1, -1]) {
        const tassel = new T.Group();
        for (let k = 0; k < 8; k++) {
          const s = new T.Mesh(geo, mat);
          s.position.set((k % 4 - 1.5) * 0.007, 0, (k < 4 ? -1 : 1) * 0.004);
          s.rotation.z = (k % 4 - 1.5) * 0.03;
          s.rotation.x = (k < 4 ? -1 : 1) * 0.02;
          s.scale.y = 0.85 + ((k * 37) % 10) / 60;
          tassel.add(s);
        }
        const knot = new T.Mesh(knotGeo, mat);
        knot.position.y = -0.02;
        tassel.add(knot);
        attachAt(pelvis, tassel, new T.Vector3(cx + sx * hx, hipY, cz + fz * dz), root);
      }
  }

  // מדידת הגוף בלי השרוולים: נקודות הבגד ששייכות לעצמות הגוף והירכיים בטווח גובה
  function bandOf(src, y0, y1, re) {
    src.skeleton.update();
    const pos = src.geometry.attributes.position, si = src.geometry.attributes.skinIndex, sw = src.geometry.attributes.skinWeight, bones = src.skeleton.bones, v = new T.Vector3(), band = new T.Box3();
    for (let i = 0; i < pos.count; i++) {
      let bi = si.getX(i), bw = sw.getX(i);
      if (sw.getY(i) > bw) { bi = si.getY(i); bw = sw.getY(i); }
      if (sw.getZ(i) > bw) { bi = si.getZ(i); bw = sw.getZ(i); }
      if (sw.getW(i) > bw) bi = si.getW(i);
      if (!re.test(bones[bi].name)) continue;
      v.fromBufferAttribute(pos, i);
      src.boneTransform(i, v);
      v.applyMatrix4(src.matrixWorld);
      if (v.y > y0 && v.y < y1) band.expandByPoint(v);
    }
    return band;
  }
  const accMat = (color, rough) => new T.MeshStandardMaterial({ color, roughness: rough === undefined ? 0.8 : rough });
  // אביזרים מההגדרה המקורית של הדמות — כדי שכל דמות תישאר מי שהיא
  function addBackpack(root, bone, src, H, y0, color) {
    const yc = y0 + H * 0.72, b = bandOf(src, yc - 0.1, yc + 0.1, /^spine_0/);
    const bag = new T.Mesh(new T.BoxGeometry(0.32, 0.44, 0.16), accMat(color));
    bag.castShadow = true;
    attachAt(bone, bag, new T.Vector3((b.min.x + b.max.x) / 2, yc, b.min.z - 0.075), root);
  }
  function addApron(root, bone, src, H, y0, color) {
    const yc = y0 + H * 0.52, b = bandOf(src, yc - 0.06, yc + 0.06, /^(pelvis|spine_0|thigh_)/);
    const ap = new T.Mesh(new T.BoxGeometry((b.max.x - b.min.x) * 0.9, H * 0.34, 0.012), accMat(color, 0.9));
    ap.castShadow = true;
    attachAt(bone, ap, new T.Vector3((b.min.x + b.max.x) / 2, yc + H * 0.02, b.max.z + 0.012), root);
  }
  function addCap(root, head, body, hair, color) {
    const { top, ring, cx, cz } = headRing(body, hair), r = (ring.max.x - ring.min.x) / 2 + 0.008;
    const cap = new T.Group();
    const dome = new T.Mesh(new T.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), accMat(color));
    dome.scale.y = 0.92;
    dome.scale.z = (ring.max.z - ring.min.z) / 2 / r + 0.03;
    const visor = new T.Mesh(new T.BoxGeometry(r * 1.6, 0.012, 0.09), accMat(color));
    visor.position.set(0, 0.002, (ring.max.z - ring.min.z) / 2 + 0.04);
    visor.rotation.x = 0.12;
    cap.add(dome, visor);
    cap.traverse((o) => o.isMesh && (o.castShadow = true));
    attachAt(head, cap, new T.Vector3(cx, top - r * 0.86, cz), root);
  }
  function addHeadphones(root, head, body, hair) {
    const { top, ring, cx, cz } = headRing(body, hair), r = (ring.max.x - ring.min.x) / 2 + 0.018;
    const hp = new T.Group();
    const arc = new T.Mesh(new T.TorusGeometry(r, 0.008, 6, 24, Math.PI), accMat(0x222222));
    hp.add(arc);
    for (const s of [-1, 1]) {
      const cup = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.035, 12), accMat(0xe74c3c, 0.5));
      cup.rotation.z = Math.PI / 2;
      cup.position.x = s * r;
      hp.add(cup);
    }
    attachAt(head, hp, new T.Vector3(cx, top - r - 0.004, cz), root);
  }

  // ---------- טעינת קבצי נתונים (תגית script — עובד גם מ-file://) ----------
  const scripts = {};
  const loadScript = (src) =>
    scripts[src] ||
    (scripts[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      // כשל רשת לא נשמר — הניסיון הבא טוען מחדש
      s.onerror = () => {
        delete scripts[src];
        s.remove();
        rej(new Error(src));
      };
      document.head.appendChild(s);
    }));
  // האנימציות משותפות לכל הדמויות: מפענחים פעם אחת, ולכל דמות שלד-מקור משלה (שכפול)
  let animsP = null;
  const anims = (ver) =>
    animsP ||
    (animsP = loadScript('data/shaliach.js?v=' + ver).then(() => {
      const p = parse(b64(window.SHALIACH_ANIMS));
      window.SHALIACH_ANIMS = null;
      return p;
    }, (e) => {
      animsP = null;
      throw e;
    }));

  const HAIR = /short0|bob0|ponytail|long0/i;
  // בונה דמות מקובץ GLB: opts = { hat: 'chabad'|'homburg'|null, tzitzit, kippah: צבע, hair: צבע, beard: צבע }
  async function buildChar(buf, an, opts) {
    const mh = await parse(buf);
    const root = mh.scene;
    let body = null, hair = null, head = null, pelvis = null;
    const bones = [], byName = {};
    root.traverse((o) => {
      if (o.isBone) {
        bones.push(o);
        byName[o.name] = o;
        if (o.name === 'head') head = o;
        if (o.name === 'pelvis') pelvis = o;
      }
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      if (HAIR.test(o.name)) hair = o;
      if (opts.noBeard && /beard|moustache/i.test(o.name)) o.visible = false;
      if (/body|base/i.test(o.name) && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.map) m.map.encoding = T.LinearEncoding;
        // הייצוא סימן הכל כשקוף — רק שיער, זקן, גבות וריסים צריכים חיתוך שקיפות
        const cut = /beard|moustache|eyebrow|eyelash/i.test(m.name) || HAIR.test(m.name);
        m.transparent = false;
        m.depthWrite = true;
        m.alphaTest = cut ? (/beard|moustache/i.test(m.name) ? 0.22 : 0.5) : 0;
        m.side = cut ? T.DoubleSide : T.FrontSide;
        if (/beard|moustache/i.test(m.name)) m.color.set(opts.beard !== undefined ? opts.beard : 0x5a4030);
        else if (HAIR.test(m.name) || /eyebrow/i.test(m.name)) m.color.set(opts.hair !== undefined ? opts.hair : 0x5a4030);
        // שיער וזקן לבנים: הטקסטורה כהה וכפל צבע לא מבהיר אותה — לוקחים ממנה רק שקיפות ומעט פרטים
        if (cut && m.map && m.color.r + m.color.g + m.color.b > 2.4) {
          m.onBeforeCompile = (sh) => {
            sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = diffuse * (0.72 + 0.28 * clamp(dot(diffuseColor.rgb / max(diffuse, vec3(0.01)), vec3(1.0)) * 1.5, 0.0, 1.0));');
          };
          m.customProgramCacheKey = () => 'whiteHair';
        }
        if (/shoes/i.test(m.name)) {
          m.color.set(opts.shoes !== undefined ? opts.shoes : 0x222222);
          if (opts.shoes !== undefined) m.map = null; // נעל בהירה: הטקסטורה הכהה הייתה מכהה אותה
        }
        // בגדים בצבע אחיד: אפשר לצבוע מחדש לכל דמות
        if (/_top$/.test(m.name) && opts.top !== undefined) m.color.set(opts.top);
        if (/_bottom$/.test(m.name) && opts.bottom !== undefined) m.color.set(opts.bottom);
        // גוון עור מההגדרה המקורית (בהיר = בלי שינוי)
        if (opts.skin !== undefined && o === body) m.color.set(opts.skin);
        m.needsUpdate = true;
      });
    });
    // מקור האנימציה: שכפול של השלד מקובץ האנימציות (לא מוצג)
    const srcRoot = an.scene.clone();
    const retarget = makeRetarget(srcRoot, root, bones);
    if (opts.hat) addHat(root, head, body, hair, opts.hat);
    if (opts.kippah !== undefined) addKippah(root, head, body, hair, opts.kippah, opts.kippahPlain, opts.kippahSize, opts.kippahY);
    if (opts.tichel !== undefined) addTichel(root, head, body, hair, opts.tichel);
    if (opts.glasses) addGlasses(root, head, body, hair);
    let cloth = null;
    root.traverse((o) => { if (o.isSkinnedMesh && /suit/i.test(o.name)) cloth = o; });
    if (opts.tzitzit) addTzitzit(root, pelvis, body, cloth);
    // גוון לחליפה כהה: כפל צבע לא משפיע על טקסטורה שחורה, לכן מוסיפים אור עצמי עדין
    if (opts.suitGlow !== undefined && cloth) cloth.material.emissive = new T.Color(opts.suitGlow);
    const bb0 = new T.Box3().setFromObject(body), H0 = bb0.max.y - bb0.min.y;
    // בדגם הוסרה העניבה ונשאר פתח בחזה: הצד הפנימי של הבגד נצבע לבן, וכך רואים דרך הפתח חולצה
    if (opts.shirtFront && cloth) {
      const cm = cloth.material;
      cm.side = T.DoubleSide;
      cm.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.9);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n if (!gl_FrontFacing) totalEmissiveRadiance += vec3(0.4);');
      };
      cm.customProgramCacheKey = () => 'shirtInside';
      cm.needsUpdate = true;
    }
    if (opts.backpack !== undefined) addBackpack(root, byName.spine_03, cloth || body, H0, bb0.min.y, opts.backpack);
    if (opts.apron !== undefined) addApron(root, pelvis, cloth || body, H0, bb0.min.y, opts.apron);
    if (opts.cap !== undefined) addCap(root, head, body, hair, opts.cap);
    if (opts.headphones) addHeadphones(root, head, body, hair);
    if (opts.phone) {
      const ph = new T.Mesh(new T.BoxGeometry(0.075, 0.15, 0.012), accMat(0x111111, 0.3));
      attachAt(byName.hand_r, ph, byName.hand_r.getWorldPosition(new T.Vector3()), root);
      ph.position.y += 0.06;
    }

    const mixer = new T.AnimationMixer(srcRoot);
    const acts = {};
    for (const c of an.animations) acts[c.name.replace(/_Armature$/, '')] = mixer.clipAction(c);
    // גובה האגן בישיבה ובנהיגה (כדי למקם על ספסל, קטנוע ואופניים)
    const hipIn = (name) => {
      const a = acts[name];
      if (!a) return 0.5;
      a.reset().play();
      mixer.update(0);
      retarget();
      root.updateMatrixWorld(true);
      const y = pelvis.getWorldPosition(new T.Vector3()).y;
      a.stop();
      return y;
    };
    const hip = { sit: hipIn('Sitting_Idle_Loop'), drive: hipIn('Driving_Loop') };

    const group = new T.Group();
    const SCALE = opts.scale || 1.08;
    root.scale.setScalar(SCALE);
    group.add(root);
    let cur = null, curName = '';
    function play(name, ts) {
      const a = acts[name] || acts.Idle_Loop;
      a.timeScale = ts || 1;
      if (curName === name) return;
      a.reset().setEffectiveWeight(1).fadeIn(0.18).play();
      if (cur) cur.fadeOut(0.18);
      cur = a;
      curName = name;
    }
    // סיבוב עצם סביב ציר בעולם, ואימות איבר לכיוון נקודה — לתנועות שאין בקליפים (טלפון, ראש בקצב)
    const qa = new T.Quaternion(), qb = new T.Quaternion(), va = new T.Vector3(), vb = new T.Vector3(), vc = new T.Vector3();
    function turn(bone, q) {
      bone.getWorldQuaternion(qa).premultiply(q);
      bone.parent.getWorldQuaternion(qb).invert();
      bone.quaternion.copy(qb.multiply(qa));
      bone.updateMatrixWorld(true);
    }
    function aim(bone, kid, target) {
      bone.getWorldPosition(va);
      kid.getWorldPosition(vb);
      vb.sub(va).normalize();
      vc.copy(target).sub(va).normalize();
      turn(bone, new T.Quaternion().setFromUnitVectors(vb, vc));
    }
    play('Idle_Loop');
    // כל דמות מתחילה בנקודה אחרת באנימציה — לא כולם זזים יחד
    mixer.update(Math.random() * 3);
    return {
      group,
      hipSit: hip.sit * SCALE,
      hipDrive: hip.drive * SCALE,
      // st: { moving, spd, jy, sit, ride, talk }
      update(dt, st) {
        if (st.ride) play('Driving_Loop');
        else if (st.sit) play('Sitting_Idle_Loop');
        else if (st.jy > 0.05) play('Jump_Loop');
        else if (st.moving) {
          const s = st.spd || 6;
          if (s > 8) play('Sprint_Loop', G.clamp(s / 8.5, 0.8, 1.4));
          else if (s > 3.5) play('Jog_Fwd_Loop', G.clamp(s / 4.6, 0.8, 1.5));
          else play('Walk_Loop', G.clamp(s / 1.6, 0.6, 1.6));
        } else play(st.talk ? 'Idle_Talking_Loop' : 'Idle_Loop');
        mixer.update(dt);
        retarget();
        if (st.bop) {
          group.getWorldDirection(vc);
          turn(head, new T.Quaternion().setFromAxisAngle(vc, Math.sin(st.t * 7) * 0.14));
        }
        if (st.phoneUp) {
          // יד לאוזן: מרפק למטה והחוצה, אמה אל הצד של הראש
          const fwd = group.getWorldDirection(new T.Vector3()), side = new T.Vector3(0, 1, 0).cross(fwd).normalize();
          const sh = byName.upperarm_r.getWorldPosition(new T.Vector3()), ear = head.getWorldPosition(new T.Vector3()).addScaledVector(side, -0.11).addScaledVector(fwd, 0.03);
          aim(byName.upperarm_r, byName.lowerarm_r, sh.clone().addScaledVector(side, -0.14).addScaledVector(fwd, 0.1).add(new T.Vector3(0, -0.3, 0)));
          aim(byName.lowerarm_r, byName.hand_r, ear);
        }
      },
    };
  }

  // השליח (השחקן)
  G.loadRealChar = function (ver, onReady, onFail) {
    anims(ver)
      .then((an) => {
        const buf = b64(window.SHALIACH_GLB);
        window.SHALIACH_GLB = null;
        return buildChar(buf, an, { hat: 'chabad', tzitzit: true, shirtFront: true });
      })
      .then(onReady)
      .catch((e) => {
        console.error('realchar', e);
        if (onFail) onFail(e);
      });
  };
  // דמות ברחוב: key = moshe | haredi | suit | worker | dati | striped | secular1 | secular2 (קובץ data/npc_<key>.js)
  G.loadNPCChar = function (ver, key, opts, onReady, onFail) {
    Promise.all([anims(ver), loadScript('data/npc_' + key + '.js?v=' + ver)])
      .then(([an]) => buildChar(b64(window.NPC_GLB[key]), an, opts))
      .then(onReady)
      .catch((e) => {
        console.error('npcchar', key, e);
        if (onFail) onFail(e);
      });
  };
})();