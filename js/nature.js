// עצים ודקלים אמיתיים (Quaternius Ultimate Nature Pack, CC0) מתוך data/nature.js
// העלווה מסומנת — צבע המופע *מכפיל* אותה (גוון קצת שונה לכל עץ, בלי לאבד את הירוק הבהיר והכהה)
(function () {
  'use strict';
  const G = window.G, T = THREE;
  const D = window.NATURE_DATA;
  window.NATURE_DATA = null;
  if (!D || !G.buildPacked) return;

  const cache = {};
  let mat = null;
  // רוח: המשחק מקדם את הזמן; העצים מתנופפים לפי הגובה (הגזע כמעט לא זז, הצמרת כן)
  const wind = { value: 0 };
  G.NAT = {
    wind,
    trees: Object.keys(D).filter((k) => /^tree/.test(k)),
    palms: Object.keys(D).filter((k) => /^palm/.test(k)),
    geo: (k) => cache[k] || (cache[k] = G.buildPacked(D[k].all)),
    mat() {
      if (mat) return mat;
      mat = new T.MeshLambertMaterial({ vertexColors: true });
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uWind = wind;
        sh.vertexShader = 'attribute float aPaint;\nuniform float uWind;\n' + sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec2 wp = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
            float wh = max(position.y - 0.6, 0.0);
            float ws = sin(uWind * 1.3 + wp.x * 0.31 + wp.y * 0.17) + 0.45 * sin(uWind * 2.9 + wp.x * 0.07 - wp.y * 0.13);
            transformed.xz += vec2(1.0, 0.55) * ws * wh * wh * 0.009;
          #endif`
        ).replace(
          '#include <color_vertex>',
          `#if defined( USE_COLOR )
            vColor = vec3( 1.0 );
            vColor.xyz *= color.xyz;
          #endif
          #ifdef USE_INSTANCING_COLOR
            vColor.xyz *= mix( vec3( 1.0 ), instanceColor.xyz, aPaint );
          #endif`
        );
      };
      mat.customProgramCacheKey = () => 'natTint';
      return mat;
    },
  };
})();
