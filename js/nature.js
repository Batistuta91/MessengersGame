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
  G.NAT = {
    trees: Object.keys(D).filter((k) => /^tree/.test(k)),
    palms: Object.keys(D).filter((k) => /^palm/.test(k)),
    geo: (k) => cache[k] || (cache[k] = G.buildPacked(D[k].all)),
    mat() {
      if (mat) return mat;
      mat = new T.MeshLambertMaterial({ vertexColors: true });
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = 'attribute float aPaint;\n' + sh.vertexShader.replace(
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
