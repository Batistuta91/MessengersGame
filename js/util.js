// כלי עזר משותפים: אקראיות קבועה, מתמטיקה וטקסטורות פיקסל
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const T = THREE;

  G.rng = function (seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.wrapAngle = (d) => ((((d + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  G.lerpAngle = (a, b, t) => a + G.wrapAngle(b - a) * t;
  G.moveToward = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

  G.shade = function (hex, amt) {
    const c = new T.Color(hex);
    if (amt > 0) c.lerp(new T.Color(0xffffff), amt);
    else c.lerp(new T.Color(0x000000), -amt);
    return '#' + c.getHexString();
  };

  G.speckle = function (g, w, h, base, rnd, n, amt) {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = G.shade(base, (rnd() - 0.5) * amt);
      g.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 1, 1);
    }
  };

  G.canvasTex = function (w, h, draw, repeat, smooth) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (!smooth) {
      t.magFilter = T.NearestFilter;
      t.minFilter = T.NearestFilter;
      t.generateMipmaps = false;
    }
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  };

  G.textTex = function (text, o) {
    o = Object.assign({ w: 128, h: 32, bg: '#1b3a8a', fg: '#ffd23f', size: 20, border: '#ffd23f' }, o || {});
    return G.canvasTex(o.w, o.h, (g, w, h) => {
      if (o.bg) {
        g.fillStyle = o.bg;
        g.fillRect(0, 0, w, h);
      }
      if (o.border) {
        g.strokeStyle = o.border;
        g.lineWidth = 2;
        g.strokeRect(1, 1, w - 2, h - 2);
      }
      g.fillStyle = o.fg;
      g.font = `bold ${o.size}px Arial, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.direction = 'rtl';
      g.fillText(text, w / 2, h / 2 + 1);
    });
  };

  G.glowTex = function (rgb) {
    return G.canvasTex(
      64,
      64,
      (g) => {
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, `rgba(${rgb},1)`);
        gr.addColorStop(0.45, `rgba(${rgb},0.45)`);
        gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
      },
      false,
      true
    );
  };

  // סמלים מרחפים מעל דמויות
  const ICONS = {
    alert: ['!', '#ffd23f', '#13213f'],
    mission: ['!', '#3b6fd8', '#ffd23f'],
    hint: ['?', '#dfe7f5', '#13213f'],
    ok: ['✓', '#3ecf72', '#ffffff'],
    wait: ['…', '#9aa3b5', '#13213f'],
    music: ['♫', '#9b59b6', '#ffffff'],
    star: ['★', '#ffd23f', '#c0392b'],
    hey: ['!', '#ffffff', '#c0392b'],
    event: ['✦', '#b07cff', '#ffffff'],
  };
  const iconMats = {};
  G.iconMat = function (kind) {
    if (iconMats[kind]) return iconMats[kind];
    const [ch, bg, fg] = ICONS[kind];
    const tex = G.canvasTex(32, 32, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.arc(16, 18, 13, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = bg;
      g.beginPath();
      g.arc(16, 15, 13, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#13213f';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = fg;
      g.font = 'bold 19px Arial, "Segoe UI Symbol", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(ch, 16, 16);
    });
    iconMats[kind] = new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    return iconMats[kind];
  };
  G.makeIcon = function (kind) {
    const s = new T.Sprite(G.iconMat(kind || 'alert'));
    s.scale.set(1.25, 1.25, 1);
    s.renderOrder = 20;
    s.userData.kind = kind || 'alert';
    return s;
  };
})();
