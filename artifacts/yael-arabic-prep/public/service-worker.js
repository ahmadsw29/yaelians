// Do not cache sessions, course bodies, translations, or API responses.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>كلمة — دون اتصال</title><body style="font:20px system-ui;background:#10201c;color:#f7f4ed;padding:40px;line-height:1.8"><h1>ننتظرك في كلمة</h1><p>تحتاج اتصالًا بالإنترنت لفتح التطبيق والتحقّق من اشتراكك. أعد الاتصال ثم حاول مرة أخرى.</p><button onclick="location.reload()" style="font:inherit;padding:12px 24px">حاول مجددًا</button></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )));
});
