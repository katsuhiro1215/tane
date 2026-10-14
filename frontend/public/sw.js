const CACHE_NAME = "tane-cache-v2";
const APP_SHELL = ["/manifest.json", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  // 音声はRange要求(206)で読まれる。キャッシュから返すとSafariで鳴らなくなり、206はcache.putもできないため素通りさせる
  const url = new URL(request.url);
  if (request.headers.has("range") || url.pathname.startsWith("/sounds/")) {
    return;
  }

  // ページ遷移(HTML)は常に最新を優先する。cache-firstだと初回に保存した
  // バージョンに固定され、新しいデプロイが端末に届かなくなるため。
  // オフライン時のみキャッシュ(無ければトップページ)にフォールバックする。
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? caches.match("/"))
      )
    );
    return;
  }

  // 静的アセットはstale-while-revalidate: あればすぐキャッシュを返しつつ、
  // 裏で最新を取得してキャッシュを更新する。
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => cached);
      return cached ?? fetchPromise;
    })
  );
});
