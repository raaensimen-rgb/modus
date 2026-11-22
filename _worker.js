// SEC-PUB-01: exact withdrawn resource boundary, before ASSETS/cache access.
const reserved = new Set(["/_worker.js", "/_routes.json"]);
const withdrawn = new Set([
  "/artikler/modus-verify-01-privat-testutkast",
  "/artikler/modus-verify-01-privat-testutkast.html",
  "/images/editorial-cards/modus-verify-01-privat-testutkast-nb-5815fcfc038f.jpg"
]);
export default {
  async fetch(request, env) {
    let path = new URL(request.url).pathname;
    try { path = decodeURIComponent(path); } catch { /* Keep the literal invalid URL. */ }
    if (path.endsWith('/')) path = path.slice(0, -1);
    if (withdrawn.has(path) || reserved.has(path)) {
      return new Response(request.method === 'HEAD' ? null : 'Not found.\n', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex'
        }
      });
    }
    return env.ASSETS.fetch(request);
  }
};
