// Script de rastreamento para a página de vendas:
//   <script src="https://SEU-DOMINIO/utm.js" async></script>
// Guarda as UTMs da visita (30 dias) e repassa para os links de checkout.

const SCRIPT = `(function () {
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck", "fbclid"];
  var STORE = "fy_utms";
  var TTL = 30 * 24 * 60 * 60 * 1000;
  var CHECKOUT = /(^|\\.)(cakto\\.com\\.br|pay\\.cakto\\.com\\.br)$/i;

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE) || "null");
      if (raw && Date.now() - raw.t < TTL) return raw.p;
    } catch (e) {}
    return null;
  }

  var url = new URL(location.href);
  var fromUrl = {};
  var hasUrl = false;
  KEYS.forEach(function (k) {
    var v = url.searchParams.get(k);
    if (v) { fromUrl[k] = v; hasUrl = true; }
  });
  if (hasUrl) {
    try { localStorage.setItem(STORE, JSON.stringify({ t: Date.now(), p: fromUrl })); } catch (e) {}
  }
  var params = hasUrl ? fromUrl : read();
  if (!params) return;

  function decorate(a) {
    if (!a || !a.href || a.dataset.fyDone) return;
    try {
      var u = new URL(a.href, location.href);
      if (!CHECKOUT.test(u.hostname) && !a.hasAttribute("data-fy-checkout")) return;
      Object.keys(params).forEach(function (k) {
        if (!u.searchParams.get(k)) u.searchParams.set(k, params[k]);
      });
      a.href = u.toString();
      a.dataset.fyDone = "1";
    } catch (e) {}
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll("a[href]") : []).forEach(decorate);
  }

  function start() {
    scan(document);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === "A") decorate(n);
          scan(n);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
    // links trocados por JS na hora do clique
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (a) { delete a.dataset.fyDone; decorate(a); }
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
