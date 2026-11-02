// המשחק כאפליקציה מותקנת (PWA).
// תמיד קודם מהרשת — כך כל Commit+Push מגיע מיד למי שהתקין. רק בלי אינטרנט משתמשים במה שנשמר בטלפון.
// נשמר רק מה שהמשחק כבר הוריד (בלי הורדה מראש של כל הדמויות), ולכל קובץ נשמרת רק הגרסה האחרונה (?v=).
const CACHE = 'shluchim-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  // שירים (נטענים בחלקים) ואתרים אחרים (גופנים) — כרגיל, בלי שמירה
  if (url.origin !== location.origin || url.pathname.includes('/music/')) return;
  // הדף עצמו תמיד נבדק מול האתר (בלי מטמון הדפדפן), כדי שגרסה חדשה תגיע כבר בפתיחה הבאה
  const net = req.mode === 'navigate' ? new Request(req, { cache: 'no-cache' }) : req;
  e.respondWith(
    fetch(net)
      .then((res) => {
        if (res.status === 200 && res.type === 'basic' && !res.redirected) {
          const copy = res.clone();
          e.waitUntil(store(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match(req, { ignoreSearch: true })).then((r) => r || Response.error()))
  );
});

async function store(req, res) {
  const c = await caches.open(CACHE);
  const u = new URL(req.url);
  // גרסה ישנה של אותו קובץ (?v= אחר) נמחקת
  for (const k of await c.keys()) {
    const ku = new URL(k.url);
    if (ku.pathname === u.pathname && ku.search !== u.search) await c.delete(k);
  }
  await c.put(req, res);
}
