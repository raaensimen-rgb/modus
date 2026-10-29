/* MODUS learning premises · quarterly acknowledgement */
(function () {
  "use strict";
  const KEY = "modus-learning-premises-v1";
  const MONTHS = 3;
  const PREVIEW_DISMISS_KEY = "modus-premises-preview-dismissed";
  const route = location.pathname.split("/").pop().toLowerCase();
  const isPlus = route === "modus-plus.html";
  function isDue() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return true;
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Number.isFinite(data.accepted)) return true;
      const expiration = new Date(data.accepted);
      expiration.setMonth(expiration.getMonth() + MONTHS);
      return Date.now() >= expiration.getTime();
    } catch (_) { return true; }
  }
  function remember() {
    try { localStorage.setItem(KEY, JSON.stringify({version: 1, accepted: Date.now()})); } catch (_) {}
  }
  function createNotice() {
    if (document.getElementById("modus-premises-note")) return;
    const section = document.createElement("section");
    section.id = "modus-premises-note";
    section.className = "modus-premises-note";
    section.setAttribute("aria-label", "Viktig om MODUS+");
    section.innerHTML = '<strong>Viktig om MODUS+</strong><p>MODUS er et supplement til egen læring – ikke en komplett eller akkreditert musikkutdannelse. Forklaringer og verktøy er ment som en faglig grunnmur for videre utforskning, ikke som eneste fasit. MODUS+ er foreløpig et konsept, ikke et aktivt abonnement.</p>';
    const main = document.querySelector("main");
    if (main) main.prepend(section);
  }
  function createDialog() {
    if (!isDue()) return;
    try { if (sessionStorage.getItem(PREVIEW_DISMISS_KEY) === "1") return; } catch (_) {}
    const dialog = document.createElement("dialog");
    dialog.className = "modus-premises-dialog";
    dialog.setAttribute("aria-labelledby", "modus-premises-title");
    dialog.innerHTML = '<button type="button" class="modus-premises-close" aria-label="Lukk informasjonsboksen (testmodus)" title="Lukk for denne økten">×</button><div class="modus-premises-inner"><span class="modus-premises-eyebrow">FØR DU UTFORSKER</span><h2 id="modus-premises-title">Lær, forstå og finn din egen vei.</h2><p>MODUS bygger på dokumentert eget studiearbeid og musikkfaglig kvalitetssikring. Vi ønsker å gi deg en grunnmur for videre læring – ikke en endelig fasit på musikk.</p><p>Innholdet er veiledning og et supplement til egen øving, utforskning og eventuell undervisning med lærer. MODUS er ikke en komplett eller akkreditert utdanning, og gir ikke studiepoeng.</p><form method="dialog" id="modus-premises-form"><label class="modus-premises-check"><input type="checkbox" id="modus-premises-accept" required><span>Jeg har lest og forstått hva MODUS er ment å være.</span></label><button type="submit" class="modus-premises-confirm" disabled>Fortsett til MODUS</button></form><p class="modus-premises-fine">Du blir bedt om å bekrefte dette igjen etter tre måneder på denne nettleseren.</p></div>';
    document.body.append(dialog);
    dialog.querySelector(".modus-premises-close").addEventListener("click", () => {
      try { sessionStorage.setItem(PREVIEW_DISMISS_KEY, "1"); } catch (_) {}
      dialog.close();
    });
    const input = dialog.querySelector("#modus-premises-accept");
    const button = dialog.querySelector(".modus-premises-confirm");
    input.addEventListener("change", () => { button.disabled = !input.checked; });
    dialog.querySelector("form").addEventListener("submit", (event) => {
      if (!input.checked) { event.preventDefault(); return; }
      remember();
    });
    dialog.addEventListener("cancel", e => e.preventDefault());
    dialog.addEventListener("click", e => { if (e.target === dialog) e.preventDefault(); });
    if (typeof dialog.showModal === "function") dialog.showModal();
    else { dialog.setAttribute("open", ""); }
  }
  document.addEventListener("DOMContentLoaded", () => { if (isPlus) createNotice(); createDialog(); });
})();