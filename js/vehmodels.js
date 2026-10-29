// מודלי רכבים (Quaternius + rgsdev, CC0) מתוך data/vehicles.js: גאומטריה עם צבעי חומרים
// וסימון "צבע גוף" — כך שכל מופע בתנועה יכול לקבל צבע משלו בלי לצבוע זכוכית, צמיגים ופנסים
(function () {
  'use strict';
  const G = window.G, T = THREE;
  const D = window.VEH_DATA;
  if (!D) return;
  window.VEH_DATA = null;

  const dec = (s, Arr) => {
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Arr(u.buffer);
  };
  function build(pk, from, to) {
    const P = dec(pk.p, Int16Array), N = dec(pk.n, Int8Array), C = dec(pk.c, Uint8Array), K = dec(pk.k, Uint8Array);
    const n = P.length / 3, a = from || 0, b = to === undefined ? n : to, cnt = b - a;
    const pos = new Float32Array(cnt * 3), nrm = new Float32Array(cnt * 3), col = new Float32Array(cnt * 3), pnt = new Float32Array(cnt);
    for (let i = 0; i < cnt; i++) {
      const j = (a + i) * 3;
      pos[i * 3] = P[j] / 1000;
      pos[i * 3 + 1] = P[j + 1] / 1000;
      pos[i * 3 + 2] = P[j + 2] / 1000;
      nrm[i * 3] = N[j] / 127;
      nrm[i * 3 + 1] = N[j + 1] / 127;
      nrm[i * 3 + 2] = N[j + 2] / 127;
      col[i * 3] = C[j] / 255;
      col[i * 3 + 1] = C[j + 1] / 255;
      col[i * 3 + 2] = C[j + 2] / 255;
      pnt[i] = K[a + i];
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nrm, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setAttribute('aPaint', new T.BufferAttribute(pnt, 1));
    g.computeBoundingSphere();
    return g;
  }
  const cache = {};
  const get = (k, part) => {
    const key = k + ':' + part;
    if (cache[key]) return cache[key];
    const d = D[k];
    if (!d) return null;
    return (cache[key] = part === 'body' ? build(d.all, 0, d.nb) : part === 'wheel' ? build(d.wheel) : build(d.all));
  };

  // חומר לרכבים במופעים: צבע המופע מחליף רק את "צבע הגוף"
  let instMat = null;
  function vehInstMat() {
    if (instMat) return instMat;
    instMat = new T.MeshLambertMaterial({ vertexColors: true });
    instMat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aPaint;\n' + sh.vertexShader.replace(
        '#include <color_vertex>',
        `#if defined( USE_COLOR )
          vColor = vec3( 1.0 );
          vColor.xyz *= color.xyz;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor.xyz = mix( vColor.xyz, instanceColor.xyz, aPaint );
        #endif`
      );
    };
    instMat.customProgramCacheKey = () => 'vehPaint';
    return instMat;
  }
  const plainMat = new T.MeshLambertMaterial({ vertexColors: true });
  // עותק של הגאומטריה עם צבע גוף קבוע (לרכב בודד)
  function painted(g, color) {
    if (color === undefined || color === null) return g;
    const c = new T.Color(color), out = g.clone(), col = out.attributes.color.array, p = out.attributes.aPaint.array;
    out.attributes.color = new T.BufferAttribute(col.slice(), 3);
    const cc = out.attributes.color.array;
    for (let i = 0; i < p.length; i++)
      if (p[i] > 0.5) {
        cc[i * 3] = c.r;
        cc[i * 3 + 1] = c.g;
        cc[i * 3 + 2] = c.b;
      }
    return out;
  }

  G.VEH = {
    has: (k) => !!D[k],
    info: (k) => D[k] && { L: D[k].L, W: D[k].W, H: D[k].H, wr: D[k].wr, wheels: D[k].wheels },
    geo: (k) => get(k, 'all'),
    instMat: vehInstMat,
    // רכב בודד, סטטי (חונה/תקוע)
    mesh(k, color) {
      const m = new T.Mesh(painted(get(k, 'all'), color), plainMat);
      m.castShadow = true;
      return m;
    },
    // רכב לנהיגה: גוף + גלגלים שמסתובבים (סביב ציר X)
    drive(k, color) {
      const d = D[k], g = new T.Group(), body = new T.Group();
      g.add(body);
      const bm = new T.Mesh(painted(get(k, 'body'), color), plainMat);
      bm.castShadow = true;
      body.add(bm);
      const wg = get(k, 'wheel'), wheels = [];
      for (const [x, y, z] of d.wheels) {
        const w = new T.Mesh(wg, plainMat);
        w.position.set(x, y, z);
        // גלגלי הצד השני הפוכים; סדר XYZ — הסיבוב (X) אחרי ההיפוך, כך שכל הגלגלים מסתובבים לאותו כיוון
        if (x < 0) w.rotation.y = Math.PI;
        w.castShadow = true;
        g.add(w);
        wheels.push(w);
      }
      return { group: g, body, wheels, info: G.VEH.info(k) };
    },
  };
})();
