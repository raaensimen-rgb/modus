/* MODUS learning premises · one acknowledgement per browsing flow, reset on reload */
(function () {
  "use strict";
  const FLOW_KEY = "modus-premises-accepted-current-flow";
  const navigationEntry = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  const isReload = navigationEntry ? navigationEntry.type === "reload" : performance.navigation && performance.navigation.type === 1;
  // A manual refresh starts a fresh acknowledgement flow.
  try { if (isReload) sessionStorage.removeItem(FLOW_KEY); } catch (_) {}
  const route = location.pathname.split("/").pop().toLowerCase();
  const isPlus = route === "modus-plus.html";
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
    try { if (sessionStorage.getItem(FLOW_KEY) === "1") return; } catch (_) {}
    const dialog = document.createElement("dialog");
    dialog.className = "modus-premises-dialog";
    dialog.setAttribute("aria-labelledby", "modus-premises-title");
    dialog.innerHTML = '<div class="modus-premises-inner"><span class="modus-premises-eyebrow">FØR DU UTFORSKER</span><h2 id="modus-premises-title">Lær, forstå og finn din egen vei.</h2><p>MODUS bygger på dokumentert eget studiearbeid og musikkfaglig kvalitetssikring. Vi ønsker å gi deg en grunnmur for videre læring – ikke en endelig fasit på musikk.</p><p>Innholdet er veiledning og et supplement til egen øving, utforskning og eventuell undervisning med lærer. MODUS er ikke en komplett eller akkreditert utdanning, og gir ikke studiepoeng.</p><form method="dialog" id="modus-premises-form"><label class="modus-premises-check"><input type="checkbox" id="modus-premises-accept" required><span>Jeg har lest og forstått.</span></label><button type="submit" class="modus-premises-confirm" disabled>Fortsett til MODUS</button></form><p class="modus-premises-fine">Bekreftelsen gjelder mens du navigerer på MODUS. Oppdaterer du siden, vises den på nytt.</p></div>';
    document.body.append(dialog);
    const input = dialog.querySelector("#modus-premises-accept");
    const button = dialog.querySelector(".modus-premises-confirm");
    input.addEventListener("change", () => { button.disabled = !input.checked; });
    dialog.querySelector("form").addEventListener("submit", (event) => {
      if (!input.checked) { event.preventDefault(); return; }
      try { sessionStorage.setItem(FLOW_KEY, "1"); } catch (_) {}
    });
    dialog.addEventListener("cancel", e => e.preventDefault());
    dialog.addEventListener("click", e => { if (e.target === dialog) e.preventDefault(); });
    if (typeof dialog.showModal === "function") dialog.showModal();
    else { dialog.setAttribute("open", ""); }
  }
  document.addEventListener("DOMContentLoaded", () => { if (isPlus) createNotice(); createDialog(); });
})();