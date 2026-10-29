// השליחים: אין פה רגע דל — לוגיקת המשחק הראשית
(function () {
  'use strict';
  const G = window.G, T = THREE, A = G.Audio;
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = 'shluchim-demo-v1';
  const SQ = Math.SQRT1_2;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  document.body.classList.toggle('touch', isTouch);
  const ACT = isTouch ? 'כפתור הפעולה' : 'E';

  // ================= רנדרר וסצנה =================
  const canvas = $('game');
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  // כרטיס המסך איבד את ההקשר (בדרך כלל חוסר זיכרון) — מודיעים במקום מסך שחור
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    window.dispatchEvent(new ErrorEvent('error', { message: 'WebGL context lost (graphics memory) - reload the page (F5)' }));
  });
  renderer.setPixelRatio(1);
  if (G.SMOOTH) document.body.classList.add('smooth');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color(0x8ecae6);
  scene.fog = new T.Fog(0x8ecae6, 125, 270);
  // שתי מצלמות: איזומטרית (מבט על) וגוף שלישי (מאחורי הדמות, כמו GTA)
  const camO = new T.OrthographicCamera(-10, 10, 10, -10, 30, 280);
  const camP = new T.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.15, 420);
  let camera = camO;
  const tp = { yaw: 0, pitch: 0.22, vanOff: 0, lookT: 0, dist: 4.4 };
  const CAM_OFF = new T.Vector3(70, 70, 70);
  const CAM_DIR = CAM_OFF.clone().normalize();
  const camTarget = new T.Vector3(-12, 0, -4);
  let viewH = 30;

  const hemi = new T.HemisphereLight(0xe8f2ff, 0x6b5a3a, 0.65);
  const sun = new T.DirectionalLight(0xffffff, 0.85);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 });
  sun.shadow.bias = -0.0015;
  scene.add(hemi, sun, sun.target);

  // העיר האמיתית (הוד השרון מ-OpenStreetMap) אם הנתונים נטענו; אחרת העיר הישנה
  const W = window.CITY_DATA ? G.buildCity(scene, window.CITY_DATA) : G.buildWorld(scene);
  const SPOT = W.spots || {};

  // ================= עיבוד תמונה: קווי מתאר, גלואו, תיקון צבע וּויניֶט =================
  const post = (function () {
    const ok = renderer.capabilities.isWebGL2 || renderer.extensions.has('WEBGL_depth_texture');
    if (!ok) return null;
    const depthTex = new T.DepthTexture(1, 1);
    depthTex.type = T.UnsignedIntType;
    const flt = G.SMOOTH ? T.LinearFilter : T.NearestFilter;
    const rt = new T.WebGLRenderTarget(1, 1, { minFilter: flt, magFilter: flt, depthTexture: depthTex, depthBuffer: true });
    const mat = new T.ShaderMaterial({
      uniforms: {
        tColor: { value: rt.texture }, tDepth: { value: depthTex }, res: { value: new T.Vector2(1, 1) },
        cnear: { value: 1 }, cfar: { value: 100 }, persp: { value: 0 }, night: { value: 0 }, uSmooth: { value: G.SMOOTH ? 1 : 0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float cnear; uniform float cfar; uniform float persp; uniform float night; uniform float uSmooth;
        varying vec2 vUv;
        float Z(vec2 uv){
          float d = texture2D(tDepth, uv).x;
          return persp > 0.5 ? (cnear * cfar) / (cfar - d * (cfar - cnear)) : cnear + d * (cfar - cnear);
        }
        void main(){
          vec2 px = 1.0 / res;
          vec3 c = texture2D(tColor, vUv).rgb;
          // מראה חלק, מבט מלמעלה: טשטוש ״מיניאטורה״ בחלק העליון והתחתון של המסך
          if (uSmooth > 0.5 && persp < 0.5) {
            float tb = smoothstep(0.2, 0.5, abs(vUv.y - 0.5)) * 3.5;
            if (tb > 0.05) {
              vec3 acc = c;
              for (int i = 0; i < 12; i++) {
                float a = float(i) * 2.399;
                acc += texture2D(tColor, vUv + vec2(cos(a), sin(a)) * sqrt(float(i + 1) / 12.0) * tb * px).rgb;
              }
              c = acc / 13.0;
            }
          }
          float zc = Z(vUv), zn = Z(vUv + vec2(0.0, px.y)), zs = Z(vUv - vec2(0.0, px.y)), ze = Z(vUv + vec2(px.x, 0.0)), zw = Z(vUv - vec2(px.x, 0.0));
          float edge;
          if (persp > 0.5) {
            // בפרספקטיבה 1/z לינארי על משטחים — קו מתאר רק בשפת עצם קרוב
            float wc = 1.0 / zc;
            float lw = (1.0 / zn + 1.0 / zs + 1.0 / ze + 1.0 / zw) - 4.0 * wc;
            edge = smoothstep(0.06, 0.22, -lw / wc) * (1.0 - smoothstep(60.0, 140.0, zc));
          } else {
            edge = smoothstep(0.25, 0.9, zn + zs + ze + zw - 4.0 * zc);
          }
          c *= 1.0 - mix(0.5, 0.22, uSmooth) * edge;
          vec3 b = vec3(0.0);
          for (int i = 0; i < 8; i++) {
            float a = float(i) * 0.7853981;
            vec3 s = texture2D(tColor, vUv + vec2(cos(a), sin(a)) * px * 2.5).rgb;
            b += max(s - vec3(0.72), vec3(0.0));
          }
          c += b * (0.05 + 0.16 * night);
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, 1.18);
          c = (c - 0.5) * 1.07 + 0.5;
          // מראה חלק: עקומת צבע קולנועית וחום של אחר הצהריים
          if (uSmooth > 0.5) {
            vec3 x = c * 1.08;
            c = mix(c, clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0), 0.65);
            c *= mix(vec3(1.03, 1.0, 0.96), vec3(1.0), night);
          }
          c *= mix(vec3(1.04, 1.0, 0.95), vec3(0.95, 0.98, 1.08), night);
          vec2 q = vUv - 0.5;
          c *= 1.0 - dot(q, q) * 0.6;
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    const pscene = new T.Scene();
    pscene.add(quad);
    const pcam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return {
      mat,
      setSize(w, h) {
        rt.setSize(w, h);
        mat.uniforms.res.value.set(w, h);
      },
      render() {
        mat.uniforms.cnear.value = camera.near;
        mat.uniforms.cfar.value = camera.far;
        mat.uniforms.persp.value = camera.isPerspectiveCamera ? 1 : 0;
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(pscene, pcam);
      },
    };
  })();
  function renderFrame() {
    if (post && S.settings.shadows) post.render();
    else renderer.render(scene, camera);
  }

  function updateCam() {
    const a = window.innerWidth / window.innerHeight;
    camO.left = (-viewH * a) / 2;
    camO.right = (viewH * a) / 2;
    camO.top = viewH / 2;
    camO.bottom = -viewH / 2;
    camO.updateProjectionMatrix();
    if (camP.aspect !== a) {
      camP.aspect = a;
      camP.updateProjectionMatrix();
    }
  }
  const isThird = () => S.settings.cam !== 'iso' && mode !== 'title';
  let lastPixMode = null;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    lastPixMode = isThird();
    // מראה חלק: רזולוציה מלאה (עד 1080 שורות); פיקסלים: תמונה קטנה שמוגדלת
    const pix = G.SMOOTH ? G.clamp(h / 1080, 1, 2) : G.clamp(h / (lastPixMode ? 620 : 440), 1, 3);
    const rw = Math.ceil(w / pix), rh = Math.ceil(h / pix);
    renderer.setSize(rw, rh, false);
    if (post) post.setSize(rw, rh);
    updateCam();
  }
  window.addEventListener('resize', resize);

  // ---------- שמיים ושמש (נראים במצלמת גוף שלישי) ----------
  const skyMat = new T.ShaderMaterial({
    uniforms: { top: { value: new T.Color(0x5fa8e0) }, horizon: { value: new T.Color(0xd8ecf8) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = max(vP.y, 0.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.55)), 1.0); }',
    side: T.BackSide, depthWrite: false, fog: false,
  });
  const sky = new T.Mesh(new T.SphereGeometry(380, 24, 12), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);
  const sunSprite = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex('255,244,214'), transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
  sunSprite.scale.set(70, 70, 1);
  sunSprite.renderOrder = -9;
  scene.add(sunSprite);

  // ================= מצב המשחק =================
  const TARGET_IDS = ['yossi', 'cohen', 'daniel', 'roi', 'ido'];
  function freshState() {
    return {
      v: 1, joy: 0, community: 0, volunteers: 1, chabadLevel: 1, time: 7.5, radio: 0, inVan: false,
      player: SPOT.playerStart ? { x: SPOT.playerStart.x, z: SPOT.playerStart.z, rot: SPOT.playerStart.rot } : { x: -12, z: -6.6, rot: Math.PI / 4 },
      van: SPOT.vanStart ? { x: SPOT.vanStart.x, z: SPOT.vanStart.z, h: SPOT.vanStart.h } : { x: -12, z: -2, h: -Math.PI / 2 },
      world: W.city ? 'hod-hasharon' : 'grid',
      mission: {
        status: 'idle', timeLeft: 300, elapsed: 0, laterAt: 0, joyGained: 0, communityGained: 0, endReason: null, usedTime: 0,
        targets: { yossi: null, cohen: null, daniel: null, roi: null, ido: null },
      },
      flags: { roiAttention: false, introShown: false, resultsSeen: false, tankTip: false, cohenChallot: false },
      settings: { sound: true, shadows: true, cam: 'third', voice: true },
      greeted: 0,
      quests: {},
    };
  }
  let M = null; // מנהל המשימות הנוספות (js/missions.js)
  let TR = null; // תנועת רכבים (js/traffic.js)
  let EV = null; // אירועים דינמיים ברחוב (js/events.js)
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.v === 1 ? d : null;
    } catch (e) {
      return null;
    }
  }
  let saved = loadSave();
  // שמירה מהעיר הישנה לא מתאימה למיקומים בעיר האמיתית: שומרים התקדמות, מאפסים מיקום
  if (saved && W.city && saved.world !== 'hod-hasharon') {
    const f = freshState();
    saved.player = f.player;
    saved.van = f.van;
    saved.inVan = false;
    saved.world = f.world;
  }
  let S = freshState();
  if (saved) {
    const f = freshState();
    S = Object.assign(f, saved);
    S.mission = Object.assign(f.mission, saved.mission);
    S.mission.targets = Object.assign(freshState().mission.targets, saved.mission && saved.mission.targets);
    S.flags = Object.assign(freshState().flags, saved.flags);
    S.settings = Object.assign(freshState().settings, saved.settings);
    S.quests = Object.assign({}, saved.quests || {});
  }
  // ---------- העיר הנוכחית: כל עיר זוכרת את המיקומים שלה ----------
  const CITY = W.cityId || 'hod';
  S.cities = S.cities || {};
  if ((S.posCity || 'hod') !== CITY) {
    const c = S.cities[CITY], f = freshState();
    S.player = c ? c.player : f.player;
    S.van = c ? c.van : f.van;
    S.rides = c ? c.rides : {};
    S.inVan = false;
    S.ride = null;
  }
  S.posCity = CITY;
  S.city = CITY;
  let resetting = false;
  function save() {
    if (resetting) return;
    S.player = { x: player.x, z: player.z, rot: player.rot };
    S.van = { x: van.x, z: van.z, h: van.h };
    S.rides = {};
    for (const v of vehicles) if (v !== van) S.rides[v.id] = { x: v.x, z: v.z, h: v.h };
    S.ride = drv ? drv.id : null;
    S.inVan = drv === van;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    } catch (e) {}
  }

  // ================= ישויות =================
  const player = {
    x: S.player.x, z: S.player.z, rot: S.player.rot, phase: 0, moving: false, jy: 0, vy: 0,
    p: G.makePerson({ shirt: 0xffffff, jacket: 0x1a1a1a, pants: 0x1a1a1a, skin: 0xf1c9a0, hat: 'fedora', beard: 0x3a2a1a, tzitzit: true }),
  };
  scene.add(player.p.group);
  // ---------- כלי רכב: הטנק, מכונית, קטנוע ואופניים ----------
  const VT = {
    tank: { name: 'טנק המבצעים', enter: 'כניסה לטנק המבצעים', max: W.city ? 25 : 21, acc: 13, grip: 1, offs: [-2.1, -0.7, 0.7, 2.1], r: 1.15, len: 6, cam: 10, camH: 2.5, icon: '🚐', hide: true, wheelR: 0.46, pitch: 1 },
    car: { name: 'המכונית של משה', enter: 'לנהוג במכונית של משה', max: 32, acc: 17, grip: 1.1, offs: [-1.1, 1.1], r: 0.95, len: 3.9, cam: 7, camH: 1.7, icon: '🚗', hide: true, wheelR: 0.33, pitch: 1.4 },
    scooter: { name: 'קטנוע', enter: 'לעלות על הקטנוע', max: 24, acc: 16, grip: 1.45, offs: [0], r: 0.6, len: 1.6, cam: 4.8, camH: 1.7, icon: '🛵', hide: false, seat: 0.84, wheelR: 0.24, pitch: 2.2 },
    breslev: { name: 'הניידת של ברסלב', enter: 'לעלות לניידת של ברסלב', max: 15, acc: 8, grip: 1, offs: [-1.8, 0, 1.8], r: 1.05, len: 5.4, cam: 10, camH: 2.8, icon: '🚐', hide: true, wheelR: 0.4, pitch: 0.9 },
    bike: { name: 'אופניים', enter: 'לעלות על האופניים', max: 11, acc: 6, grip: 1.6, offs: [0], r: 0.55, len: 1.5, cam: 4.4, camH: 1.6, icon: '🚲', hide: false, seat: 0.9, wheelR: 0.33, pitch: 0 },
  };
  const RIDE_COLS = { scooter: [0xd62828, 0x1b6fd8, 0x2e9d5f, 0xf39c12], bike: [0x2c3e50, 0xc0392b, 0x16a085], car: [0x6b8fb8] };
  const vehicles = [];
  function addVehicle(id, type, x, z, h) {
    const cols = RIDE_COLS[type] || [0xffffff];
    const c = cols[vehicles.length % cols.length];
    const m = type === 'breslev' ? G.makeBreslevVan() : type === 'tank' ? G.makeVan() : type === 'car' ? G.makeDriveCar(c) : type === 'scooter' ? G.makeScooter(c) : G.makeBike(c);
    scene.add(m.group);
    const v = { id, type, P: VT[type], x, z, h, v: 0, lean: 0, hornCd: 0, steer: 0, m };
    vehicles.push(v);
    return v;
  }
  function removeVehicle(v) {
    const i = vehicles.indexOf(v);
    if (i >= 0) vehicles.splice(i, 1);
    scene.remove(v.m.group);
  }
  const van = addVehicle('tank', 'tank', S.van.x, S.van.z, S.van.h);
  for (const r of SPOT.rides || []) {
    const sv = S.rides && S.rides[r.id];
    addVehicle(r.id, r.type, sv ? sv.x : r.x, sv ? sv.z : r.z, sv ? sv.h : r.h);
  }
  let drv = S.inVan ? van : S.ride ? vehicles.find((v) => v.id === S.ride) || null : null;

  const NPC_DEFS = [
    { id: 'moshe', name: 'משה', role: 'המתנדב הוותיק', x: -9.4, z: -6.9, rot: Math.PI / 4,
      look: { shirt: 0xffffff, jacket: 0x2b2b33, pants: 0x2b2b33, skin: 0xe8b98f, hat: 'fedora', beard: 0xdddddd } },
    { id: 'yossi', name: 'יוסי', role: 'הסטודנט', x: -16.6, z: 5.2, rot: Math.PI * 0.6,
      look: { shirt: 0x3d7dd8, pants: 0x2f3e5c, skin: 0xf0c8a0, hair: 0x4a2f1b, backpack: 0xd84a3d } },
    { id: 'cohen', name: 'מר כהן', role: 'בעל המכולת', x: 15, z: -6.9, rot: Math.PI / 4,
      look: { shirt: 0xf3efe2, apron: 0x2e7d4f, pants: 0x4b3b2b, skin: 0xe2b088, kippah: 0x1b3a8a, hair: 0x8a8a8a } },
    { id: 'daniel', name: 'דניאל', role: 'איש העסקים', x: 24.5, z: 29.3, rot: Math.PI / 4,
      look: { shirt: 0xf5f5f5, jacket: 0x34495e, pants: 0x34495e, skin: 0xedc49c, hair: 0x222222, phone: true } },
    { id: 'roi', name: 'רועי', role: 'עובד תחנת הדלק', x: 54, z: -48.3, rot: Math.PI / 4,
      look: { shirt: 0xe85d2a, pants: 0x2d3a4a, skin: 0xc98e62, cap: 0x1f3f8f, headphones: true } },
    { id: 'ido', name: 'עידו', role: 'הרץ מהפארק', x: 45, z: 45, rot: 0,
      look: { shirt: 0x2ecc71, pants: 0x222222, skin: 0xf2c6a2, hair: 0x6b4423, shorts: true, shoes: 0xffffff } },
  ];
  const npcs = [], npcById = {};
  function addNPC(d) {
    const p = G.makePerson(d.look);
    scene.add(p.group);
    const icon = G.makeIcon('alert');
    icon.position.y = 3.0;
    icon.visible = false;
    p.group.add(icon);
    const n = { id: d.id, def: d, x: d.x, z: d.z, rot: d.rot || 0, rotT: d.rot || 0, phase: 0, s: 0, p, icon, iconKind: null, hidden: false, ctrl: null };
    npcs.push(n);
    npcById[d.id] = n;
    return n;
  }
  // בפתח תקווה: במקום משה — ר׳ מנחם, השליח של העיר; דמויות פרק 1 נשארות בהוד השרון
  if (CITY === 'pt') Object.assign(NPC_DEFS[0], { name: 'ר׳ מנחם', role: 'השליח של פתח תקווה', look: { shirt: 0xffffff, jacket: 0x1a1a1a, pants: 0x1a1a1a, skin: 0xe2b088, hat: 'fedora', beard: 0x6b4a2b } });
  for (const d of NPC_DEFS) {
    const sp = SPOT[d.id];
    if (sp) Object.assign(d, { x: sp.x, z: sp.z, rot: sp.rot || 0 });
    addNPC(d);
  }
  if (CITY === 'pt') for (const id of TARGET_IDS) npcById[id].hidden = true;
  // מסך הפתיחה בפרק 2
  if (CITY === 'pt') {
    const tc = document.querySelector('#title .credit'), tl = document.querySelector('#title .tagline'), bd = document.querySelector('#title .badge');
    if (bd) bd.textContent = 'פרק 2 · פתח תקווה';
    if (tl) tl.textContent = 'אם המושבות מחכה: שוק לפני שבת, ביקור חולים בשניידר, וספר תורה חדש לבית הכנסת הגדול.';
    if (tc) tc.textContent = 'פתח תקווה · נתוני מפה: © OpenStreetMap contributors (ODbL)';
  }

  // ---------- הולכי רגל ----------
  const wr = G.rng(18);
  const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xffffff, 0xe67e22, 0x95a5a6, 0x34495e, 0xff7eb3];
  const SKINS = [0xf1c9a0, 0xe2b088, 0xc98e62, 0x8d5a3b, 0xf5d6b8];
  const HAIRS = [0x222222, 0x4a2f1b, 0x8a6a3a, 0xc9a26b, 0x777777];
  const walkers = [];
  // מסלול כללי: נקודות, אורך מצטבר; סגור (לולאה) או פתוח (הלוך-חזור)
  function mkPath(pts, closed) {
    const P = closed ? pts.concat([pts[0]]) : pts.slice();
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { pts: P, cum, len: cum[cum.length - 1] || 1, closed };
  }
  function pathPoint(P, s) {
    if (P.closed) s = ((s % P.len) + P.len) % P.len;
    else {
      s = ((s % (2 * P.len)) + 2 * P.len) % (2 * P.len);
      if (s > P.len) s = 2 * P.len - s;
    }
    let i = 1;
    while (i < P.cum.length - 1 && P.cum[i] < s) i++;
    const a = P.pts[i - 1], b = P.pts[i], seg = P.cum[i] - P.cum[i - 1] || 1, f = (s - P.cum[i - 1]) / seg;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  const cityPaths = W.paths && W.paths.length ? W.paths.filter((p) => {
    const m = p.pts[(p.pts.length / 2) | 0];
    return Math.hypot(m[0] - (SPOT.playerStart ? SPOT.playerStart.x : 0), m[1] - (SPOT.playerStart ? SPOT.playerStart.z : 0)) < 420;
  }) : null;
  function spawnWalker() {
    const ring = W.rings ? W.rings[(wr() * W.rings.length) | 0] : [0, 0];
    const look = { shirt: SHIRTS[(wr() * SHIRTS.length) | 0], pants: [0x2c3e50, 0x333333, 0x5d4037, 0x1f3f8f][(wr() * 4) | 0], skin: SKINS[(wr() * SKINS.length) | 0] };
    const r = wr();
    if (r < 0.2) { look.hat = 'fedora'; look.beard = HAIRS[(wr() * 3) | 0]; look.jacket = 0x1a1a1a; look.shirt = 0xffffff; }
    else if (r < 0.4) { look.kippah = [0x1b3a8a, 0xffffff, 0x222222][(wr() * 3) | 0]; look.hair = HAIRS[(wr() * HAIRS.length) | 0]; }
    else if (r < 0.55) look.cap = SHIRTS[(wr() * SHIRTS.length) | 0];
    else look.hair = HAIRS[(wr() * HAIRS.length) | 0];
    const p = G.makePerson(look);
    scene.add(p.group);
    const icon = G.makeIcon('hey');
    icon.position.y = 2.8;
    icon.visible = false;
    p.group.add(icon);
    const w = { p, icon, iconT: 0, cx: ring[0], cz: ring[1], t: wr() * 4, dir: wr() < 0.5 ? 1 : -1, speed: 1.3 + wr() * 0.9, x: 0, z: 0, rot: 0, ox: 0, oz: 0, wait: 0, greeted: false, phase: wr() * 6 };
    if (cityPaths && cityPaths.length) {
      const cp = cityPaths[(wr() * cityPaths.length) | 0];
      w.path = mkPath(cp.pts, false);
      w.s = wr() * w.path.len * 2;
    }
    walkers.push(w);
  }
  for (let i = 0; i < (cityPaths ? 26 : 14); i++) spawnWalker();
  let extraSpawned = false;
  function spawnExtraWalkers() {
    if (extraSpawned) return;
    extraSpawned = true;
    for (let i = 0; i < 8; i++) spawnWalker();
  }
  const RS = 12.8;
  function ringPoint(cx, cz, t) {
    t = ((t % 4) + 4) % 4;
    const s = Math.floor(t), f = t - s;
    const C = [[cx - RS, cz - RS], [cx + RS, cz - RS], [cx + RS, cz + RS], [cx - RS, cz + RS]];
    const a = C[s], b = C[(s + 1) % 4];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  const PS0 = SPOT.playerStart || { x: 0, z: 0 };
  const JOG = mkPath(W.jogPath || [[PS0.x, PS0.z], [PS0.x + 20, PS0.z], [PS0.x + 20, PS0.z + 20]], true);
  const jogPoint = (s) => pathPoint(JOG, s);

  // ---------- סמנים בעולם ----------
  const arrowTex = G.canvasTex(32, 32, (g) => {
    g.fillStyle = '#ffd23f';
    g.strokeStyle = '#13213f';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(30, 22);
    g.lineTo(20, 18);
    g.lineTo(20, 30);
    g.lineTo(12, 30);
    g.lineTo(12, 18);
    g.lineTo(2, 22);
    g.closePath();
    g.fill();
    g.stroke();
  });
  const arrow = new T.Group();
  const arrowMesh = new T.Mesh(new T.PlaneGeometry(1.4, 1.4), new T.MeshBasicMaterial({ map: arrowTex, transparent: true, side: T.DoubleSide, depthWrite: false }));
  arrowMesh.rotation.x = Math.PI / 2;
  arrowMesh.position.set(0, 0.15, 2.4);
  arrow.add(arrowMesh);
  arrow.visible = false;
  scene.add(arrow);
  // סמן יעד מרחף — חרוט טורקיז הפוך, נראה מרחוק
  const navMark = new T.Group();
  const navCone = new T.Mesh(new T.ConeGeometry(0.55, 1.3, 4), new T.MeshBasicMaterial({ color: 0x2fd3f5, transparent: true, opacity: 0.9, fog: false }));
  navCone.rotation.x = Math.PI;
  navCone.renderOrder = 5;
  navMark.add(navCone);
  navMark.visible = false;
  scene.add(navMark);
  const ring = new T.Mesh(new T.RingGeometry(0.75, 0.95, 20), new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const noteMat = new T.SpriteMaterial({
    map: G.canvasTex(16, 16, (g) => {
      g.fillStyle = '#ffd23f';
      g.font = 'bold 15px Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('♪', 8, 9);
    }),
    transparent: true, depthTest: false,
  });
  const notes = [];
  for (let i = 0; i < 8; i++) {
    const s = new T.Sprite(noteMat.clone());
    s.scale.set(0.8, 0.8, 1);
    s.visible = false;
    s.renderOrder = 15;
    scene.add(s);
    notes.push({ s, life: 0, vx: 0 });
  }
  let noteT = 0;

  // ================= ממשק =================
  const ui = {
    hud: $('hud'), title: $('title'), dialog: $('dialog'), dName: $('d-name'), dText: $('d-text'), dChoices: $('d-choices'), dNext: $('d-next'),
    prompt: $('prompt'), toasts: $('toasts'), joyFill: $('joy-fill'), joyVal: $('joy-val'), joyBox: $('joy'), stats: $('stats'), tracker: $('tracker'),
    clock: $('clock'), keys: $('keys-hint'), radio: $('radio-label'), touch: $('touch'), actBtn: $('t-act'),
  };
  function setText(el, s) {
    if (el._t !== s) {
      el._t = s;
      el.textContent = s;
    }
  }
  function setHTML(el, s) {
    if (el._h !== s) {
      el._h = s;
      el.innerHTML = s;
    }
  }
  function show(el, on) {
    el.classList.toggle('hidden', !on);
  }
  function toast(msg, cls) {
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.textContent = msg;
    ui.toasts.appendChild(el);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => el.remove(), 4100);
  }
  let radioLabelT = null;
  function showRadioLabel(text, sub) {
    ui.radio.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = text;
    ui.radio.appendChild(b);
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      ui.radio.appendChild(s);
    }
    ui.radio.classList.add('on');
    clearTimeout(radioLabelT);
    radioLabelT = setTimeout(() => ui.radio.classList.remove('on'), sub ? 4200 : 2200);
  }
  // ״רדיו קול חב״ד״: נדלק בכל עלייה לרכב, מציג את שם השיר
  function kolCard() {
    showRadioLabel('📻 רדיו קול חב״ד', '♪ ' + (A.currentSong() || ''));
  }
  A.onSongChange((title) => {
    if (drv && S.radio === A.KOL) showRadioLabel('📻 רדיו קול חב״ד', '♪ ' + title);
  });
  const fmtTime = (s) => {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  function addJoy(n) {
    S.joy = G.clamp(S.joy + n, 0, 100);
    if (S.mission.status === 'active') S.mission.joyGained += n;
    if (M) M.onGain('joy', n);
    ui.joyBox.classList.remove('pulse');
    void ui.joyBox.offsetWidth;
    ui.joyBox.classList.add('pulse');
  }
  function addCommunity(n) {
    S.community += n;
    if (S.mission.status === 'active') S.mission.communityGained += n;
    if (M) M.onGain('community', n);
  }

  // ================= קלט =================
  const keys = {};
  const joy = { x: 0, y: 0, mag: 0, id: null };
  const touch = { gas: false, brake: false };
  let mode = 'title', prevMode = 'play';

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    initAudioOnce();
    onKey(e);
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    if (mode === 'play') pauseGame();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
  window.addEventListener('beforeunload', save);
  document.addEventListener('pointerdown', initAudioOnce);
  let audioReady = false;
  function initAudioOnce() {
    if (audioReady) return;
    audioReady = true;
    A.init();
    A.setEnabled(S.settings.sound);
    if (S.radio === A.KOL && !drv) S.radio = 0;
    A.setStation(S.radio);
  }

  function digitOf(code) {
    const m = /^(Digit|Numpad)([1-9])$/.exec(code);
    return m ? +m[2] : 0;
  }
  function onKey(e) {
    const c = e.code === 'NumpadEnter' ? 'Enter' : e.code;
    // Enter מטופל כאן בלבד, כדי שלא "ילחץ" שוב על כפתור שנשאר בפוקוס
    if (c === 'Enter' && !e.repeat) e.preventDefault();
    if (c === 'Enter' && e.repeat) return e.preventDefault();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c) && mode !== 'title') e.preventDefault();
    if (mode === 'matzah') return; // למאפייה מקשים משלה
    if (mode === 'title') {
      if (c === 'Enter') $('btn-play').click();
      return;
    }
    if (mode === 'journal') {
      if (c === 'Escape' || c === 'Enter' || c === 'KeyP') closeJournal();
      return;
    }
    if (mode === 'map') {
      if (c === 'Escape' || c === 'KeyM' || c === 'Enter') closeBigMap();
      else if (c === 'Equal' || c === 'NumpadAdd') bmZoom(1.3);
      else if (c === 'Minus' || c === 'NumpadSubtract') bmZoom(1 / 1.3);
      return;
    }
    if (c === 'Escape' || c === 'KeyP') {
      if (mode === 'play') pauseGame();
      else if (mode === 'paused') resumeGame();
      else if (mode === 'panel') closePanel();
      else if (mode === 'confirm') closeConfirm();
      return;
    }
    if (mode === 'paused') {
      if (c === 'Enter') resumeGame();
      return;
    }
    if (mode === 'panel') {
      if (c === 'Enter') {
        const up = $('btn-upgrade');
        if (up) up.click();
        else closePanel();
      }
      return;
    }
    if (mode === 'dialog') {
      const d = digitOf(c);
      if (d) dialogChoose(d - 1);
      else if (dlg && dlg.cur.c && !dlg.typing && (c === 'ArrowUp' || c === 'ArrowDown' || c === 'KeyW' || c === 'KeyS')) moveChoice(c === 'ArrowUp' || c === 'KeyW' ? -1 : 1);
      else if (c === 'Enter' && dlg && dlg.cur.c && !dlg.typing) dialogChoose(dlg.sel);
      else if (c === 'KeyE' || c === 'Enter' || c === 'Space') dialogAdvance();
      return;
    }
    if (mode === 'tefillin') {
      if (c === 'KeyE' || c === 'Enter' || c === 'Space') wrapTefillin();
      return;
    }
    if (mode === 'results') {
      if (c === 'Enter') closeResults();
      return;
    }
    if (mode !== 'play') return;
    if ((c === 'KeyE' || c === 'Enter') && call && mode === 'play') endCall(true);
    else if (c === 'KeyE' || c === 'Enter') interact();
    else if (c === 'KeyV') toggleCam();
    else if (c === 'KeyR') radio();
    else if (c === 'KeyN') nextSong();
    else if (c === 'KeyB') setGps('home');
    else if (c === 'KeyT') setGps('tank');
    else if (c === 'KeyM') openBigMap();
    else if (c === 'KeyH' || c === 'KeyQ') horn();
  }
  function virtualKey(code) {
    initAudioOnce();
    onKey({ code, preventDefault() {} });
  }
  function axis() {
    let x = 0, y = 0;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyW || keys.ArrowUp) y += 1;
    if (keys.KeyS || keys.ArrowDown) y -= 1;
    return { x, y };
  }

  // ---------- מבט בעכבר (גוף שלישי) ----------
  function toggleCam() {
    S.settings.cam = S.settings.cam === 'iso' ? 'third' : 'iso';
    tp.yaw = drv ? drv.h : player.rot;
    if (S.settings.cam === 'iso' && document.pointerLockElement) document.exitPointerLock();
    toast(S.settings.cam === 'iso' ? 'מצלמה: מבט על (איזומטרי)' : 'מצלמה: גוף שלישי — העכבר מסובב את המבט');
    save();
  }
  function look(dx, dy) {
    tp.yaw -= dx * 0.0028;
    tp.pitch = G.clamp(tp.pitch + dy * 0.0022, -0.3, 1.15);
    if (drv) {
      tp.vanOff -= dx * 0.0028;
      tp.lookT = 1.6;
    }
  }
  let dragId = null, dragX = 0, dragY = 0;
  canvas.addEventListener('click', () => {
    if (mode === 'play' && isThird() && !isTouch && !document.pointerLockElement && canvas.requestPointerLock) canvas.requestPointerLock();
  });
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas && mode === 'play') look(e.movementX, e.movementY);
  });
  // במגע: גרירה בחצי הימני של המסך מסובבת את המצלמה
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || dragId !== null) return;
    dragId = e.pointerId;
    dragX = e.clientX;
    dragY = e.clientY;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    look((e.clientX - dragX) * 1.6, (e.clientY - dragY) * 1.6);
    dragX = e.clientX;
    dragY = e.clientY;
  });
  const endDrag = (e) => {
    if (e.pointerId === dragId) dragId = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // ---------- שליטה במגע ----------
  const jEl = $('joystick'), knob = $('knob');
  function moveJoy(e) {
    const r = jEl.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      dx /= l;
      dy /= l;
    }
    joy.x = dx;
    joy.y = -dy;
    joy.mag = Math.min(1, l);
    knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
  }
  jEl.addEventListener('pointerdown', (e) => {
    joy.id = e.pointerId;
    jEl.setPointerCapture(e.pointerId);
    moveJoy(e);
  });
  jEl.addEventListener('pointermove', (e) => {
    if (e.pointerId === joy.id) moveJoy(e);
  });
  const endJoy = (e) => {
    if (e.pointerId !== joy.id) return;
    joy.id = null;
    joy.x = joy.y = joy.mag = 0;
    knob.style.transform = '';
  };
  jEl.addEventListener('pointerup', endJoy);
  jEl.addEventListener('pointercancel', endJoy);
  function holdBtn(id, key) {
    const el = $(id);
    const on = (e) => {
      e.preventDefault();
      touch[key] = true;
      el.classList.add('down');
    };
    const off = () => {
      touch[key] = false;
      el.classList.remove('down');
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }
  holdBtn('t-gas', 'gas');
  holdBtn('t-brake', 'brake');
  for (const [id, code] of [['t-act', 'KeyE'], ['t-horn', 'KeyH'], ['t-radio', 'KeyR'], ['t-next', 'KeyN']]) {
    $(id).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      virtualKey(code);
    });
  }
  $('pause-btn').addEventListener('click', () => virtualKey('Escape'));

  // ================= התנגשויות =================
  function collideCircle(x, z, r, dyn) {
    if (W.collide) return W.collide(x, z, r, dyn);
    let hit = false;
    for (let it = 0; it < 2; it++) {
      for (const b of W.boxes) {
        if (x + r < b.x1 || x - r > b.x2 || z + r < b.z1 || z - r > b.z2) continue;
        const cx = Math.max(b.x1, Math.min(x, b.x2)), cz = Math.max(b.z1, Math.min(z, b.z2));
        const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        hit = true;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * r;
          z = cz + (dz / d) * r;
        } else {
          const l = x - b.x1, rr = b.x2 - x, t = z - b.z1, bt = b.z2 - z, m = Math.min(l, rr, t, bt);
          if (m === l) x = b.x1 - r;
          else if (m === rr) x = b.x2 + r;
          else if (m === t) z = b.z1 - r;
          else z = b.z2 + r;
        }
      }
      const pushC = (c) => {
        const dx = x - c.x, dz = z - c.z, R = r + c.r, d2 = dx * dx + dz * dz;
        if (d2 >= R * R || d2 < 1e-8) return;
        const d = Math.sqrt(d2);
        x = c.x + (dx / d) * R;
        z = c.z + (dz / d) * R;
        hit = true;
      };
      for (const c of W.circles) pushC(c);
      if (dyn) for (const c of dyn) pushC(c);
    }
    const lim = W.HALF - r;
    if (Math.abs(x) > lim || Math.abs(z) > lim) hit = true;
    x = G.clamp(x, -lim, lim);
    z = G.clamp(z, -lim, lim);
    return { x, z, hit };
  }
  // עיגולי התנגשות של כלי רכב (לאורך הציר שלו)
  function vehicleCircles(v, out) {
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    for (const k of v.P.offs) out.push({ x: v.x + fx * k, z: v.z + fz * k, r: v.P.r });
    return out;
  }
  function vanCircles(out, except) {
    for (const v of vehicles) if (v !== except && v !== drv) vehicleCircles(v, out);
    if (TR) TR.obstacles(out);
    return out;
  }
  function npcCircles(out) {
    for (const n of npcs) if (!n.hidden) out.push({ x: n.x, z: n.z, r: 0.42 });
    if (M) M.obstacles(out);
    if (EV) EV.obstacles(out);
    return out;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // ================= שחקן וכלי רכב =================
  // קלט מסך (ימינה/קדימה) → כיוון בעולם, לפי המצלמה הפעילה
  function worldDir(ix, iy) {
    if (isThird()) {
      const fx = Math.sin(tp.yaw), fz = Math.cos(tp.yaw);
      return [fx * iy - fz * ix, fz * iy + fx * ix];
    }
    return [(ix - iy) * SQ, (-ix - iy) * SQ];
  }
  let stepT = 0;
  function updatePlayer(dt) {
    const k = axis();
    let ix = k.x + joy.x, iy = k.y + joy.y;
    let len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
      len = 1;
    }
    const sprint = keys.ShiftLeft || keys.ShiftRight || (isTouch && joy.mag > 0.95);
    const sp = (sprint ? 9.5 : 6) * len;
    // קפיצה (רווח)
    if (keys.Space && player.jy <= 0 && player.vy <= 0) {
      player.vy = 5.2;
      A.step(true);
    }
    if (player.jy > 0 || player.vy > 0) {
      player.vy -= 16 * dt;
      player.jy = Math.max(0, player.jy + player.vy * dt);
      if (player.jy === 0) {
        player.vy = 0;
        A.step(false);
      }
    }
    if (len > 0.1) {
      const [wx, wz] = worldDir(ix, iy);
      const r = collideCircle(player.x + wx * sp * dt, player.z + wz * sp * dt, 0.45, npcCircles(vanCircles([])));
      player.x = r.x;
      player.z = r.z;
      player.rot = G.lerpAngle(player.rot, Math.atan2(wx, wz), 1 - Math.exp(-15 * dt));
      player.phase += dt * sp * 1.6;
      player.moving = true;
      // צעדים
      stepT -= dt * sp;
      if (stepT <= 0) {
        stepT = 2.6;
        A.step(sprint);
      }
    } else player.moving = false;
  }

  let bumpCd = 0, walkerToastCd = 0;
  function updateVehicle(v, dt) {
    const P = v.P;
    const k = axis();
    let throttle = k.y, steer = -k.x;
    let brake = !!keys.Space;
    if (brake && v.v < 1) {
      brake = false;
      throttle = -1;
    }
    if (touch.gas) throttle = 1;
    if (touch.brake) throttle = -1;
    if (joy.mag > 0.25) {
      const [wx, wz] = worldDir(joy.x, joy.y);
      const desired = Math.atan2(wx, wz);
      if (v.v < -0.5) steer = G.clamp(-G.wrapAngle(desired + Math.PI - v.h) * 2.2, -1, 1);
      else steer = G.clamp(G.wrapAngle(desired - v.h) * 2.2, -1, 1);
      if (!touch.gas && !touch.brake) throttle = 0.65 * joy.mag;
    }
    // נהג אוטומטי (למשל הניידת של ברסלב): השחקן נוסע כנוסע
    if (v.auto) {
      const c = v.auto(dt, v);
      // נהג אוטומטי ״קינמטי״: הרכב נע לאורך המסלול בלי פיזיקה ובלי התנגשויות — נסיעה חלקה
      if (c.kin) {
        v.x = c.kin.x;
        v.z = c.kin.z;
        v.h = c.kin.h;
        v.v = c.kin.v;
        v.steer = 0;
        v.lean = 0;
        for (const w of v.m.wheels) w.rotation.x += (v.v * dt) / v.P.wheelR;
        player.x = v.x;
        player.z = v.z;
        player.rot = v.h;
        return;
      }
      throttle = c.throttle;
      steer = c.steer;
      brake = !!c.brake;
    }
    const mods = M ? M.driveMods(v) : { max: 1, grip: 1 };
    const MAX = P.max * mods.max, REV = v.type === 'bike' ? -3 : -7, ACC = P.acc;
    if (brake) v.v = G.moveToward(v.v, 0, 34 * dt);
    else if (throttle > 0.05) v.v += (v.v < 0 ? 26 : ACC) * throttle * dt;
    else if (throttle < -0.05) v.v += (v.v > 0.3 ? -28 : -8) * -throttle * dt;
    else v.v = G.moveToward(v.v, 0, (v.type === 'bike' ? 2.5 : 5) * dt);
    if (v.v > MAX) v.v = G.moveToward(v.v, MAX, 30 * dt);
    else v.v = G.clamp(v.v, REV, MAX * (throttle > 0 ? Math.max(0.4, throttle) : 1));
    let sf = G.clamp(Math.abs(v.v) / 4, 0, 1) * (1 - 0.4 * G.clamp(Math.abs(v.v) / Math.max(21, P.max), 0, 1)) * mods.grip * P.grip;
    // תקועים מול קיר ולוחצים גז/רוורס: מאפשרים להסתובב לאט כדי לצאת
    let dir = Math.sign(v.v);
    if (v.blocked > 0 && Math.abs(throttle) > 0.1) {
      sf = Math.max(sf, 0.35);
      if (!dir) dir = Math.sign(throttle);
    }
    v.h += steer * 2.2 * sf * dir * dt;
    if (v.v < -0.5 && !S.flags.revTip) {
      S.flags.revTip = true;
      toast('⬅ רוורס! הבלם הוא גם הילוך אחורי — ממשיכים ללחוץ כשהרכב עומד', 'gold');
    }
    if (isTouch) $('t-brake').classList.toggle('rev', v.v < -0.5);
    v.steer = steer;
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    v.x += fx * v.v * dt;
    v.z += fz * v.v * dt;
    // גבול העיר: עצירה רכה (בלי התנגשות), כדי שאפשר יהיה להסתובב ולחזור
    const lim = W.HALF - 3;
    if (Math.abs(v.x) > lim || Math.abs(v.z) > lim) {
      v.x = G.clamp(v.x, -lim, lim);
      v.z = G.clamp(v.z, -lim, lim);
      v.v *= Math.exp(-2.5 * dt);
      v.blocked = 0.5;
    }
    // התנגשות: עיגולים לאורך הרכב, מול העולם, דמויות, רכבים אחרים ותנועה
    const dyn = npcCircles(vanCircles([], v));
    let hit = false;
    for (let it = 0; it < 2; it++) {
      let px = 0, pz = 0;
      for (const k2 of P.offs) {
        const cx = v.x + fx * k2, cz = v.z + fz * k2;
        const r = collideCircle(cx, cz, P.r, dyn);
        if (r.hit) {
          hit = true;
          if (Math.abs(r.x - cx) > Math.abs(px)) px = r.x - cx;
          if (Math.abs(r.z - cz) > Math.abs(pz)) pz = r.z - cz;
        }
      }
      v.x += px;
      v.z += pz;
      if (hit && (px * fx + pz * fz) * Math.sign(v.v) < -0.005) {
        if (Math.abs(v.v) > 7 && bumpCd <= 0) {
          A.crash(Math.min(1, Math.abs(v.v) / 20));
          bumpCd = 0.6;
          if (TR) TR.bumped(v);
        }
        v.v *= 0.5;
      }
    }
    bumpCd -= dt;
    if (hit) v.blocked = 0.5;
    else v.blocked = Math.max(0, (v.blocked || 0) - dt);
    const leanAmt = P.hide ? 0.06 : 0.22;
    v.lean = G.lerp(v.lean, steer * sf * leanAmt * Math.sign(v.v), 1 - Math.exp(-6 * dt));
    for (const w of v.m.wheels) w.rotation.x += (v.v * dt) / P.wheelR;
    player.x = v.x;
    player.z = v.z;
    player.rot = v.h;
    // הולכי רגל מתרחקים מכלי הרכב
    for (const w of walkers) {
      const d = Math.hypot(w.x - v.x, w.z - v.z);
      if (d < 2.6 && Math.abs(v.v) > 1) {
        const ax = (w.x - v.x) / (d || 1), az = (w.z - v.z) / (d || 1);
        w.ox += ax * (2.8 - d);
        w.oz += az * (2.8 - d);
        w.icon.visible = true;
        w.iconT = 1.2;
        if (walkerToastCd <= 0) {
          toast('זהירות — הולכי רגל! 🙂');
          walkerToastCd = 8;
        }
      }
    }
    walkerToastCd -= dt;
  }

  function enterVehicle(v) {
    drv = v;
    S.inVan = v === van;
    S.ride = v.id;
    player.p.group.visible = !v.P.hide;
    tp.yaw = v.h;
    A.door(v.type);
    if (v.type === 'breslev') {
      // בניידת של ברסלב: רק השיר שלהם (מהרמקול)
      S.radio = 0;
      A.setStation(0);
      A.kol(false);
    } else if (v.type === 'bike') {
      // באופניים אין רדיו
      S.radio = 0;
      A.setStation(0);
      A.kol(false);
    } else if (A.hasSongs()) {
      S.radio = A.KOL;
      A.setStation(A.KOL);
      setTimeout(kolCard, 150);
    }
    if (!S.flags.tankTip) {
      S.flags.tankTip = true;
      toast(isTouch ? 'ג׳ויסטיק לנהיגה · גז ובלם מימין (הבלם הוא גם רוורס) · צופר וניגון בכפתורים' : 'W גז · S בלם ורוורס · A/D היגוי · רווח בלם (וגם רוורס) · H צופר · R רדיו', 'gold');
    }
    if (v.type !== 'tank' && !S.flags['tip_' + v.type]) {
      S.flags['tip_' + v.type] = true;
      toast(v.type === 'bike' ? 'אופניים: שקט, ירוק ואיטי. H לצלצול בפעמון 🔔' : v.type === 'scooter' ? 'קטנוע: זריז ונכנס לכל סמטה 🛵' : 'המכונית של משה — מהירה, אבל בלי רמקול ובלי מקום למטען', 'gold');
    }
  }
  const enterVan = () => enterVehicle(van);
  function exitVehicle() {
    const v = drv;
    if (!v) return;
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    const lx = fz, lz = -fx, side = v.P.r + 0.9, back = v.P.len / 2 + 0.9;
    const spots = [[lx * side, lz * side], [-lx * side, -lz * side], [-fx * back, -fz * back], [fx * back, fz * back], [lx * (side + 0.9), lz * (side + 0.9)], [-lx * (side + 0.9), -lz * (side + 0.9)]];
    for (const [ox, oz] of spots) {
      const x = v.x + ox, z = v.z + oz;
      const r = collideCircle(x, z, 0.45, npcCircles(vanCircles([], v)));
      if (!r.hit) {
        drv = null;
        S.inVan = false;
        S.ride = null;
        if (S.radio === A.KOL) {
          S.radio = 0;
          A.setStation(0);
        }
        v.v = 0;
        v.lean = 0;
        player.x = x;
        player.z = z;
        player.rot = Math.atan2(ox, oz);
        player.p.group.visible = true;
        player.p.group.rotation.z = 0;
        A.door(v.type);
        return;
      }
    }
    toast('אין מקום לרדת כאן — זוזו קצת');
  }
  const exitVan = exitVehicle;

  function horn() {
    if (!drv) {
      toast('צופר יש רק כשנוהגים');
      return;
    }
    if (drv.hornCd > 0) return;
    drv.hornCd = 0.7;
    if (drv.type === 'bike') A.bell();
    else if (drv.type === 'scooter') A.beep();
    else A.horn();
    for (const w of walkers)
      if (Math.hypot(w.x - drv.x, w.z - drv.z) < 16) {
        w.icon.visible = true;
        w.iconT = 1.6;
        w.wait = Math.max(w.wait, 1.2);
      }
    if (drv !== van) return;
    const roi = npcById.roi;
    if (!S.flags.roiAttention && Math.hypot(roi.x - van.x, roi.z - van.z) < 22) {
      S.flags.roiAttention = true;
      toast(S.radio ? 'רועי הוריד את האוזניות ומזמזם את הניגון!' : 'רועי הוריד את האוזניות והסתכל לעבר הטנק!', 'gold');
      if (S.radio) addJoy(2);
      save();
    }
  }
  // R: קול חב״ד ← ניגונים ← כבוי (בכל כלי רכב)
  function radio() {
    if (!drv) {
      toast('הרדיו עובד כשנוסעים — עלו על כלי רכב');
      return;
    }
    if (drv.type === 'bike') {
      toast('באופניים אין רדיו 🚲 — רק הפעמון (H)');
      return;
    }
    if (drv.type === 'breslev') {
      toast('בניידת של ברסלב יש רק שיר אחד — נח נחמן מאומן! 🎶');
      return;
    }
    const cycle = (A.hasSongs() ? [A.KOL] : []).concat([1, 2, 3, 0]);
    const i = cycle.indexOf(S.radio);
    S.radio = cycle[(i + 1) % cycle.length];
    A.setStation(S.radio);
    if (S.radio === A.KOL) kolCard();
    else showRadioLabel((S.radio ? '♪ ' : '') + A.stationName(S.radio));
  }
  // N: השיר הבא בקול חב״ד
  function nextSong() {
    if (drv && S.radio === A.KOL) A.nextSong();
  }

  // ================= אינטראקציה =================
  let cur = null;
  function computeInteract() {
    cur = null;
    if (drv) {
      if (drv.auto) return;
      if (Math.abs(drv.v) < 2.5) {
        const qa = drv === van && M && M.vanAction();
        cur = qa ? { kind: 'quest', label: qa.label, run: qa.run, x: qa.x, z: qa.z } : { kind: 'exit', label: drv.P.hide ? 'יציאה מה' + (drv === van ? 'טנק' : 'מכונית') : 'לרדת מה' + drv.P.name };
      }
      return;
    }
    let best = 99;
    if (M)
      for (const q of M.interactables()) {
        const d = Math.hypot(player.x - q.x, player.z - q.z);
        if (d < (q.r || 2) && d < best) {
          best = d;
          cur = { kind: 'quest', label: q.label, run: q.run, x: q.x, z: q.z };
        }
      }
    if (EV)
      for (const q of EV.interactables()) {
        const d = Math.hypot(player.x - q.x, player.z - q.z) - (q.prio ? 2 : 0);
        if (d < (q.r || 2) && d < best) {
          best = d;
          cur = { kind: 'quest', label: q.label, run: q.run, x: q.x, z: q.z };
        }
      }
    for (const n of npcs) {
      if (n.hidden) continue;
      const d = dist(player, n);
      if (d < 2.5 && d < best) {
        best = d;
        cur = { kind: 'npc', ref: n, label: 'לדבר עם ' + n.def.name, x: n.x, z: n.z };
      }
    }
    // אדם שעומד ממש לידך קודם לרכב (טנק גדול שחונה ליד דוכן לא ״גונב״ את השיחה)
    const talkFirst = cur && cur.kind === 'npc' && best < 2.0;
    for (const v of vehicles) {
      if (v.locked || talkFirst) continue;
      const dv = Math.hypot(player.x - v.x, player.z - v.z) - v.P.len / 3.5;
      if (dv < 2.2 && dv < best) {
        best = dv;
        cur = { kind: 'van', ref: v, label: v.P.enter, x: v.x, z: v.z };
      }
    }
    const door = W.places.chabadDoor, dd = dist(player, door);
    // מאפיית המצות ליד המטבח
    if (MZ) {
      const it = MZ.interactable(player), dz = it ? dist(player, MZ.spot) : 99;
      if (it && dz < best) {
        best = dz;
        cur = { kind: 'matzah', label: it.label, x: it.x, z: it.z };
      }
    }
    // הדלת מנצחת רק אם היא קרובה בבירור יותר מאדם שעומד לידה (משה ליד הדלת)
    if (dd < 1.8 && dd < best - (cur && cur.kind === 'npc' ? 0.4 : 0)) {
      best = dd;
      cur = { kind: 'door', label: 'כניסה לבית חב״ד', x: door.x, z: door.z };
    }
    if (!cur)
      for (const w of walkers) {
        const d = dist(player, w);
        if (d < 1.7 && d < best) {
          best = d;
          cur = { kind: 'walker', ref: w, label: 'לומר שלום', x: w.x, z: w.z };
        }
      }
  }
  const GREETS = ['בוקר טוב!', 'שבוע טוב, רבי!', 'איזה יום יפה היום', 'אה, השליח החדש! ברוך הבא לשכונה', 'תמסור ד״ש למשה!', 'ראיתי את הטנק שלך — אחלה ניגונים', 'שיהיה לך יום מוצלח!', 'שבת שלום מראש!'];
  function interact() {
    if (drv && drv.auto && !drv.canExit) {
      toast(drv.autoMsg || 'נוסעים! יורדים בעצירה הבאה');
      return;
    }
    if (drv && drv.auto && drv.canExit) {
      exitVehicle();
      return;
    }
    if (drv) {
      if (Math.abs(drv.v) >= 2.5) toast('האטו כדי לרדת');
      else if (cur && cur.kind === 'quest') cur.run();
      else exitVehicle();
      return;
    }
    if (!cur) return;
    if (cur.kind === 'quest') cur.run();
    else if (cur.kind === 'npc') talkTo(cur.ref);
    else if (cur.kind === 'van') enterVehicle(cur.ref);
    else if (cur.kind === 'matzah') {
      mode = 'matzah';
      MZ.open();
    } else if (cur.kind === 'door') {
      if (CITY === 'pt') toast('בית חב״ד פתח תקווה — ר׳ מנחם מארח אתכם כאן 💙');
      else openPanel();
    }
    else if (cur.kind === 'walker') {
      const w = cur.ref;
      w.wait = 2.5;
      w.rot = Math.atan2(player.x - w.x, player.z - w.z);
      toast('עובר אורח: ״' + GREETS[(Math.random() * GREETS.length) | 0] + '״');
      if (!w.greeted) {
        w.greeted = true;
        S.greeted++;
        addJoy(1);
      }
      A.soft();
    }
  }

  // ================= דיאלוגים =================
  const IDLE = {
    yossi: 'סליחה, אני ממהר לאוטובוס!',
    cohen: 'בוקר טוב! חלב טרי הגיע הבוקר.',
    daniel: '(מדבר בטלפון) ...כן, כן, אני על זה.',
    roi: '(רועי מקשיב למוזיקה באוזניות ולא שם לב אליך)',
    ido: '(מתנשף) בוקר טוב! עוד שלושה סיבובים!',
  };
  const AFTER_OK = {
    yossi: 'עוד לא קיבלתי ציון במבחן... אבל הרגשתי שמישהו איתי שם. תודה!',
    cohen: 'החלות מחכות לשבת. מה שמבטיחים — מקיימים!',
    daniel: 'אם תארגנו פעם אירוע גדול — תתקשר אליי. אני רוצה להיות חלק.',
    roi: 'תשים לי את הניגון ההוא שוב כשאתה עובר פה!',
    ido: 'רצתי היום את הסיבוב הכי מהיר שלי. צירוף מקרים?',
  };
  const AFTER_NO = {
    yossi: 'סליחה על קודם, הייתי בלחץ. אולי מחר?',
    cohen: 'נדבר עוד, נדבר.',
    daniel: 'יום עמוס... בפעם הבאה.',
    roi: 'אחי, אולי בפעם אחרת.',
    ido: 'עוד סיבוב ואני בבית! אולי מחר.',
  };
  const HINTS = {
    yossi: 'יוסי הסטודנט מחכה בתחנת האוטובוס וממהר למבחן. תהיה קצר ולעניין — ותעזור לו, אל תלחץ עליו.',
    cohen: 'מר כהן מהמכולת אוהב להבין דברים לעומק. תענה לו על השאלות בסבלנות.',
    daniel: 'דניאל יושב בבית הקפה במרכז העיר. איש עסוק — אם יבקש שתחזור, תחזור.',
    roi: 'רועי בתחנת הדלק תמיד עם אוזניות. צפירה מהטנק (' + (isTouch ? 'כפתור צופר' : 'H') + ') — והוא כבר יבחין בך.',
    ido: 'עידו רץ בטיילת שבפארק. תצטרך להדביק אותו — ' + (isTouch ? 'דחפו את הג׳ויסטיק עד הסוף כדי לרוץ.' : 'Shift לריצה.'),
  };

  function dlgMoshe() {
    if (CITY === 'pt') return M.mosheDialog();
    const m = S.mission;
    if (m.status === 'idle')
      return {
        a: { s: 'npc', t: 'בוקר טוב, שליח! אני משה, מתנדב ותיק בשכונה. ברוך הבא לחדר השכור הקטן שלנו — מכאן הכול מתחיל.', go: 'b' },
        b: { s: 'npc', t: 'יש לי בשבילך משימה ראשונה: ״רק חמש דקות״. חמישה אנשים בשכונה מחכים שמישהו יציע להם להניח תפילין. סימנתי אותם במפה.', go: 'c' },
        c: {
          s: 'npc', t: 'יש לך חמש דקות. ברגל זה רחוק — טנק המבצעים חונה פה על הכביש. ניגשים אליו ולוחצים ' + ACT + '.',
          c: [{ t: 'יאללה, מתחילים!', fx: startMission }, { t: 'רגע, קודם אני רוצה להסתובב קצת', go: 'd' }],
        },
        d: { s: 'npc', t: 'בסדר גמור. כשתהיה מוכן — אני כאן ליד הדלת.' },
      };
    if (m.status === 'active') {
      const pending = TARGET_IDS.filter((id) => !m.targets[id] || m.targets[id] === 'later');
      const id = pending[0];
      return {
        a: { s: 'npc', t: id ? HINTS[id] : 'כמעט סיימת!', go: 'b' },
        b: { s: 'npc', t: 'נשארו ' + fmtTime(m.timeLeft) + ' דקות עד השקיעה. אתה עושה עבודה טובה — תמשיך!' },
      };
    }
    if (S.chabadLevel < 2) return { a: { s: 'npc', t: 'איזה בוקר! ראית איך השכונה מגיבה? היכנס לבית חב״ד — הדלת ממש מאחוריי — ונשדרג את המקום. מגיע לנו מטבח אמיתי, ואז נמשיך למשימה הבאה.' } };
    return M.mosheDialog();
  }

  const DLG = {
    yossi: () => ({
      a: {
        s: 'npc', t: 'סליחה, אין לי זמן! האוטובוס מגיע עוד שתי דקות ויש לי מבחן בסטטיסטיקה!',
        c: [
          { t: 'בהצלחה במבחן! תפילין לוקחות פחות זמן מהאוטובוס — אני אחזיק לך את התיק.', go: 'ok' },
          { t: 'אבל אתה חייב! זה ממש חשוב!', go: 'no' },
          { t: 'רוצה שנבקש יחד הצלחה במבחן? חמש דקות, ואתה עולה לאוטובוס.', go: 'ok2' },
        ],
      },
      ok: { s: 'npc', t: '...רגע, באמת? טוב — רק אם זה מהיר. זה המבחן הכי קשה שלי השנה.', end: 'tefillin' },
      ok2: { s: 'npc', t: 'יחד? אתה יודע מה... למה לא. יאללה, מהר!', end: 'tefillin' },
      no: { s: 'npc', t: 'אחי, אני באמת לא יכול עכשיו. אולי פעם אחרת.', fx: () => setOutcome('yossi', 'declined') },
    }),
    cohen: () => ({
      a: {
        s: 'npc', t: 'שלום שלום! תפילין, אה? תגיד לי, תמיד רציתי לשאול... למה דווקא על היד ועל הראש?',
        c: [
          { t: 'היד מול הלב — הרגש והמעשה. הראש — המחשבה. מחברים את הכול יחד.', go: 'b' },
          { t: 'ככה זה. לא צריך להבין הכול.', go: 'a2' },
        ],
      },
      a2: { s: 'npc', t: 'אני דווקא אוהב להבין לפני שאני עושה משהו. תנסה להסביר לי שוב?', go: 'a' },
      b: {
        s: 'npc', t: 'יפה! את זה אהבתי. ומה בעצם יש בתוך הקופסאות השחורות?',
        c: [
          { t: 'קלף, ועליו פרשיות מהתורה — ביניהן ״שמע ישראל״.', go: 'c' },
          { t: 'סוד מסחרי 😉', go: 'b2' },
        ],
      },
      b2: { s: 'npc', t: 'חה! אתה מצחיק. אבל ברצינות?', go: 'b' },
      c: {
        s: 'npc', t: '״שמע ישראל״... אבא שלי היה אומר את זה כל ערב. בוא, תניח לי. ואתה יודע מה? לשבת אני שולח לכם חלות.',
        end: 'tefillin', fx: () => (S.flags.cohenChallot = true),
      },
    }),
    daniel: () => {
      const m = S.mission;
      if (m.targets.daniel === 'later') {
        if (m.elapsed < m.laterAt) return { a: { s: 'npc', t: '(עדיין בטלפון) עוד רגע, אני כמעט מסיים... תן לי ' + Math.ceil(m.laterAt - m.elapsed) + ' שניות.' } };
        return {
          a: {
            s: 'npc', t: 'חזרת! רוב האנשים לא חוזרים, אתה יודע? טוב, הרווחת את זה. מה עושים?',
            c: [{ t: 'מניחים תפילין, אומרים ״שמע ישראל״, ומבקשים משהו טוב לעסקים ולמשפחה.', go: 'b' }],
          },
          b: { s: 'npc', t: 'לבקש משהו? זה בדיוק מה שאני צריך היום.', end: 'tefillin' },
        };
      }
      return {
        a: {
          s: 'npc', t: '(מדבר בטלפון) ...כן, כן, תשלח לי את החוזה. — סליחה, אני באמצע שיחה חשובה. תחזור אליי עוד דקה?',
          c: [
            { t: 'בטח. אני חוזר עוד מעט.', go: 'b', fx: () => setOutcome('daniel', 'later') },
            { t: 'זה ייקח רק חמש דקות, אני מבטיח!', go: 'c' },
          ],
        },
        b: { s: 'npc', t: 'מעולה. אני לא זז מפה.' },
        c: { s: 'npc', t: '(מצביע על הטלפון) באמת, רק דקה. אני לא בורח.', fx: () => setOutcome('daniel', 'later') },
      };
    },
    roi: () => {
      if (!S.flags.roiAttention)
        return { a: { s: 'narr', t: 'רועי מתופף על המשאבה, אוזניות על הראש. הוא לא שומע אותך בכלל. אולי צפירה מהטנק תעזור? (' + (isTouch ? 'כפתור צופר' : 'H') + ')' } };
      return {
        a: {
          s: 'npc', t: 'וואו, מה זה הטנק הזה עם הרמקול? הורדתי אוזניות בשבילך, אז שיהיה שווה!',
          c: [
            { t: 'בא לך להניח תפילין? חמש דקות, ואתה חוזר למוזיקה.', go: 'b' },
            { t: 'זה טנק מבצעים! יש בו ניגונים שאתה לא מכיר.', go: 'c' },
          ],
        },
        c: { s: 'npc', t: 'ניגונים? תכל׳ס, אני בעניין. אבל מה אתה בעצם עושה פה?', c: [{ t: 'מציע לאנשים להניח תפילין. רוצה?', go: 'b' }] },
        b: { s: 'npc', t: 'האמת? לא הנחתי מאז הבר מצווה. אני בכלל זוכר איך?', c: [{ t: 'אני אעזור לך בכל שלב.', go: 'd' }] },
        d: { s: 'npc', t: 'סגור. רק אל תספר לחבר׳ה שהתרגשתי.', end: 'tefillin' },
      };
    },
    ido: () => ({
      a: {
        s: 'npc', t: '(מתנשף) היי! אני באמצע ריצה, אסור לי לעצור — הדופק יורד!',
        c: [
          { t: 'מעולה, הלב כבר פועם חזק — זה בדיוק הזמן לחמש דקות של כוח רוחני!', go: 'b' },
          { t: 'אתה חייב לעצור עכשיו, זה חשוב!', go: 'c' },
          { t: 'ריצה טובה! אני כאן כל בוקר, אם תרצה.', go: 'd' },
        ],
      },
      b: { s: 'npc', t: '(צוחק) טיעון מנצח. יאללה, אבל מהר!', end: 'tefillin' },
      c: { s: 'npc', t: 'לא היום, אחי. אני חייב לסיים את הסיבוב.', fx: () => setOutcome('ido', 'declined') },
      d: { s: 'npc', t: 'תודה שלא לחצת. אולי מחר — באמת.', fx: () => { addCommunity(1); setOutcome('ido', 'declined'); } },
    }),
  };

  function dialogFor(n) {
    if (n.nodes) return n.nodes;
    const q = M && M.npcDialog(n);
    if (q) return q;
    if (n.id === 'moshe') return dlgMoshe();
    const m = S.mission, o = m.targets[n.id];
    if (!(n.id in m.targets)) return { a: { s: 'npc', t: 'שלום, שליח!' } };
    if (m.status === 'idle') return { a: { s: 'npc', t: IDLE[n.id], go: 'b' }, b: { s: 'narr', t: 'כדאי לדבר קודם עם משה, ליד הדלת של בית חב״ד.' } };
    if (o === 'accepted') return { a: { s: 'npc', t: AFTER_OK[n.id] } };
    if (o === 'declined') return { a: { s: 'npc', t: AFTER_NO[n.id] } };
    if (m.status === 'complete') return { a: { s: 'npc', t: 'נתראה בשכונה! אולי בפעם הבאה.' } };
    return DLG[n.id]();
  }

  let dlg = null, typeTimer = null;
  function talkTo(n) {
    if (!n.phone) {
      n.rot = n.rotT = Math.atan2(player.x - n.x, player.z - n.z);
      if (!drv) player.rot = Math.atan2(n.x - player.x, n.z - player.z);
    }
    dlg = { npc: n, nodes: dialogFor(n), cur: null, typing: false };
    mode = 'dialog';
    show(ui.dialog, true);
    A.click();
    showNode('a');
  }
  function showNode(id) {
    const n = dlg.nodes[id];
    dlg.cur = n;
    if (n.fx) n.fx();
    const npc = dlg.npc.def;
    ui.dName.textContent = n.s === 'narr' ? '' : npc.name + ' · ' + npc.role;
    ui.dName.classList.toggle('hidden', n.s === 'narr');
    ui.dialog.classList.toggle('narr', n.s === 'narr');
    if (G.voice) {
      const sp = n.s === 'narr' ? 'narr' : dlg.npc.id || dlg.npc.def.id;
      G.voice.speak(n.t, sp, dlg.npc.def.name, { queue: dlg.queueNext });
      dlg.queueNext = false;
    }
    ui.dChoices.innerHTML = '';
    if (n.c)
      n.c.forEach((ch, i) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.innerHTML = '<span class="num">' + (i + 1) + '</span>';
        b.appendChild(document.createTextNode(ch.t));
        b.tabIndex = -1;
        b.addEventListener('click', () => dialogChoose(i));
        b.addEventListener('mouseenter', () => setChoice(i));
        ui.dChoices.appendChild(b);
      });
    setChoice(0);
    ui.dChoices.classList.add('hidden');
    ui.dNext.classList.add('hidden');
    clearInterval(typeTimer);
    dlg.typing = true;
    let i = 0;
    const full = n.t;
    ui.dText.textContent = '';
    typeTimer = setInterval(() => {
      i += 2;
      ui.dText.textContent = full.slice(0, i);
      if (i >= full.length) finishTyping();
    }, 16);
  }
  function setChoice(i) {
    dlg.sel = i;
    const bs = ui.dChoices.children;
    for (let k = 0; k < bs.length; k++) bs[k].classList.toggle('sel', k === i);
  }
  function moveChoice(dir) {
    const n = dlg.cur.c.length;
    setChoice((dlg.sel + dir + n) % n);
    A.click();
  }
  function finishTyping() {
    clearInterval(typeTimer);
    dlg.typing = false;
    ui.dText.textContent = dlg.cur.t;
    if (dlg.cur.c) ui.dChoices.classList.remove('hidden');
    else ui.dNext.classList.remove('hidden');
  }
  function dialogAdvance() {
    if (!dlg) return;
    if (dlg.typing) return finishTyping();
    const n = dlg.cur;
    if (n.c) return;
    if (n.go) showNode(n.go);
    else closeDialog(n.end);
  }
  function dialogChoose(i) {
    if (!dlg) return;
    const n = dlg.cur;
    if (!n.c || !n.c[i]) return;
    if (dlg.typing) finishTyping();
    const ch = n.c[i];
    A.click();
    // השליח אומר את התשובה שבחר, והדמות עונה אחריו
    if (G.voice) {
      G.voice.speak(ch.t, 'player');
      dlg.queueNext = true;
    }
    if (ch.fx) ch.fx();
    if (!dlg) return;
    if (ch.go) showNode(ch.go);
    else closeDialog(ch.end);
  }
  function closeDialog(end) {
    clearInterval(typeTimer);
    show(ui.dialog, false);
    const npc = dlg && dlg.npc;
    dlg = null;
    mode = 'play';
    if (end === 'tefillin' && npc) startTefillin(npc);
    else if (typeof end === 'function') end();
  }
  ui.dNext.addEventListener('click', dialogAdvance);
  ui.dText.addEventListener('click', dialogAdvance);

  // ================= משימת התפילין =================
  function startMission() {
    const m = S.mission;
    m.status = 'active';
    m.timeLeft = 300;
    m.elapsed = 0;
    // מבצע תפילין רק באור יום: אם כבר מאוחר — מתחילים בבוקר חדש, והמשימה נגמרת בשקיעה
    if (S.time < 7 || S.time > 12) {
      S.time = 8;
      setTimeout(() => toast('☀ בוקר חדש בהוד השרון — יש זמן עד השקיעה'), 1500);
    }
    m.t0 = S.time;
    A.success();
    toast('המשימה התחילה: ״רק חמש דקות״!', 'gold');
    save();
  }
  function setOutcome(id, o) {
    const m = S.mission;
    if (m.status !== 'active') return;
    m.targets[id] = o;
    const name = npcById[id].def.name;
    if (o === 'declined') {
      addJoy(3);
      toast(name + ' — לא הפעם. אבל זרע נזרע. +3 שמחה');
      A.soft();
    } else if (o === 'later') {
      m.laterAt = m.elapsed + 35;
      toast(name + ' ביקש שתחזור אליו עוד מעט');
    }
    save();
    checkMissionDone();
  }

  let tf = null;
  function startTefillin(npc) {
    tf = { npc, wraps: 0, done: false };
    mode = 'tefillin';
    $('tf-title').textContent = 'מניחים תפילין עם ' + npc.def.name;
    $('tf-text').textContent = (isTouch ? 'הקישו על הכפתור' : 'לחצו E / Enter או הקישו על הכפתור') + ' כדי לכרוך את הרצועה על היד — 7 כריכות';
    const wr2 = $('tf-wraps');
    wr2.innerHTML = '';
    for (let i = 0; i < 7; i++) wr2.appendChild(document.createElement('span'));
    show($('tf-btn'), true);
    show($('tf-shema'), false);
    show($('tefillin'), true);
  }
  function wrapTefillin() {
    if (!tf || tf.done) return;
    tf.wraps++;
    A.wrap();
    const spans = $('tf-wraps').children;
    for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('on', i < tf.wraps);
    if (tf.wraps >= 7) {
      tf.done = true;
      show($('tf-btn'), false);
      show($('tf-shema'), true);
      A.success();
      setTimeout(() => {
        show($('tefillin'), false);
        const npc = tf.npc;
        tf = null;
        mode = 'play';
        acceptTefillin(npc);
      }, 2200);
    }
  }
  $('tf-btn').addEventListener('click', wrapTefillin);

  function acceptTefillin(n) {
    const m = S.mission;
    if (m.status !== 'active') return;
    m.targets[n.id] = 'accepted';
    addJoy(14);
    addCommunity(1);
    if (W.placeLights[n.id]) W.placeLights[n.id].visible = true;
    toast(n.def.name + ' הניח תפילין! +14 שמחה · הפינה שלו נדלקה באורות', 'gold');
    if (n.id === 'cohen' && S.flags.cohenChallot) setTimeout(() => toast('מר כהן ישלח חלות לשבת 🍞'), 900);
    save();
    checkMissionDone();
  }
  function checkMissionDone() {
    const m = S.mission;
    if (m.status !== 'active') return;
    if (TARGET_IDS.every((id) => m.targets[id] === 'accepted' || m.targets[id] === 'declined')) completeMission('done');
  }
  let pendingResults = false;
  function completeMission(reason) {
    const m = S.mission;
    if (m.status !== 'active') return;
    m.status = 'complete';
    m.endReason = reason;
    m.usedTime = 300 - Math.max(0, m.timeLeft);
    addJoy(10);
    spawnExtraWalkers();
    save();
    setTimeout(() => (pendingResults = true), reason === 'time' ? 200 : 1400);
  }
  function showResults() {
    pendingResults = false;
    S.flags.resultsSeen = true;
    mode = 'results';
    const m = S.mission, t = m.targets;
    const acc = TARGET_IDS.filter((id) => t[id] === 'accepted').length;
    const dec = TARGET_IDS.filter((id) => t[id] === 'declined').length;
    const later = TARGET_IDS.filter((id) => t[id] === 'later').length;
    const met = acc + dec + later;
    const stars = acc >= 5 ? 3 : acc >= 3 ? 2 : 1;
    $('res-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('res-title').textContent = m.endReason === 'time' ? 'השמש שקעה — אבל השכונה כבר מרגישה אחרת' : 'המשימה הושלמה!';
    const rows = [
      ['פגשתם', met + ' מתוך 5'],
      ['הניחו תפילין', acc],
      ['זמן', fmtTime(m.usedTime)],
      ['שמחה ושליחות', '+' + m.joyGained],
      ['קשרים חדשים', '+' + m.communityGained],
    ];
    const ch = [];
    if (acc) ch.push(acc + ' פינות בעיר נדלקו באורות צבעוניים');
    ch.push('יותר אנשים יוצאים לרחובות');
    ch.push('בית חב״ד מוכן לשדרוג — היכנסו בדלת');
    if (S.flags.cohenChallot && t.cohen === 'accepted') ch.push('מר כהן ישלח חלות לשבת');
    if (t.daniel === 'accepted') ch.push('דניאל רוצה לעזור במימון אירוע עתידי');
    if (t.yossi === 'accepted') ch.push('יוסי הסטודנט שוקל להתנדב');
    showResultsData({ stars, title: $('res-title').textContent, rows, changes: ch });
  }
  // מסך תוצאות כללי — משמש גם את המשימות הנוספות
  let resultsData = null, queuedResults = null;
  function showResultsData(d) {
    resultsData = d;
    mode = 'results';
    $('res-stars').textContent = d.stars === undefined ? '♥' : '★'.repeat(d.stars) + '☆'.repeat(3 - d.stars);
    $('res-title').textContent = d.title;
    $('res-stats').innerHTML = (d.rows || []).map(([k, v]) => '<li><span>' + k + '</span><b>' + v + '</b></li>').join('');
    $('res-changes').innerHTML = (d.changes || []).map((c) => '<li>' + c + '</li>').join('');
    show($('res-note'), !!d.note);
    $('res-note').textContent = d.note || '';
    show($('results'), true);
    A.success();
  }
  function queueResults(d, delay) {
    setTimeout(() => (queuedResults = d), delay === undefined ? 1200 : delay);
  }
  function closeResults() {
    show($('results'), false);
    mode = 'play';
    const d = resultsData;
    resultsData = null;
    if (d && d.onClose) d.onClose();
  }
  $('res-continue').addEventListener('click', closeResults);
  $('res-restart').addEventListener('click', () => openConfirm());

  // ================= בית חב״ד =================
  const LEVELS = [
    { name: 'החדר השכור', desc: 'שולחן, כיסאות, ארון ספרים וטנק מבצעים ישן. מכאן מתחילים.' },
    { name: 'בית חב״ד פעיל', desc: 'מטבח, שולחן שבת ושלט מואר. אפשר לארח מתנדבים ולנהל אירועים קטנים.' },
    { name: 'מרכז קהילתי', desc: 'אולם אירועים, בית כנסת, מחסן ציוד ומשרד לשליח נוסף.' },
    { name: 'מרכז השליחות הגדול', desc: 'מבנה מרשים בהשראת 770, אירועים המוניים וצוות גדול.' },
  ];
  function openPanel() {
    mode = 'panel';
    renderPanel();
    show($('panel'), true);
    A.click();
  }
  function renderPanel() {
    const nextLv = S.chabadLevel + 1;
    const canUp = (nextLv === 2 && S.mission.status === 'complete') || (nextLv === 3 && M.canUpgrade(3)) || (nextLv === 4 && M.canUpgrade(4));
    const lockText = { 2: 'נפתח אחרי השלמת משימה 1', 3: 'נפתח אחרי משימה 4, ״האור הגדול״', 4: 'נפתח אחרי פרק 2 בפתח תקווה' };
    let h = '<div class="pn-stats"><div><b>' + Math.round(S.joy) + '</b><span>שמחה ושליחות</span></div><div><b>' + S.community + '</b><span>קשרים בקהילה</span></div><div><b>' + S.volunteers + '</b><span>מתנדבים</span></div></div><ol class="levels">';
    LEVELS.forEach((L, i) => {
      const n = i + 1;
      let st, cls;
      if (n < S.chabadLevel) { st = '✓ הושלם'; cls = 'done'; }
      else if (n === S.chabadLevel) { st = 'הדרגה הנוכחית'; cls = 'current'; }
      else if (n === nextLv && lockText[n]) { st = canUp ? '' : lockText[n]; cls = canUp ? 'next' : 'locked'; }
      else { st = '🔒 בהמשך'; cls = 'locked'; }
      h += '<li class="' + cls + '"><div class="lv-head"><span class="lv-n">' + n + '</span><b>' + L.name + '</b><em>' + st + '</em></div><p>' + L.desc + '</p>';
      if (n === nextLv && canUp) h += '<button id="btn-upgrade" class="btn big">שדרגו ל' + L.name + '</button>';
      h += '</li>';
    });
    $('panel-body').innerHTML = h + '</ol>';
    const b = $('btn-upgrade');
    if (b) b.addEventListener('click', upgradeChabad);
  }
  function upgradeChabad() {
    if (S.chabadLevel === 3 && M.canUpgrade(4)) {
      S.chabadLevel = 4;
      W.setChabadLevel(4);
      addJoy(15);
      A.success();
      A.cheer && A.cheer();
      toast('🏛 מרכז השליחות הגדול! חזית בהשראת 770 — הבית של כל השלוחים', 'gold');
      save();
      renderPanel();
      return;
    }
    if (S.chabadLevel === 2 && M.canUpgrade(3)) {
      S.chabadLevel = 3;
      W.setChabadLevel(3);
      addJoy(8);
      A.success();
      toast('בית חב״ד הפך למרכז קהילתי! קומה חדשה ואולם לאירועים', 'gold');
      save();
      renderPanel();
      return;
    }
    if (S.chabadLevel !== 1 || S.mission.status !== 'complete') return;
    S.chabadLevel = 2;
    W.setChabadLevel(2);
    addJoy(6);
    A.success();
    toast('בית חב״ד שודרג! יש מטבח, שולחן שבת ושלט מואר', 'gold');
    if (S.mission.targets.yossi === 'accepted') {
      S.volunteers++;
      setTimeout(() => toast('יוסי הסטודנט הצטרף כמתנדב! 🙋', 'gold'), 1200);
    }
    save();
    renderPanel();
  }
  function closePanel() {
    show($('panel'), false);
    mode = 'play';
  }
  $('panel-close').addEventListener('click', closePanel);
  // ================= יומן השליחות: כל ההתקדמות במקום אחד =================
  function journalHTML() {
    const Q = S.quests || {};
    const stOf = (id) => (Q[id] && Q[id].status) || 'locked';
    const MARK = { complete: ['✓', 'ok'], active: ['▶ עכשיו', 'later'], failed: ['↺ שוב', 'later'], idle: ['מחכה', ''], calling: ['מחכה', ''], locked: ['🔒', 'no'] };
    const row = (label, s, secret) => {
      const m = MARK[s] || MARK.locked;
      const name = secret && s === 'locked' ? '✦ משימה סודית ???' : label;
      return '<li class="' + m[1] + '"><span>' + name + '</span><em>' + m[0] + '</em></li>';
    };
    const pages = (c, n) => ((S.collect && S.collect[c]) || []).length + '/' + n;
    let h = '<div class="pn-stats"><div><b>' + Math.round(S.joy) + '</b><span>שמחה ושליחות</span></div><div><b>' + S.community + '</b><span>קשרים בקהילה</span></div><div><b>' + S.volunteers + '</b><span>מתנדבים</span></div></div>';
    h += '<h3 class="jr-h">פרק 1 · הוד השרון</h3><ul class="jr-list">';
    h += row('משימה 1 · ״רק חמש דקות״', S.mission.status === 'complete' ? 'complete' : S.mission.status === 'active' ? 'active' : 'idle');
    h += row('משימה 2 · ״איפה המניין?״', stOf('m2')) + row('משימה 3 · ״בלי קבלה״', stOf('m3')) + row('משימה 4 · ״האור הגדול״', stOf('m4'));
    h += row('✦ ״השליח שלא מוותר״', stOf('secret'), true);
    h += '<li><span>📜 דפי תניא</span><em>' + pages('hod', 12) + '</em></li>';
    h += '<li><span>🏠 בית חב״ד</span><em>' + LEVELS[Math.min(LEVELS.length, S.chabadLevel) - 1].name + '</em></li></ul>';
    const ptOpen = S.flags.ptUnlocked || CITY === 'pt';
    h += '<h3 class="jr-h">פרק 2 · פתח תקווה</h3>';
    if (!ptOpen) h += '<p class="jr-lock">🔒 נפתח אחרי שמסיימים את הוד השרון</p>';
    else {
      h += '<ul class="jr-list">';
      h += row('משימה 1 · ״שוק של ברכות״', stOf('pt1') === 'locked' ? 'idle' : stOf('pt1')) + row('משימה 2 · ״ביקור חולים״', stOf('pt2')) + row('משימה 3 · ״לשמח את העיר״', stOf('ptB')) + row('משימה 4 · ״ספר תורה לבית הכנסת הגדול״', stOf('pt3'));
      h += row('✦ ״הנכד של המייסדים״', stOf('ptS'), true);
      h += '<li><span>📜 דפי תניא</span><em>' + pages('pt', 18) + '</em></li></ul>';
    }
    return h;
  }
  function openJournal() {
    show($('pause'), false);
    $('journal-body').innerHTML = journalHTML();
    show($('journal'), true);
    mode = 'journal';
    A.click();
  }
  function closeJournal() {
    show($('journal'), false);
    show($('pause'), true);
    mode = 'paused';
  }
  $('p-journal').addEventListener('click', openJournal);
  $('journal-close').addEventListener('click', closeJournal);

  // ================= השהיה, הגדרות, התחלה מחדש =================
  function refreshSettingsLabels() {
    $('p-sound').textContent = 'צליל: ' + (S.settings.sound ? 'פועל' : 'כבוי');
    $('p-shadows').textContent = 'גרפיקה: ' + (S.settings.shadows ? 'מלאה' : 'חסכונית');
    $('p-look').textContent = 'מראה: ' + (G.SMOOTH ? 'חלק (חדש)' : 'פיקסלים');
    $('p-voice').textContent = 'קולות דמויות: ' + (S.settings.voice !== false ? 'פועלים' : 'כבויים');
    if (G.voice) {
      G.voice.enabled = S.settings.voice !== false && S.settings.sound;
      if (!G.voice.enabled) G.voice.stop();
    }
  }
  function pauseGame() {
    if (G.voice) G.voice.stop();
    $('p-travel').textContent = CITY === 'pt' ? '🚐 חזרה להוד השרון' : '🚐 נסיעה לפתח תקווה';
    show($('p-travel'), !!S.flags.ptUnlocked || CITY === 'pt');
    mode = 'paused';
    refreshSettingsLabels();
    show($('pause'), true);
    A.setEngine(false, 0);
    A.setRadioVolume(0);
    if (S.radio === A.KOL) A.kol(false);
    save();
  }
  function resumeGame() {
    show($('pause'), false);
    mode = 'play';
    if (drv && S.radio === A.KOL) A.kol(true);
  }
  $('p-resume').addEventListener('click', resumeGame);
  // גיבוי ושחזור של השמירה (קובץ) — גם כדי להעביר התקדמות בין מחשב לטלפון
  $('p-backup').addEventListener('click', () => {
    save();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
    a.download = 'shluchim-save-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('💾 קובץ הגיבוי ירד. אפשר לשחזר אותו גם במכשיר אחר', 'gold');
  });
  const restoreIn = document.createElement('input');
  restoreIn.type = 'file';
  restoreIn.accept = '.json,application/json';
  restoreIn.addEventListener('change', () => {
    const file = restoreIn.files && restoreIn.files[0];
    restoreIn.value = '';
    if (!file) return;
    file.text().then((txt) => {
      const d = JSON.parse(txt);
      if (!d || d.v !== 1 || !d.mission) throw new Error('bad save');
      resetting = true;
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
      toast('📂 השמירה שוחזרה — טוען מחדש...', 'gold');
      setTimeout(() => location.replace(location.pathname + location.hash), 900);
    }).catch(() => toast('הקובץ הזה לא נראה כמו שמירה של המשחק'));
  });
  $('p-restore').addEventListener('click', () => restoreIn.click());
  $('p-unstick').addEventListener('click', () => {
    const ps = SPOT.playerStart || { x: -12, z: -6.6, rot: 0 }, vs = SPOT.vanStart || { x: -12, z: -2, h: 0 };
    if (drv) {
      drv.x = vs.x;
      drv.z = vs.z;
      drv.h = vs.h;
      drv.v = 0;
      drv.blocked = 0;
      tp.yaw = drv.h;
    } else {
      player.x = ps.x;
      player.z = ps.z;
      player.rot = ps.rot || 0;
      tp.yaw = player.rot;
    }
    resumeGame();
    toast('חזרתם לבית חב״ד 🏠', 'gold');
  });
  $('p-sound').addEventListener('click', () => {
    S.settings.sound = !S.settings.sound;
    A.setEnabled(S.settings.sound);
    refreshSettingsLabels();
    save();
  });
  // החלפת מראה: הטקסטורות נבנות בטעינה, אז טוענים מחדש
  $('p-look').addEventListener('click', () => {
    S.settings.look = G.SMOOTH ? 'pixel' : 'smooth';
    save();
    resetting = true;
    toast('טוען מחדש במראה ' + (G.SMOOTH ? 'פיקסלים' : 'חלק') + '...', 'gold');
    setTimeout(() => location.reload(), 500);
  });
  $('p-voice').addEventListener('click', () => {
    S.settings.voice = S.settings.voice === false;
    refreshSettingsLabels();
    save();
    if (S.settings.voice && G.voice) G.voice.speak('שלום, שליח!', 'moshe');
  });
  $('p-shadows').addEventListener('click', () => {
    S.settings.shadows = !S.settings.shadows;
    sun.castShadow = S.settings.shadows;
    refreshSettingsLabels();
    save();
  });
  $('p-restart').addEventListener('click', () => openConfirm());
  function openConfirm() {
    prevMode = mode;
    mode = 'confirm';
    show($('confirm'), true);
  }
  function closeConfirm() {
    show($('confirm'), false);
    mode = prevMode;
  }
  $('c-no').addEventListener('click', closeConfirm);
  $('c-yes').addEventListener('click', () => {
    resetting = true;
    try {
      localStorage.removeItem(SAVE_KEY);
      sessionStorage.setItem('shluchim-autoplay', '1');
    } catch (e) {}
    location.reload();
  });

  // ================= מסך פתיחה =================
  // העיר נבנתה — הכפתור (שהציג ״טוען״) מוכן ללחיצה
  $('btn-play').disabled = false;
  $('btn-play').textContent = saved ? 'המשך מהשמירה' : 'שחקו';
  if (saved) show($('btn-new'), true);
  $('btn-play').addEventListener('click', () => {
    initAudioOnce();
    startPlay();
  });
  $('btn-new').addEventListener('click', () => openConfirm());
  function startPlay() {
    mode = 'play';
    if (S.flags.justTraveled) {
      const to = S.flags.justTraveled;
      S.flags.justTraveled = null;
      setTimeout(() => toast(to === 'pt' ? '🚐 ברוכים הבאים לפתח תקווה! ר׳ מנחם מחכה ליד בית חב״ד' : '🚐 חזרתם להוד השרון — משה שמח לראות אתכם', 'gold'), 800);
    }
    show(ui.title, false);
    show(ui.hud, true);
    show(ui.touch, isTouch);
    document.body.classList.add('playing');
    camTarget.set(player.x, 0, player.z);
    if (isTouch) {
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      } catch (e) {}
    }
    if (!S.flags.introShown) {
      S.flags.introShown = true;
      toast('ברוכים הבאים לשכונה! משה, המתנדב הוותיק, מחכה לכם ליד בית חב״ד', 'gold');
      setTimeout(() => toast(isTouch ? 'ג׳ויסטיק משמאל לתנועה · כפתור הפעולה מימין' : 'WASD לתנועה · E או Enter לדבר עם אנשים'), 1500);
    }
  }

  // ================= החלת מצב שמור =================
  sun.castShadow = S.settings.shadows;
  W.setChabadLevel(S.chabadLevel);
  for (const id of TARGET_IDS) if (S.mission.targets[id] === 'accepted' && W.placeLights[id]) W.placeLights[id].visible = true;
  if (S.mission.status === 'complete') spawnExtraWalkers();
  if (S.mission.status === 'complete' && !S.flags.resultsSeen && CITY !== 'pt') pendingResults = true;
  player.p.group.visible = !drv || !drv.P.hide;
  if (drv) {
    player.x = drv.x;
    player.z = drv.z;
  }
  M = (CITY === 'pt' && G.makeMissionsPT ? G.makeMissionsPT : G.makeMissions)({
    get S() { return S; },
    get mode() { return mode; },
    scene, W, A, player, van, npcs, npcById, walkers, camTarget, isTouch, ACT,
    addNPC, toast, addJoy, addCommunity, save, fmtTime, spawnExtraWalkers, showRadioLabel,
    say: (n) => talkTo(n),
    results: queueResults,
    travel: (c) => travel(c),
    events: () => EV,
    get drv() { return drv; },
    setRadio(i) {
      S.radio = i;
      A.setStation(i);
      showRadioLabel('♪ ' + A.stationName(i));
    },
  });
  TR = G.makeTraffic ? G.makeTraffic({ scene, W, A, player }) : null;
  // משימת פסח (אחרי פרק 2, בשתי הערים) — מתחברת למנהל המשימות של העיר
  const PS = G.makePesach ? G.makePesach({ scene, W, A, player, van, npcById, isTouch, get S() { return S; }, toast, addJoy, addCommunity, save, results: queueResults, say: (n) => talkTo(n) }) : null;
  if (PS) M = G.combineMissions(M, PS);
  EV = G.makeEvents ? G.makeEvents({ scene, W, A, player, van, addNPC, toast, addJoy, addCommunity, save, isTouch, addVehicle, removeVehicle, enterVehicle, exitVehicle, get drv() { return drv; }, get S() { return S; }, radioLabel: (t) => showRadioLabel(t), say: (n) => talkTo(n), trafficObstacles: () => { const o = []; if (TR) TR.obstacles(o); return o; } }) : null;
  // מאפיית המצות (משחק מיומנות ליד המטבח של בית חב״ד)
  const MZ = G.makeMatzah ? G.makeMatzah({ scene, W, A, isTouch, get S() { return S; }, toast, addJoy, addCommunity, save, onClose: () => { mode = 'play'; }, onResult: (n, quit) => PS && PS.onBake(n, quit) }) : null;
  // דפי תניא נסתרים בעיר
  const CL = G.makeCollectibles ? G.makeCollectibles({ scene, W, A, player, get S() { return S; }, toast, addJoy, addCommunity, save }) : null;
  resize();

  // ================= מיני־מפה =================
  // מפה עגולה שמסתובבת עם המצלמה (כמו במשחקי עולם פתוח); המפה הסטטית בקואורדינטות עולם
  const mm = $('minimap'), mmx = mm.getContext('2d'), MM = mm.width;
  // עיר גדולה: המפה נבנית לאזור של 1.4 ק״מ סביב השחקן (חדה), ומתחדשת כשמתרחקים
  const MEXT = W.mapExtent || 85, BIGMAP = !!W.drawMap && MEXT > 900, RG = 700;
  const MPX = W.drawMap ? (BIGMAP ? 1.2 : Math.min(1.2, 4096 / (2 * MEXT))) : 3;
  let mmCx = 0, mmCz = 0;
  let MVIEW = 52;
  let mmStatic = null, mmScale = 1;
  function buildMinimapStatic() {
    if (W.drawMap) {
      const c = document.createElement('canvas');
      c.width = c.height = Math.round(2 * (BIGMAP ? RG : MEXT) * MPX);
      const g2 = c.getContext('2d');
      if (BIGMAP) {
        mmCx = drv ? drv.x : player.x;
        mmCz = drv ? drv.z : player.z;
        g2.translate(-(mmCx - RG + MEXT) * MPX, -(mmCz - RG + MEXT) * MPX);
      }
      W.drawMap(g2, MPX, MEXT, BIGMAP ? { x1: mmCx - RG - 20, z1: mmCz - RG - 20, x2: mmCx + RG + 20, z2: mmCz + RG + 20 } : null);
      mmStatic = c;
      W.mapDirty = false;
      return;
    }
    const c = document.createElement('canvas');
    c.width = c.height = 170 * MPX;
    const g = c.getContext('2d');
    const R = (x1, z1, x2, z2, col) => {
      g.fillStyle = col;
      g.fillRect((x1 + 85) * MPX, (z1 + 85) * MPX, (x2 - x1) * MPX, (z2 - z1) * MPX);
    };
    R(-85, -85, 85, 85, '#5f7d47');
    R(-79, -79, 79, 79, '#b9b3a6');
    for (const b of W.mapBlocks) R(b.cx - 12, b.cz - 12, b.cx + 12, b.cz + 12, b.color);
    for (const r of W.ROADS) {
      R(-78, r - 4, 78, r + 4, '#41454c');
      R(r - 4, -78, r + 4, 78, '#41454c');
    }
    g.strokeStyle = 'rgba(240,210,100,0.55)';
    g.setLineDash([6, 6]);
    g.lineWidth = 1;
    for (const r of W.ROADS) {
      g.beginPath();
      g.moveTo(7 * MPX, (r + 85) * MPX);
      g.lineTo(163 * MPX, (r + 85) * MPX);
      g.moveTo((r + 85) * MPX, 7 * MPX);
      g.lineTo((r + 85) * MPX, 163 * MPX);
      g.stroke();
    }
    g.setLineDash([]);
    for (const r of W.mapRects) {
      R(r.x1, r.z1, r.x2, r.z2, r.color);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.strokeRect((r.x1 + 85) * MPX, (r.z1 + 85) * MPX, (r.x2 - r.x1) * MPX, (r.z2 - r.z1) * MPX);
    }
    for (const c2 of W.mapCircles) {
      g.fillStyle = c2.color;
      g.beginPath();
      g.arc((c2.x + 85) * MPX, (c2.z + 85) * MPX, c2.r * MPX, 0, Math.PI * 2);
      g.fill();
    }
    mmStatic = c;
    W.mapDirty = false;
  }
  // נקודה על המפה: מיקום בעולם, גודל קבוע בפיקסלים
  function dot(x, z, r, fill, stroke) {
    mmx.beginPath();
    mmx.arc(x, z, r / mmScale, 0, Math.PI * 2);
    mmx.fillStyle = fill;
    mmx.fill();
    if (stroke) {
      mmx.lineWidth = 1.5 / mmScale;
      mmx.strokeStyle = stroke;
      mmx.stroke();
    }
  }
  function drawMinimap() {
    if (!mmStatic || W.mapDirty || (BIGMAP && Math.hypot((drv ? drv.x : player.x) - mmCx, (drv ? drv.z : player.z) - mmCz) > 380)) buildMinimapStatic();
    const C = MM / 2, R = C - 2;
    if (W.city) MVIEW = G.lerp(MVIEW, drv ? (drv.type === 'bike' ? 110 : 170) : 95, 0.08);
    mmScale = R / MVIEW;
    const ux = isThird() ? Math.sin(tp.yaw) : -SQ, uz = isThird() ? Math.cos(tp.yaw) : -SQ;
    const th = -Math.PI / 2 - Math.atan2(uz, ux);
    const px = drv ? drv.x : player.x, pz = drv ? drv.z : player.z;
    mmx.clearRect(0, 0, MM, MM);
    mmx.save();
    mmx.beginPath();
    mmx.arc(C, C, R, 0, Math.PI * 2);
    mmx.clip();
    mmx.fillStyle = '#5f7d47';
    mmx.fillRect(0, 0, MM, MM);
    mmx.translate(C, C);
    mmx.rotate(th);
    mmx.scale(mmScale, mmScale);
    mmx.translate(-px, -pz);
    mmx.imageSmoothingEnabled = false;
    if (BIGMAP) mmx.drawImage(mmStatic, mmCx - RG, mmCz - RG, 2 * RG, 2 * RG);
    else mmx.drawImage(mmStatic, -MEXT, -MEXT, 2 * MEXT, 2 * MEXT);
    // מסלול ה-GPS: קו צבעוני לאורך הרחובות, עם שוליים כהים כמו ב-GTA
    if (gps.route && gps.route.length > 1) {
      mmx.lineJoin = mmx.lineCap = 'round';
      for (const [w, col] of [[9, 'rgba(10,14,30,0.55)'], [5.5, gps.color]]) {
        mmx.strokeStyle = col;
        mmx.lineWidth = w / mmScale;
        mmx.beginPath();
        mmx.moveTo(gps.route[0][0], gps.route[0][1]);
        for (let i = 1; i < gps.route.length; i++) mmx.lineTo(gps.route[i][0], gps.route[i][1]);
        mmx.stroke();
      }
    }
    M.mapDots(dot);
    if (EV) EV.mapDots(dot);
    for (const n of npcs) {
      const k = n.iconKind;
      if (!k || n.hidden) continue;
      const col = { alert: '#ff8c42', music: '#b07cff', wait: '#9aa3b5', ok: '#3ecf72', mission: '#3b6fd8', hint: '#dfe7f5', star: '#ffd23f' }[k];
      dot(n.x, n.z, k === 'ok' ? 3.5 : 5, col, '#13213f');
    }
    mmx.restore();
    // סמלים שנשארים על שפת המפה גם כשהם רחוקים: בית חב״ד, הטנק והיעד
    const rim = (x, z, draw) => {
      const dx = (x - px) * mmScale, dz = (z - pz) * mmScale;
      let sx = dx * Math.cos(th) - dz * Math.sin(th), sy = dx * Math.sin(th) + dz * Math.cos(th);
      const d = Math.hypot(sx, sy), lim = R - 13;
      if (d > lim) {
        sx *= lim / d;
        sy *= lim / d;
      }
      draw(C + sx, C + sy, d > lim);
    };
    const badge = (x, y, bg, fg, ch, ring) => {
      mmx.beginPath();
      mmx.arc(x, y, 10, 0, Math.PI * 2);
      mmx.fillStyle = bg;
      mmx.fill();
      mmx.lineWidth = 2;
      mmx.strokeStyle = ring;
      mmx.stroke();
      mmx.fillStyle = fg;
      mmx.font = 'bold 12px Arial, "Segoe UI Emoji", sans-serif';
      mmx.textAlign = 'center';
      mmx.textBaseline = 'middle';
      mmx.fillText(ch, x, y + 1);
    };
    const home = W.places.chabadDoor || { x: -12, z: -7 };
    rim(home.x, home.z, (x, y) => badge(x, y, '#1b3a8a', '#ffd23f', 'ח', '#ffd23f'));
    if (drv !== van) rim(van.x, van.z, (x, y, edge) => badge(x, y, '#ffffff', '#1b3a8a', '🚐', edge ? '#ffd23f' : '#13213f'));
    const dest = gpsTarget();
    if (dest) rim(dest.x, dest.z, (x, y, edge) => {
      if (!edge) return;
      badge(x, y, gps.color, '#13213f', '◆', '#ffffff');
    });
    // החץ של השחקן — במרכז, מכוון לפי הכיוון שלו
    const hx = drv ? Math.sin(drv.h) : Math.sin(player.rot), hz = drv ? Math.cos(drv.h) : Math.cos(player.rot);
    const ang = Math.atan2(hz, hx) + th;
    mmx.save();
    mmx.translate(C, C);
    mmx.rotate(ang);
    mmx.beginPath();
    mmx.moveTo(10, 0);
    mmx.lineTo(-7, -7);
    mmx.lineTo(-3, 0);
    mmx.lineTo(-7, 7);
    mmx.closePath();
    mmx.fillStyle = '#ffffff';
    mmx.strokeStyle = '#13213f';
    mmx.lineWidth = 2;
    mmx.fill();
    mmx.stroke();
    mmx.restore();
    // סימן צפון על המסגרת
    const na = th - Math.PI / 2, nx = C + Math.cos(na) * (R - 12), ny = C + Math.sin(na) * (R - 12);
    mmx.beginPath();
    mmx.arc(nx, ny, 9, 0, Math.PI * 2);
    mmx.fillStyle = '#13213f';
    mmx.fill();
    mmx.fillStyle = '#fff';
    mmx.font = 'bold 11px Arial';
    mmx.textAlign = 'center';
    mmx.textBaseline = 'middle';
    mmx.fillText('N', nx, ny + 1);
  }

  // ================= HUD =================
  function iconFor(n) {
    if (n.evIcon !== undefined) return n.evIcon;
    const m = S.mission;
    if (n.id === 'moshe') {
      if (CITY === 'pt') return M.mosheIcon();
      if (m.status === 'idle') return 'mission';
      if (m.status === 'active') return 'hint';
      return S.chabadLevel < 2 ? 'star' : M.mosheIcon();
    }
    if (m.status !== 'active' || CITY === 'pt') return M.iconFor(n);
    const o = m.targets[n.id];
    if (o === 'accepted') return 'ok';
    if (o === 'declined') return null;
    if (o === 'later') return m.elapsed >= m.laterAt ? 'alert' : 'wait';
    if (n.id === 'roi' && !S.flags.roiAttention) return 'music';
    return 'alert';
  }
  function trackerHTML() {
    if (CITY === 'pt') return M.trackerHTML();
    const m = S.mission;
    let h = '<div class="tr-title">משימה 1 · ״רק חמש דקות״</div>';
    if (m.status === 'idle') return h + '<div class="tr-obj">דברו עם <b>משה</b> ליד בית חב״ד <span class="ic blue">!</span></div>';
    if (m.status === 'active') {
      const tl = Math.max(0, m.timeLeft);
      h += '<div class="tr-timer' + (tl < 60 ? ' low' : '') + '">⏱ ' + fmtTime(tl) + '</div><div class="tr-obj">הציעו לחמישה אנשים להניח תפילין</div><ul class="tr-list">';
      for (const id of TARGET_IDS) {
        const n = npcById[id], o = m.targets[id];
        let st = 'ממתין', cls = '';
        if (o === 'accepted') { st = '✓ הניח'; cls = 'ok'; }
        else if (o === 'declined') { st = 'לא הפעם'; cls = 'no'; }
        else if (o === 'later') { st = m.elapsed >= m.laterAt ? 'אפשר לחזור!' : 'ביקש לחזור · ' + Math.ceil(m.laterAt - m.elapsed); cls = 'later'; }
        else if (id === 'roi' && !S.flags.roiAttention) st = 'עם אוזניות 🎧';
        h += '<li class="' + cls + '"><span>' + n.def.name + ' <small>' + n.def.role + '</small></span><em>' + st + '</em></li>';
      }
      return h + '</ul>';
    }
    if (S.chabadLevel < 2) return '<div class="tr-title done">✓ משימה 1 הושלמה</div><div class="tr-obj">היכנסו לבית חב״ד ושדרגו אותו <span class="ic">★</span></div>';
    return M.trackerHTML();
  }
  // ---------- שלט רחוב (מופיע כשעוברים לרחוב או מקום חדש) ----------
  const ROAD_X = [['רחוב הים', 'HaYam St'], ['רחוב הרצל', 'Herzl St'], ['שדרות רוטשילד', 'Rothschild Blvd'], ['רחוב אלנבי', 'Allenby St'], ['דרך השלום', 'Derech HaShalom']];
  const ROAD_Z = [['רחוב ביאליק', 'Bialik St'], ['רחוב בן יהודה', 'Ben Yehuda St'], ['רחוב שינקין', 'Sheinkin St'], ['רחוב דיזנגוף', 'Dizengoff St'], ['רחוב הרב קוק', 'HaRav Kook St']];
  const PLACES = [
    [-18, -18, 'בית חב״ד', 'Chabad House'], [18, 18, 'כיכר העיר', 'City Square'], [54, 54, 'פארק העיר', 'City Park'],
    [54, -54, 'תחנת הדלק', 'Gas Station'], [-54, 18, 'מעונות הסטודנטים', 'Student Dorms'], [18, -18, 'מכולת כהן', 'Cohen Grocery'],
  ];
  let streetT = 0, streetKey = '', streetShow = 0;
  function locationName() {
    const x = drv ? drv.x : player.x, z = drv ? drv.z : player.z;
    if (W.locationName) return W.locationName(x, z);
    for (const p of PLACES) if (Math.abs(x - p[0]) < 12.5 && Math.abs(z - p[1]) < 12.5) return [p[2], p[3]];
    let best = 1e9, nm = null;
    W.ROADS.forEach((r, i) => {
      if (Math.abs(x - r) < best) { best = Math.abs(x - r); nm = ROAD_X[i]; }
      if (Math.abs(z - r) < best) { best = Math.abs(z - r); nm = ROAD_Z[i]; }
    });
    return nm;
  }
  function updateStreetSign() {
    streetT -= 1 / 60;
    streetShow -= 1 / 60;
    if (streetT <= 0) {
      streetT = 0.4;
      const nm = locationName();
      if (nm && nm[0] !== streetKey) {
        streetKey = nm[0];
        $('st-he').textContent = nm[0];
        $('st-en').textContent = nm[1];
        streetShow = 5;
      }
    }
    $('street-sign').classList.toggle('on', streetShow > 0);
  }
  $('fs-btn').addEventListener('click', () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) {}
  });
  $('cam-btn').addEventListener('click', () => toggleCam());

  function periodName(h) {
    if (h >= 5 && h < 12) return 'בוקר';
    if (h >= 12 && h < 16) return 'צהריים';
    if (h >= 16 && h < 18.5) return 'אחר הצהריים';
    if (h >= 18.5 && h < 21) return 'ערב';
    return 'לילה';
  }
  function updateHUD() {
    ui.joyFill.style.width = S.joy + '%';
    setText(ui.joyVal, String(Math.round(S.joy)));
    setHTML(ui.stats, '<span>🤝 <b>' + S.community + '</b></span><span>🙋 <b>' + S.volunteers + '</b></span><span>🏠 <b>' + S.chabadLevel + '</b></span>' + (CL ? '<span title="דפי תניא נסתרים">📜 <b>' + CL.found + '/' + CL.total + '</b></span>' : ''));
    setHTML(ui.tracker, trackerHTML());
    const hh = Math.floor(S.time), mi = Math.floor((S.time - hh) * 60);
    setHTML(ui.clock, String(hh).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + '<small>' + periodName(S.time) + '</small>');
    setText($('badge-ic'), drv ? drv.P.icon : '🚶');
    document.body.classList.toggle('in-van', !!drv);
    document.body.classList.toggle('dialog-open', mode !== 'play');
    const third = isThird();
    setText(
      ui.keys,
      drv
        ? 'W גז  ·  S / רווח בלם ורוורס  ·  A/D היגוי  ·  H צופר  ·  R רדיו  ·  N שיר הבא  ·  E יציאה'
        : 'WASD תנועה  ·  ' + (third ? 'עכבר מבט  ·  ' : '') + 'Shift ריצה  ·  רווח קפיצה  ·  E פעולה  ·  B/T ניווט  ·  V מצלמה  ·  Esc השהיה'
    );
    updateStreetSign();
    if (cur && mode === 'play') {
      setText(ui.prompt, (isTouch ? '✋ ' : 'E / Enter · ') + cur.label);
      show(ui.prompt, true);
    } else show(ui.prompt, false);
    ui.actBtn.classList.toggle('ready', !!cur);
  }

  // ================= עדכוני עולם =================
  function updateNPCs(dt, t) {
    const m = S.mission;
    for (const n of npcs) {
      n.p.group.visible = !n.hidden;
      if (n.hidden) continue;
      let moving = false;
      const nearPlayer = !drv && dist(player, n) < (n.id === 'ido' ? 3.2 : 5);
      const ctl = n.ctrl ? n.ctrl(dt, n, nearPlayer) : undefined;
      if (ctl !== undefined) moving = ctl;
      else if (n.id === 'ido') {
        if (!nearPlayer && mode === 'play') {
          n.s += 4.0 * dt;
          const [x, z] = jogPoint(n.s);
          if (x !== n.x || z !== n.z) n.rotT = Math.atan2(x - n.x, z - n.z);
          n.x = x;
          n.z = z;
          moving = true;
        } else if (nearPlayer) n.rotT = Math.atan2(player.x - n.x, player.z - n.z);
      } else if (nearPlayer) n.rotT = Math.atan2(player.x - n.x, player.z - n.z);
      else if (n.id === 'roi' && S.flags.roiAttention && dist(van, n) < 25) n.rotT = Math.atan2(van.x - n.x, van.z - n.z);
      else n.rotT = n.def.rot || 0;
      n.rot = G.lerpAngle(n.rot, n.rotT, 1 - Math.exp(-6 * dt));
      if (moving) n.phase += dt * (n.walkSpeed || 9);
      const bob = G.animatePerson(n.p, n.phase, moving ? 1 : 0);
      if (n.id === 'roi' && !S.flags.roiAttention) n.p.head.rotation.z = Math.sin(t * 7) * 0.14;
      if (n.id === 'daniel' && !n.ctrl && m.targets.daniel !== 'accepted' && !(m.targets.daniel === 'later' && m.elapsed >= m.laterAt)) {
        n.p.armR.rotation.x = -2.6;
        n.p.armR.rotation.z = 0.35;
      }
      n.p.group.position.set(n.x, bob, n.z);
      n.p.group.rotation.y = n.rot;
      const k = iconFor(n);
      if (k !== n.iconKind) {
        n.iconKind = k;
        n.icon.visible = !!k;
        if (k) n.icon.material = G.iconMat(k);
      }
      if (k) n.icon.position.y = 3 + Math.sin(t * 3 + n.x) * 0.12;
    }
  }
  // בעיר גדולה: הולך רגל שנשאר רחוק עובר למדרכה קרובה לשחקן (מחוץ לטווח הראייה)
  let walkerMoveT = 0;
  const pathsNear = (x, z) => W.pathsNear(x, z);
  function relocateWalkers(dt) {
    if (!W.paths || !W.paths.length || (walkerMoveT -= dt) > 0) return;
    walkerMoveT = 2;
    for (const w of walkers) {
      if (!w.path || Math.hypot(player.x - w.x, player.z - w.z) < 320) continue;
      const cand = pathsNear(player.x, player.z);
      for (let k = 0; k < 30 && cand.length; k++) {
        const cp = cand[(Math.random() * cand.length) | 0];
        const m = cp.pts[(cp.pts.length / 2) | 0], d = Math.hypot(m[0] - player.x, m[1] - player.z);
        if (d < 70 || d > 260) continue;
        w.path = mkPath(cp.pts, false);
        w.s = Math.random() * w.path.len * 2;
        const [x, z] = pathPoint(w.path, w.s);
        w.x = x;
        w.z = z;
        break;
      }
    }
  }
  function updateWalkers(dt) {
    if (W.HALF > 1000) relocateWalkers(dt);
    for (const w of walkers) {
      if (dt > 0) {
        const near = !drv && Math.hypot(player.x - w.x, player.z - w.z) < 1.2;
        let moving = false;
        if (w.wait > 0) w.wait -= dt;
        else if (!near) {
          if (w.path) w.s += w.speed * dt;
          else w.t += (w.dir * w.speed * dt) / (2 * RS);
          moving = true;
        }
        const [bx, bz] = w.path ? pathPoint(w.path, w.s) : ringPoint(w.cx, w.cz, w.t);
        const decay = Math.exp(-1.2 * dt);
        w.ox *= decay;
        w.oz *= decay;
        const nx = bx + w.ox, nz = bz + w.oz;
        if (moving && (Math.abs(nx - w.x) + Math.abs(nz - w.z) > 1e-4)) w.rot = G.lerpAngle(w.rot, Math.atan2(nx - w.x, nz - w.z), 1 - Math.exp(-8 * dt));
        else if (w.wait > 0 && !drv) w.rot = G.lerpAngle(w.rot, Math.atan2(player.x - w.x, player.z - w.z), 1 - Math.exp(-8 * dt));
        w.x = nx;
        w.z = nz;
        if (moving) w.phase += dt * w.speed * 4.5;
        const bob = G.animatePerson(w.p, w.phase, moving ? 1 : 0);
        w.p.group.position.set(w.x, bob, w.z);
        w.p.group.rotation.y = w.rot;
        if (w.iconT > 0) {
          w.iconT -= dt;
          if (w.iconT <= 0) w.icon.visible = false;
        }
      }
    }
  }
  // ================= GPS =================
  // יעד ידני (בית חב״ד / הטנק) גובר על יעד המשימה; המסלול מחושב מחדש כל ~0.7 שנ׳
  const gps = { dest: null, route: null, color: '#b07cff', t: 0, hintT: 40 };
  function gpsTarget() {
    if (gps.dest === 'home') return W.places.chabadDoor;
    if (gps.dest === 'point') return gps.point;
    if (gps.dest === 'tank') return van;
    return nearestPending();
  }
  function refreshGpsBtns() {
    $('gps-home').classList.toggle('on', gps.dest === 'home');
    $('gps-tank').classList.toggle('on', gps.dest === 'tank');
  }
  function setGps(kind) {
    if (gps.dest === kind) {
      gps.dest = null;
      toast('📍 הניווט בוטל');
    } else {
      gps.dest = kind;
      toast(kind === 'home' ? '📍 מסלול לבית חב״ד — עקבו אחרי הקו הצהוב במפה' : '📍 מסלול לטנק המבצעים — עקבו אחרי הקו הצהוב במפה', 'gold');
    }
    A.click();
    gps.t = 0;
    refreshGpsBtns();
  }
  function updateGps(dt) {
    const px = drv ? drv.x : player.x, pz = drv ? drv.z : player.z;
    if (gps.dest === 'tank' && drv === van) {
      gps.dest = null;
      refreshGpsBtns();
    }
    const t = gpsTarget();
    if (gps.dest && t && Math.hypot(t.x - px, t.z - pz) < 9) {
      toast(gps.dest === 'home' ? 'הגעתם לבית חב״ד 🏠' : gps.dest === 'point' ? 'הגעתם ליעד 📍' : 'הנה טנק המבצעים! 🚐', 'gold');
      gps.dest = null;
      refreshGpsBtns();
    }
    gps.color = gps.dest ? '#ffd23f' : '#c084ff';
    // תזכורת: הטנק רחוק
    if (!drv && !gps.dest && Math.hypot(van.x - px, van.z - pz) > 90) {
      gps.hintT -= dt;
      if (gps.hintT <= 0) {
        gps.hintT = 75;
        toast('🚐 טנק המבצעים רחוק — ' + (isTouch ? 'לחצו 🚐 ליד המפה' : 'לחצו T') + ' כדי לנווט אליו');
      }
    }
    if (!t || !W.route) {
      gps.route = null;
      return;
    }
    gps.t -= dt;
    if (gps.t <= 0) {
      gps.t = 0.7;
      // אם לא נמצא מסלול ברחובות — לפחות קו ישר ליעד, כדי שתמיד יהיה כיוון
      gps.route = W.route(px, pz, t.x, t.z) || [[px, pz], [t.x, t.z]];
    } else if (gps.route) gps.route[0] = [px, pz];
  }
  // ================= מפה גדולה (M): כל העיר, יעדים, ונקודת ציון בלחיצה =================
  const bm = $('bigmap'), bmc = $('bigmap-c'), bmx = bmc.getContext('2d');
  let bmImg = null, bmImgS = 1, bmv = null;
  const bmPos = () => (drv ? { x: drv.x, z: drv.z } : { x: player.x, z: player.z });
  function openBigMap() {
    if (!W.drawMap || (mode !== 'play' && mode !== 'paused')) return;
    if (mode === 'paused') show($('pause'), false);
    mode = 'map';
    show(bm, true);
    A.click();
    if (!bmImg) {
      // תמונה של כל העיר לזום רחוק; בזום קרוב מציירים מחדש רק את האזור הנראה
      const size = Math.min(2048, Math.round(2 * MEXT * 1.2));
      bmImgS = size / (2 * MEXT);
      bmImg = document.createElement('canvas');
      bmImg.width = bmImg.height = size;
      W.drawMap(bmImg.getContext('2d'), bmImgS, MEXT);
    }
    const p = bmPos();
    bmv = { cx: p.x, cz: p.z, s: 0, moved: 0 };
    sizeBigMap();
    bmv.s = Math.max(fitScale(), Math.min(1.2, bmc.height / 900));
    drawBigMap();
  }
  function closeBigMap() {
    show(bm, false);
    mode = 'play';
  }
  function fitScale() {
    return Math.min(bmc.width, bmc.height) / (2 * MEXT);
  }
  function sizeBigMap() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bmc.width = Math.round(window.innerWidth * dpr);
    bmc.height = Math.round(window.innerHeight * dpr);
  }
  const w2s = (x, z) => [bmc.width / 2 + (x - bmv.cx) * bmv.s, bmc.height / 2 + (z - bmv.cz) * bmv.s];
  const s2w = (sx, sz) => [bmv.cx + (sx - bmc.width / 2) / bmv.s, bmv.cz + (sz - bmc.height / 2) / bmv.s];
  function bmMarker(x, z, txt, bg, size) {
    const [sx, sz] = w2s(x, z), r = (size || 16) * (bmc.width > 1600 ? 1.4 : 1);
    bmx.beginPath();
    bmx.arc(sx, sz, r, 0, Math.PI * 2);
    bmx.fillStyle = bg;
    bmx.fill();
    bmx.lineWidth = 3;
    bmx.strokeStyle = '#13213f';
    bmx.stroke();
    bmx.font = Math.round(r * 1.1) + 'px sans-serif';
    bmx.textAlign = 'center';
    bmx.textBaseline = 'middle';
    bmx.fillText(txt, sx, sz + 1);
  }
  function drawBigMap() {
    if (!bmv) return;
    const Wd = bmc.width, Hd = bmc.height;
    bmx.setTransform(1, 0, 0, 1, 0, 0);
    bmx.fillStyle = '#7f8c55';
    bmx.fillRect(0, 0, Wd, Hd);
    bmx.save();
    bmx.translate(Wd / 2, Hd / 2);
    bmx.scale(bmv.s, bmv.s);
    bmx.translate(-bmv.cx, -bmv.cz);
    if (bmv.s <= bmImgS * 1.6) {
      bmx.imageSmoothingEnabled = true;
      bmx.drawImage(bmImg, -MEXT, -MEXT, 2 * MEXT, 2 * MEXT);
    } else {
      const hw = Wd / 2 / bmv.s + 20, hh = Hd / 2 / bmv.s + 20;
      bmx.save();
      bmx.translate(-MEXT, -MEXT);
      W.drawMap(bmx, 1, MEXT, { x1: bmv.cx - hw, z1: bmv.cz - hh, x2: bmv.cx + hw, z2: bmv.cz + hh });
      bmx.restore();
    }
    // מסלול ה-GPS
    if (gps.route && gps.route.length > 1) {
      bmx.lineJoin = bmx.lineCap = 'round';
      for (const [w, c] of [[10, 'rgba(10,14,30,0.6)'], [6, gps.color]]) {
        bmx.strokeStyle = c;
        bmx.lineWidth = w / bmv.s;
        bmx.beginPath();
        bmx.moveTo(gps.route[0][0], gps.route[0][1]);
        for (const q of gps.route) bmx.lineTo(q[0], q[1]);
        bmx.stroke();
      }
    }
    bmx.restore();
    // שמות מקומות
    bmx.font = 'bold ' + (Wd > 1600 ? 22 : 15) + 'px Rubik, Arial, sans-serif';
    bmx.textAlign = 'center';
    for (const pl of W.places) {
      if (!pl.he || pl.r < 8) continue;
      const [sx, sz] = w2s(pl.x, pl.z);
      if (sx < -50 || sz < -50 || sx > Wd + 50 || sz > Hd + 50) continue;
      bmx.lineWidth = 4;
      bmx.strokeStyle = 'rgba(19,33,63,0.85)';
      bmx.strokeText(pl.he, sx, sz - 26);
      bmx.fillStyle = '#ffffff';
      bmx.fillText(pl.he, sx, sz - 26);
    }
    // סמנים: יעד המשימה, בית חב״ד, הטנק, נקודת ציון, ואתם
    const tgt = nearestPending();
    if (tgt) bmMarker(tgt.x, tgt.z, '★', '#b07cff', 15);
    const ch = W.places.chabadDoor;
    if (ch) bmMarker(ch.x, ch.z, '🏠', '#3b6fd8', 16);
    if (drv !== van) bmMarker(van.x, van.z, '🚐', '#ffd23f', 15);
    if (gps.dest === 'point' && gps.point) bmMarker(gps.point.x, gps.point.z, '📍', '#ffffff', 16);
    const p = bmPos(), [px, pz] = w2s(p.x, p.z);
    const hd = drv ? drv.h : player.rot, R = Wd > 1600 ? 18 : 13;
    bmx.save();
    bmx.translate(px, pz);
    bmx.rotate(-hd + Math.PI);
    bmx.beginPath();
    bmx.moveTo(0, -R);
    bmx.lineTo(R * 0.75, R * 0.8);
    bmx.lineTo(0, R * 0.4);
    bmx.lineTo(-R * 0.75, R * 0.8);
    bmx.closePath();
    bmx.fillStyle = '#ffffff';
    bmx.fill();
    bmx.lineWidth = 3;
    bmx.strokeStyle = '#13213f';
    bmx.stroke();
    bmx.restore();
  }
  function bmZoom(f, sx, sz) {
    const [wx, wz] = s2w(sx === undefined ? bmc.width / 2 : sx, sz === undefined ? bmc.height / 2 : sz);
    bmv.s = G.clamp(bmv.s * f, fitScale() * 0.9, 4);
    const [nx, nz] = s2w(sx === undefined ? bmc.width / 2 : sx, sz === undefined ? bmc.height / 2 : sz);
    bmv.cx += wx - nx;
    bmv.cz += wz - nz;
    drawBigMap();
  }
  // גרירה, צביטה ולחיצה (עכבר ומגע)
  const bmPtr = new Map();
  let bmPinch = 0;
  const dprOf = () => bmc.width / window.innerWidth;
  bmc.addEventListener('pointerdown', (e) => {
    bmc.setPointerCapture(e.pointerId);
    bmPtr.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    bmv.moved = 0;
    if (bmPtr.size === 2) {
      const [a, b] = [...bmPtr.values()];
      bmPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  bmc.addEventListener('pointermove', (e) => {
    const p = bmPtr.get(e.pointerId);
    if (!p || !bmv) return;
    const k = dprOf();
    if (bmPtr.size === 1) {
      bmv.cx -= ((e.clientX - p.x) * k) / bmv.s;
      bmv.cz -= ((e.clientY - p.y) * k) / bmv.s;
      bmv.moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (bmPtr.size === 2) {
      const [a, b] = [...bmPtr.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (bmPinch > 0) bmZoom(d / bmPinch, ((a.x + b.x) / 2) * k, ((a.y + b.y) / 2) * k);
      bmPinch = d;
      bmv.moved += 99;
    }
    drawBigMap();
  });
  const bmUp = (e) => {
    const p = bmPtr.get(e.pointerId);
    bmPtr.delete(e.pointerId);
    if (bmPtr.size < 2) bmPinch = 0;
    if (!p || !bmv || bmv.moved > 8 || bmPtr.size) return;
    // לחיצה: נקודת ציון (לחיצה על הנקודה הקיימת מבטלת אותה)
    const k = dprOf(), [wx, wz] = s2w(e.clientX * k, e.clientY * k);
    if (gps.dest === 'point' && gps.point && Math.hypot(gps.point.x - wx, gps.point.z - wz) * bmv.s < 30) {
      gps.dest = null;
      toast('📍 נקודת הציון בוטלה');
    } else {
      gps.dest = 'point';
      gps.point = { x: wx, z: wz };
      toast('📍 נקבע יעד — עקבו אחרי הקו הצהוב', 'gold');
    }
    gps.t = 0;
    refreshGpsBtns();
    A.click();
    updateGps(0.01);
    drawBigMap();
  };
  bmc.addEventListener('pointerup', bmUp);
  bmc.addEventListener('pointercancel', (e) => bmPtr.delete(e.pointerId));
  bmc.addEventListener('wheel', (e) => {
    e.preventDefault();
    const k = dprOf();
    bmZoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX * k, e.clientY * k);
  }, { passive: false });
  $('bm-zin').addEventListener('click', () => bmZoom(1.4));
  $('bm-zout').addEventListener('click', () => bmZoom(1 / 1.4));
  $('bm-me').addEventListener('click', () => {
    const p = bmPos();
    bmv.cx = p.x;
    bmv.cz = p.z;
    drawBigMap();
  });
  $('bm-close').addEventListener('click', closeBigMap);
  $('gps-map').addEventListener('click', openBigMap);
  window.addEventListener('resize', () => {
    if (mode === 'map') {
      sizeBigMap();
      drawBigMap();
    }
  });

  $('gps-home').addEventListener('click', () => setGps('home'));
  $('gps-tank').addEventListener('click', () => setGps('tank'));

  function nearestPending() {
    const m = S.mission;
    if (m.status !== 'active') {
      const t = M.navTarget() || (EV && EV.navTarget());
      return t && Math.hypot(t.x - player.x, t.z - player.z) > 5 ? t : null;
    }
    let best = null, bd = 1e9;
    for (const n of npcs) {
      if (n.iconKind !== 'alert' && n.iconKind !== 'music') continue;
      const d = dist(player, n);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best && bd > 5 ? best : null;
  }

  let saveT = 0;
  // ================= שיחת טלפון ממשה: כשנפתחת משימה חדשה =================
  let call = null, callWait = 0;
  const MOSHE_PHONE = { id: 'moshe', name: 'משה', role: 'בטלפון 📞' };
  function callReason() {
    if ((S.mission.status !== 'complete' && CITY !== 'pt') || M.activeQuest()) return null;
    const off = M.callOffer && M.callOffer();
    if (off && !S.flags['call_' + off.id]) return off;
    if (CITY !== 'pt' && S.chabadLevel === 1 && !S.flags.call_up) return { id: 'up' };
    return null;
  }
  function updateCall(dt) {
    if (call) {
      call.t += dt;
      call.ring -= dt;
      if (call.ring <= 0) {
        call.ring = 1.7;
        A.phone();
      }
      if (call.t > 16) endCall(false);
      return;
    }
    if (mode !== 'play') return;
    const off = callReason();
    callWait = off ? callWait + dt : 0;
    if (callWait > (off && off.id === 'up' ? 25 : 10)) {
      callWait = 0;
      S.flags['call_' + off.id] = true;
      call = { off, t: 0, ring: 0 };
      $('call').querySelector('.call-who b').textContent = (M.caller || MOSHE_PHONE).name;
      show($('call'), true);
      save();
    }
  }
  function endCall(answer) {
    if (!call) return;
    const off = call.off;
    call = null;
    show($('call'), false);
    if (!answer) {
      toast('📞 שיחה שלא נענתה מ' + (M.caller || MOSHE_PHONE).name + ' — אפשר לדבר איתו ליד בית חב״ד');
      return;
    }
    let nodes;
    if (off.id === 'up') {
      nodes = {
        a: { s: 'npc', t: 'שליח! מדבר משה. שמעתי מה עשית הבוקר ברחובות — כל השכונה מדברת על זה!', go: 'b' },
        b: { s: 'npc', t: 'עכשיו תקפוץ לבית חב״ד ותיכנס בדלת — הגיע הזמן לשדרג את המקום. ואחר כך יש לי בשבילך משימה חדשה.', c: [{ t: 'אני בדרך!' }] },
      };
    } else {
      nodes = Object.assign({}, off.nodes);
      nodes.a = Object.assign({}, nodes.a, { t: (M.callerIntro || 'שליח! מדבר משה. ') + nodes.a.t });
    }
    if (drv) drv.v *= 0.3;
    talkTo({ phone: true, id: 'moshe', def: M.caller || MOSHE_PHONE, x: player.x, z: player.z, nodes });
  }

  // ================= נסיעה בין ערים =================
  const CITY_NAMES = { hod: 'הוד השרון', pt: 'פתח תקווה' };
  function travel(to) {
    if (to === CITY) return;
    if (drv && drv.auto) return;
    save();
    S.cities[CITY] = { player: S.player, van: S.van, rides: S.rides };
    S.flags.ptUnlocked = true;
    S.flags.justTraveled = to;
    S.city = to;
    S.inVan = false;
    S.ride = null;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    } catch (e) {}
    resetting = true;
    mode = 'travel';
    $('travel-to').textContent = CITY_NAMES[to];
    show($('travel'), true);
    A.door && A.door('tank');
    setTimeout(() => location.replace(location.pathname + location.hash), 1900);
  }
  $('p-travel').addEventListener('click', () => {
    if (M.activeQuest()) return toast('קודם לסיים את המשימה שבאמצע');
    show($('pause'), false);
    travel(CITY === 'pt' ? 'hod' : 'pt');
  });
  $('call-yes').addEventListener('click', () => endCall(true));
  $('call-no').addEventListener('click', () => endCall(false));

  // אזהרה כשמתקרבים לקצה המפה, עם חץ שמצביע חזרה לעיר
  let boundsOn = false;
  function updateBounds() {
    if (!W.city) return;
    const p = drv || player;
    const edge = Math.max(Math.abs(p.x), Math.abs(p.z));
    const on = edge > W.HALF - 22;
    if (on !== boundsOn) {
      boundsOn = on;
      show($('bounds-warn'), on);
      if (on) A.beep && A.beep();
    }
    if (on) {
      // כיוון למרכז העיר ביחס לכיוון המצלמה (0 = קדימה על המסך)
      const toC = Math.atan2(-p.x, -p.z);
      const rel = G.wrapAngle(toC - tp.yaw);
      $('bounds-arrow').style.transform = 'rotate(' + (-90 - (rel * 180) / Math.PI).toFixed(0) + 'deg)';
    }
  }
  const SUNSET = 18.3;
  function updatePlay(dt, t) {
    S.time = (S.time + (dt * M.timeRate()) / 60) % 24;
    // במשימת התפילין השעון צמוד לטיימר: הוא מגיע לשקיעה בדיוק כשהזמן נגמר
    if (S.mission.status === 'active') {
      const t0 = S.mission.t0 || 8;
      S.time = t0 + (SUNSET - t0) * G.clamp(S.mission.elapsed / 300, 0, 1);
    }
    M.update(dt);
    if (drv) updateVehicle(drv, dt);
    else updatePlayer(dt);
    for (const v of vehicles) v.hornCd -= dt;
    updateGps(dt);
    if (EV) EV.update(dt, S.mission.status === 'active' || !!M.activeQuest() || mode !== 'play');
    if (CL) CL.update(dt, t);
    A.ambience(dt, Math.max(0, lastNight), !!W.city, TR ? TR.nearby / 4 : 0);
    const m = S.mission;
    if (m.status === 'active') {
      m.timeLeft -= dt;
      m.elapsed += dt;
      if (m.timeLeft <= 0) {
        m.timeLeft = 0;
        toast('🌇 השמש שקעה — המשימה הסתיימה', 'gold');
        completeMission('time');
      }
    }
    computeInteract();
    updateBounds(dt);
    updateCall(dt);
    // רדיו: נשמע מהרמקול שעל הגג, חלש יותר ככל שמתרחקים
    const vol = S.radio ? (drv ? 1 : G.clamp(1 - Math.hypot(player.x - van.x, player.z - van.z) / 30, 0, 1) * 0.8) : 0;
    // בשיחת טלפון הרדיו שותק; כשמישהו מדבר — הוא נחלש
    const onPhone = !!call || (dlg && dlg.npc.phone);
    const duck = onPhone ? 0 : G.voice && G.voice.speaking ? 0.3 : 1;
    A.setRadioVolume(vol * duck);
    A.setDuck(duck);
    A.setEngine(!!drv && drv.type !== 'bike', drv ? Math.abs(drv.v) / drv.P.max : 0, drv ? drv.P.pitch : 1);
    if (S.radio && vol > 0.05 && (S.radio !== A.KOL || drv === van)) {
      const src = drv || van;
      noteT -= dt;
      if (noteT <= 0) {
        noteT = 0.55;
        const nt = notes.find((x) => x.life <= 0);
        if (nt) {
          nt.life = 1.6;
          nt.vx = (Math.random() - 0.5) * 1.2;
          nt.s.position.set(src.x, 3.4, src.z);
          nt.s.visible = true;
        }
      }
    }
    saveT += dt;
    if (saveT > 5) {
      saveT = 0;
      save();
    }
    if (pendingResults && mode === 'play') showResults();
    else if (queuedResults && mode === 'play') {
      const d = queuedResults;
      queuedResults = null;
      showResultsData(d);
    }
  }

  // ================= יום ולילה =================
  const ENV = [
    [0, 0x0b1430, 0.42, 0.18, 0x8899ff, 1],
    [5, 0x0f1b3d, 0.42, 0.18, 0x8899ff, 1],
    [6.5, 0xf4a261, 0.5, 0.5, 0xffb37a, 0.45],
    [8, 0x8ecae6, 0.65, 0.85, 0xfff4e0, 0],
    [16.5, 0x8ecae6, 0.65, 0.85, 0xfff4e0, 0],
    [18.5, 0xff8c42, 0.5, 0.55, 0xff9a5a, 0.45],
    [20, 0x16224a, 0.56, 0.22, 0x7f8fff, 1],
    [24, 0x0b1430, 0.54, 0.22, 0x8899ff, 1],
  ].map((e) => ({ h: e[0], sky: new T.Color(e[1]), hemi: e[2], sun: e[3], sunCol: new T.Color(e[4]), night: e[5] }));
  const hemiDay = new T.Color(0xe8f2ff), hemiNight = new T.Color(0x5566aa), rainSky = new T.Color(0x56606e);
  const sunDir = new T.Vector3();
  let lastNight = -1;
  // תאורת לילה: אור אמיתי מעמודי התאורה הקרובים + פנסים קדמיים לרכב
  const lampLights = [];
  for (let i = 0; i < (isTouch ? 4 : 8); i++) {
    const l = new T.PointLight(0xffd690, 0, 24, 1.4);
    l.position.y = 4.3;
    scene.add(l);
    lampLights.push(l);
  }
  const headL = new T.SpotLight(0xfff2cc, 0, 48, 0.55, 0.55, 1.2);
  scene.add(headL, headL.target);
  let lampPickT = 0;
  function updateNightLights(night) {
    const lamps = W.lamps || [];
    lampPickT -= 1 / 60;
    if (lampPickT <= 0) {
      lampPickT = 0.4;
      const cx = camTarget.x, cz = camTarget.z;
      const near = [];
      for (const lp of lamps) {
        const d = (lp[0] - cx) ** 2 + (lp[1] - cz) ** 2;
        if (d < 3600) near.push([d, lp]);
      }
      near.sort((a, b) => a[0] - b[0]);
      lampLights.forEach((l, i) => {
        const n = near[i];
        l.visible = !!n;
        if (n) l.position.set(n[1][0], 4.3, n[1][1]);
      });
    }
    const li = night > 0.3 ? (night - 0.3) / 0.7 : 0;
    for (const l of lampLights) l.intensity = li * 1.6;
    const v = drv;
    headL.intensity = v && v.type !== 'bike' ? li * 2.2 : v ? li * 1.2 : 0;
    if (v) {
      const fx = Math.sin(v.h), fz = Math.cos(v.h);
      headL.position.set(v.x + fx * 1.8, 1.3, v.z + fz * 1.8);
      headL.target.position.set(v.x + fx * 20, 0, v.z + fz * 20);
    }
  }
  function updateEnv() {
    const h = mode === 'title' ? 18.9 : S.time;
    let i = 0;
    while (i < ENV.length - 2 && ENV[i + 1].h <= h) i++;
    const a = ENV[i], b = ENV[i + 1], f = (h - a.h) / (b.h - a.h);
    scene.background.copy(a.sky).lerp(b.sky, f);
    scene.fog.color.copy(scene.background);
    hemi.intensity = G.lerp(a.hemi, b.hemi, f);
    sun.intensity = G.lerp(a.sun, b.sun, f);
    sun.color.copy(a.sunCol).lerp(b.sunCol, f);
    const night = G.lerp(a.night, b.night, f);
    hemi.color.copy(hemiDay).lerp(hemiNight, night);
    const rain = M ? M.rain : 0;
    const dusk = Math.max(0, 1 - Math.abs(h - 18.4) / 1.4, 1 - Math.abs(h - 6.4) / 1.1) * 0.65;
    if (rain > 0.001) {
      scene.background.lerp(rainSky, rain * 0.75);
      scene.fog.color.copy(scene.background);
      sun.intensity *= 1 - 0.65 * rain;
      hemi.intensity *= 1 - 0.2 * rain;
    }
    if (Math.abs(night - lastNight) > 0.005) {
      lastNight = night;
      W.setNight(night);
      van.m.glowMat.opacity = night * 0.7;
      if (post) post.mat.uniforms.night.value = night;
    }
    W.fx = player.x;
    W.fz = player.z;
    W.update(clock);
    updateNightLights(Math.max(0, lastNight));
    const ang = G.clamp((h - 6) / 12, 0, 1) * Math.PI;
    if (h > 6 && h < 18) sunDir.set(Math.cos(ang) * 0.9, 0.55 + 0.45 * Math.sin(ang), 0.55).normalize();
    else sunDir.set(0.4, 1, 0.6).normalize();
    sun.position.copy(camTarget).addScaledVector(sunDir, 90);
    sun.target.position.copy(camTarget);
    // שמיים בגוף שלישי: כחול למעלה, אופק בהיר וערפל באותו צבע
    if (camera === camP) {
      skyMat.uniforms.top.value.copy(scene.background).multiplyScalar(0.85);
      skyHorizon.copy(scene.background).lerp(dusk > 0 ? duskCol : white, dusk > 0 ? dusk : 0.45 * (1 - night));
      skyMat.uniforms.horizon.value.copy(skyHorizon);
      scene.fog.color.copy(skyHorizon);
      scene.fog.near = 55;
      scene.fog.far = 230;
      const up = h > 6 && h < 18.3;
      sunSprite.visible = up && rain < 0.3;
      sunSprite.position.copy(camP.position).addScaledVector(sunDir, 330);
      sunSprite.material.color.copy(sun.color);
    } else {
      scene.fog.near = 125;
      scene.fog.far = 270;
    }
  }
  const skyHorizon = new T.Color(), white = new T.Color(0xffffff), duskCol = new T.Color(0xffb070);

  // ================= מצלמה ושקיפות מבנים =================
  const goal = new T.Vector3();
  const tpTarget = new T.Vector3(), tpWant = new T.Vector3(), tpDir = new T.Vector3(), tpRay = new T.Raycaster();
  let tpInit = false;
  function followThird(dt) {
    if (!tpInit) {
      tpInit = true;
      tp.yaw = drv ? drv.h : player.rot;
    }
    let dist, height;
    if (drv) {
      tp.lookT -= dt;
      if (tp.lookT <= 0) tp.vanOff = G.lerp(tp.vanOff, 0, 1 - Math.exp(-2 * dt));
      const back = drv.v < -1 ? Math.PI : 0;
      // camLook: המצלמה פונה לנקודה מעניינת (למשל מעגל הריקודים)
      const yawT = drv.camLook && tp.lookT <= 0 ? Math.atan2(drv.camLook.x - drv.x, drv.camLook.z - drv.z) : drv.h + back + tp.vanOff;
      tp.yaw = G.lerpAngle(tp.yaw, yawT, 1 - Math.exp(-(tp.lookT > 0 ? 12 : drv.camLook ? 2 : 3.5) * dt));
      dist = drv.P.cam + Math.abs(drv.v) * 0.08 + (drv.camLook ? 5 : 0);
      height = drv.P.camH + (drv.camLook ? 5.5 : 0);
      tpTarget.set(drv.x, height, drv.z);
    } else {
      dist = tp.dist;
      height = 1.6;
      // הכתף: הדמות מעט שמאלה מהמרכז, כמו במשחקי גוף שלישי
      tpTarget.set(player.x - Math.cos(tp.yaw) * 0.35, height, player.z + Math.sin(tp.yaw) * 0.35);
    }
    const pitch = drv ? Math.max(0.12, tp.pitch * 0.8) : tp.pitch;
    tpDir.set(-Math.sin(tp.yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(tp.yaw) * Math.cos(pitch));
    // התנגשות מצלמה במבנים
    tpRay.set(tpTarget, tpDir);
    tpRay.far = dist;
    const hits = tpRay.intersectObjects(W.buildings, false);
    for (const v of vehicles) if (v !== drv) hits.push(...tpRay.intersectObject(v.m.group, true));
    let d = dist;
    for (const h of hits) d = Math.min(d, Math.max(0.8, h.distance - 0.35));
    tpWant.copy(tpTarget).addScaledVector(tpDir, d);
    if (tpWant.y < 0.4) tpWant.y = 0.4;
    camP.position.copy(tpWant);
    camP.lookAt(tpTarget.x, tpTarget.y + (drv ? 0.4 : 0.1), tpTarget.z);
    camTarget.set(drv ? drv.x : player.x, 0, drv ? drv.z : player.z);
  }
  function followCam(dt) {
    if (drv) goal.set(drv.x + Math.sin(drv.h) * drv.v * 0.35, 0, drv.z + Math.cos(drv.h) * drv.v * 0.35);
    else goal.set(player.x, 0, player.z);
    camTarget.lerp(goal, 1 - Math.exp(-6 * dt));
    const target = drv ? 36 + Math.abs(drv.v) * 0.25 : 28;
    viewH = G.lerp(viewH, target, 1 - Math.exp(-2.5 * dt));
  }
  let titleT = 0;
  function titleCam(dt) {
    titleT += dt * 0.05;
    const tc = W.chabadFrame || { x: -6, z: -6 };
    camTarget.set(Math.cos(titleT) * 30 + tc.x, 0, Math.sin(titleT) * 30 + tc.z);
    viewH = 40;
  }
  const ray = new T.Raycaster(), rayO = new T.Vector3(), rayD = CAM_DIR.clone().negate();
  function updateFades(dt) {
    for (const b of W.buildings) b.userData.hit = false;
    if (mode !== 'title' && !isThird() && !W.noFade) {
      const fx = drv ? drv.x : player.x, fz = drv ? drv.z : player.z;
      for (const y of [0.6, 1.9]) {
        rayO.set(fx, y, fz).addScaledVector(CAM_DIR, 160);
        ray.set(rayO, rayD);
        ray.far = 159;
        for (const h of ray.intersectObjects(W.buildings, false)) h.object.userData.hit = true;
      }
      for (const p of M.fadePoints())
        for (const y of [0.8, 3.5]) {
          rayO.set(p.x, y, p.z).addScaledVector(CAM_DIR, 160);
          ray.set(rayO, rayD);
          ray.far = 159;
          for (const h of ray.intersectObjects(W.buildings, false)) h.object.userData.hit = true;
        }
    }
    for (const b of W.buildings) {
      const u = b.userData;
      u.fade = G.lerp(u.fade, u.hit ? 0.25 : 1, 1 - Math.exp(-8 * dt));
      const tr = u.fade < 0.98;
      if (tr !== u.tr) {
        u.tr = tr;
        for (const m of u.mats) {
          m.transparent = tr;
          m.depthWrite = !tr;
          m.needsUpdate = true;
        }
        if (!tr) u.fade = 1;
      }
      for (const m of u.mats) m.opacity = u.fade;
    }
  }

  // רוכב על קטנוע או אופניים: יושב, ידיים על הכידון, מדווש באופניים
  let pedal = 0;
  function poseRider() {
    if (!drv || drv.P.hide) return;
    const p = player.p;
    p.group.position.set(drv.x, drv.P.seat - 0.88, drv.z);
    p.group.rotation.y = drv.h;
    p.group.rotation.z = drv.lean;
    if (drv.type === 'bike') {
      pedal += Math.abs(drv.v) * 0.016 * 1.5;
      p.legL.rotation.x = -1.0 + Math.sin(pedal) * 0.5;
      p.legR.rotation.x = -1.0 - Math.sin(pedal) * 0.5;
    } else p.legL.rotation.x = p.legR.rotation.x = -1.35;
    p.armL.rotation.x = p.armR.rotation.x = -1.1;
    p.armL.rotation.z = 0.12;
    p.armR.rotation.z = -0.12;
    p.torso.rotation.y = 0;
  }

  // ================= לולאה =================
  let last = performance.now(), clock = 0, mmT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
  }
  function tick(dt) {
    clock += dt;
    if (mode === 'play') updatePlay(dt, clock);
    A.kolTick(dt);
    updateNPCs(mode === 'play' || mode === 'title' ? dt : 0, clock);
    updateWalkers(mode === 'play' || mode === 'title' ? dt : 0);
    if (TR && (mode === 'play' || mode === 'title')) TR.update(dt, { px: drv ? drv.x : player.x, pz: drv ? drv.z : player.z, driving: !!drv, vehicles });
    M.visuals(dt, clock);

    // שחקן וטנק
    const pb = G.animatePerson(player.p, player.phase, player.moving ? 1 : 0);
    player.p.group.position.set(player.x, pb + player.jy, player.z);
    player.p.group.rotation.y = player.rot;
    for (const v of vehicles) {
      v.m.group.position.set(v.x, 0, v.z);
      v.m.group.rotation.y = v.h;
      v.m.body.rotation.z = v.lean;
    }
    poseRider();

    // סמנים
    const target = mode === 'play' ? gpsTarget() : null;
    navMark.visible = !!target;
    if (target) {
      navMark.position.set(target.x, (target.r ? 7 : 3.9) + Math.sin(clock * 2.5) * 0.25, target.z);
      navCone.rotation.y = clock * 1.5;
      const dd = Math.hypot(target.x - player.x, target.z - player.z);
      navMark.scale.setScalar(isThird() ? G.clamp(dd / 18, 1, 4) : 1.4);
    }
    arrow.visible = !!target && !isThird();
    if (target) {
      const fx = drv ? drv.x : player.x, fz = drv ? drv.z : player.z;
      arrow.position.set(fx, 0, fz);
      arrow.rotation.y = Math.atan2(target.x - fx, target.z - fz);
      arrowMesh.position.z = drv ? 3.6 : 2.2;
    }
    ring.visible = !!(cur && cur.x !== undefined && mode === 'play');
    if (ring.visible) {
      ring.position.set(cur.x, 0.08, cur.z);
      ring.scale.setScalar(1 + Math.sin(clock * 5) * 0.08);
    }
    for (const nt of notes) {
      if (nt.life <= 0) continue;
      nt.life -= dt;
      nt.s.position.y += dt * 1.3;
      nt.s.position.x += nt.vx * dt;
      nt.s.material.opacity = G.clamp(nt.life / 1.6, 0, 1);
      if (nt.life <= 0) nt.s.visible = false;
    }

    if (isThird() !== lastPixMode) resize();
    if (mode !== 'play' && document.pointerLockElement) document.exitPointerLock();
    if (isThird()) {
      camera = camP;
      followThird(dt);
      updateCam();
    } else {
      camera = camO;
      if (mode === 'title') titleCam(dt);
      else followCam(dt);
      updateCam();
      camO.position.copy(camTarget).add(CAM_OFF);
      camO.lookAt(camTarget);
    }
    sky.visible = sunSprite.visible = camera === camP;
    sky.position.copy(camP.position);
    updateEnv();
    updateFades(dt);
    if (mode !== 'title') {
      updateHUD();
      mmT -= dt;
      if (mmT <= 0) {
        mmT = 0.08;
        drawMinimap();
      }
    }
    renderFrame();
  }
  requestAnimationFrame(frame);

  // חיבור לבדיקות אוטומטיות בלבד (מופעל רק כשדף הבדיקה מגדיר G.debug)
  if (G.debug)
    G.dbg = {
      get S() { return S; }, get mode() { return mode; }, get dlg() { return dlg; },
      get M() { return M; }, get cur() { return cur; }, get drv() { return drv; }, tp, W, vehicles, enterVehicle, get TR() { return TR; }, get EV() { return EV; }, get CL() { return CL; }, get MZ() { return MZ; },
      player, van, npcById, keys, tick, interact, enterVan, exitVan, horn, radio, wrapTefillin, dialogChoose, dialogAdvance, startPlay, startMission,
    };

  try {
    if (sessionStorage.getItem('shluchim-autoplay')) {
      sessionStorage.removeItem('shluchim-autoplay');
      startPlay();
    }
  } catch (e) {}
})();
