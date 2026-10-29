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
      dstRoot.updateMatrixWorld(true);
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
  function addHat(root, head, body, hair) {
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
    const cx = (ring.min.x + ring.max.x) / 2, cz = (ring.min.z + ring.max.z) / 2;
    const rB = (ring.max.x - ring.min.x) / 2 + 0.006, zS = ((ring.max.z - ring.min.z) / 2 + 0.006) / rB, rT = rB * 0.88, CH = 0.125;
    const felt = new T.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.82 }), band = new T.MeshStandardMaterial({ color: 0x050505, roughness: 0.35 });
    const hat = new T.Group();
    const crown = new T.CylinderGeometry(rT, rB, CH, 40, 8);
    const pos = crown.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > CH / 2 - 0.0001) {
        const u = Math.min(1, Math.abs(x) / rT);
        pos.setY(i, y - 0.024 * (1 - u * u) * (1 - Math.max(0, -z / rT) * 0.5));
      } else if (y > 0) {
        const kk = y / (CH / 2), front = Math.max(0, z / rB);
        pos.setX(i, x * (1 - front * front * kk * kk * kk * 0.09));
      }
    }
    crown.computeVertexNormals();
    const cm = new T.Mesh(crown, felt);
    cm.scale.z = zS;
    cm.position.y = CH / 2;
    const prof = [[rB - 0.003, 0.003], [rB + 0.02, 0], [rB + 0.05, 0.002], [rB + 0.064, 0.008], [rB + 0.07, 0.015], [rB + 0.071, 0.019]].map(([a, b]) => new T.Vector2(a, b));
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

  // ציציות: שתי פינות בכל צד, 8 חוטים לכל פינה, מתחת לשולי הז׳קט
  function addTzitzit(root, pelvis, body) {
    const bb = new T.Box3().setFromObject(body), H = bb.max.y - bb.min.y, hipY = bb.min.y + H * 0.5, len = H * 0.24;
    const mat = new T.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 0.9 });
    const geo = new T.CylinderGeometry(0.0035, 0.003, len, 4);
    geo.translate(0, -len / 2, 0);
    const knotGeo = new T.CylinderGeometry(0.012, 0.012, 0.05, 6);
    for (const sx of [-1, 1])
      for (const dz of [0.06, -0.07]) {
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
        attachAt(pelvis, tassel, new T.Vector3(sx * 0.205, hipY, dz), root);
      }
  }

  // טעינה: מזריקים את קובץ הנתונים (עובד גם מ-file://) ובונים את הדמות
  G.loadRealChar = function (ver, onReady, onFail) {
    const build = async () => {
      const [mh, an] = await Promise.all([parse(b64(window.SHALIACH_GLB)), parse(b64(window.SHALIACH_ANIMS))]);
      window.SHALIACH_GLB = window.SHALIACH_ANIMS = null;
      const root = mh.scene;
      let body = null, hair = null, head = null, pelvis = null;
      const bones = [];
      root.traverse((o) => {
        if (o.isBone) {
          bones.push(o);
          if (o.name === 'head') head = o;
          if (o.name === 'pelvis') pelvis = o;
        }
        if (!o.isMesh) return;
        o.castShadow = true;
        o.frustumCulled = false;
        if (/short0/i.test(o.name)) hair = o;
        if (/body|base/i.test(o.name) && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m.map) m.map.encoding = T.LinearEncoding;
          // הייצוא סימן הכל כשקוף — רק שיער, זקן, גבות וריסים צריכים חיתוך שקיפות
          const cut = /beard|moustache|eyebrow|eyelash|short0/i.test(m.name);
          m.transparent = false;
          m.depthWrite = true;
          m.alphaTest = cut ? (/beard|moustache/i.test(m.name) ? 0.22 : 0.5) : 0;
          m.side = cut ? T.DoubleSide : T.FrontSide;
          if (/beard|moustache|short0|eyebrow/i.test(m.name)) m.color.set(0x5a4030);
          if (/shoes/i.test(m.name)) m.color.set(0x222222);
          m.needsUpdate = true;
        });
      });
      // מקור האנימציה: השלד מקובץ האנימציות (לא מוצג)
      const srcRoot = an.scene;
      const retarget = makeRetarget(srcRoot, root, bones);
      addHat(root, head, body, hair);
      addTzitzit(root, pelvis, body);

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
      const hip = { sit: hipIn('Sitting_Idle_Loop'), drive: hipIn('Driving_Loop'), stand: pelvis.getWorldPosition(new T.Vector3()).y };

      const group = new T.Group();
      const SCALE = 1.08;
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
      play('Idle_Loop');
      const rc = {
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
        },
      };
      onReady(rc);
    };
    const go = () => build().catch((e) => {
      console.error('realchar', e);
      if (onFail) onFail(e);
    });
    if (window.SHALIACH_GLB) return go();
    const s = document.createElement('script');
    s.src = 'data/shaliach.js?v=' + ver;
    s.onload = go;
    s.onerror = () => onFail && onFail(new Error('data/shaliach.js'));
    document.head.appendChild(s);
  };
})();
