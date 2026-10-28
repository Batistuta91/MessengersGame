// אוצרות נסתרים: ״דפי תניא״ מפוזרים בעיר — מוצאים, אוספים, ומקבלים פרס כשמשלימים
(function () {
  'use strict';
  const G = window.G, T = THREE;

  G.makeCollectibles = function (api) {
    const { scene, W, A, player } = api;
    if (!W.paths || !W.paths.length) return null;
    const S = () => api.S;
    const city = W.cityId || 'hod';
    const COUNT = W.HALF > 1000 ? 18 : 12;
    // מיקומים קבועים לכל עיר (אותו זרע תמיד), על מדרכות, רחוקים זה מזה
    const r = G.rng(city === 'pt' ? 7700 : 1100);
    const spots = [];
    const lim = W.HALF - 60;
    for (let k = 0; k < 4000 && spots.length < COUNT; k++) {
      const p = W.paths[(r() * W.paths.length) | 0];
      const pt = p.pts[(r() * p.pts.length) | 0];
      const x = pt[0], z = pt[1];
      if (Math.abs(x) > lim || Math.abs(z) > lim) continue;
      if (W.collide(x, z, 0.8).hit) continue;
      const minD = city === 'pt' ? 380 : 140;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < minD)) continue;
      spots.push({ x, z });
    }
    if (!S().collect) S().collect = {};
    const got = () => S().collect[city] || (S().collect[city] = []);

    // מראה: דף זהוב מסתובב עם הילה
    const pageTex = G.canvasTex(32, 40, (g) => {
      g.fillStyle = '#f7ecc8';
      g.fillRect(0, 0, 32, 40);
      g.strokeStyle = '#c9a227';
      g.lineWidth = 2;
      g.strokeRect(1, 1, 30, 38);
      g.fillStyle = '#7b4a12';
      g.font = 'bold 11px Arial';
      g.textAlign = 'center';
      g.fillText('תניא', 16, 13);
      g.fillStyle = '#9a7a4a';
      for (let y = 19; y < 36; y += 4) g.fillRect(5, y, 22, 1);
    });
    const pageMat = new T.MeshBasicMaterial({ map: pageTex, side: T.DoubleSide });
    const glowMat = new T.SpriteMaterial({ map: G.glowTex('255,214,100'), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const items = spots.map((s, i) => {
      const g = new T.Group();
      const page = new T.Mesh(new T.PlaneGeometry(0.6, 0.75), pageMat);
      page.position.y = 1.3;
      const glow = new T.Sprite(glowMat);
      glow.scale.set(2.4, 2.4, 1);
      glow.position.y = 1.3;
      g.add(glow, page);
      g.position.set(s.x, 0, s.z);
      g.visible = false;
      scene.add(g);
      return { i, x: s.x, z: s.z, g, page };
    });
    let visT = 0;
    function update(dt, t) {
      const list = got();
      const px = player.x, pz = player.z;
      visT -= dt;
      for (const it of items) {
        if (list.includes(it.i)) {
          it.g.visible = false;
          continue;
        }
        const d = Math.hypot(it.x - px, it.z - pz);
        if (visT <= 0 || d < 30) it.g.visible = d < 260;
        it.page.rotation.y = t * 2 + it.i;
        it.page.position.y = 1.3 + Math.sin(t * 2.5 + it.i) * 0.15;
        // אוספים ברגל או ברכב
        if (d < 2.4) {
          list.push(it.i);
          it.g.visible = false;
          A.success();
          api.addJoy(3);
          const n = list.length;
          if (n >= items.length) {
            api.addJoy(15);
            api.addCommunity(2);
            api.toast('📜 מצאתם את כל ' + items.length + ' דפי התניא ב' + W.cityName + '! ״כל ישראל ערבים זה בזה״ +15 שמחה', 'gold');
            A.cheer && A.cheer();
          } else api.toast('📜 מצאתם דף תניא! ' + n + '/' + items.length + ' · +3 שמחה', 'gold');
          api.save();
        }
      }
      if (visT <= 0) visT = 0.5;
    }
    return {
      update,
      get found() {
        return got().length;
      },
      total: items.length,
      // לבדיקות: מיקומי הדפים
      spots: items.map((it) => ({ x: it.x, z: it.z })),
    };
  };
})();
