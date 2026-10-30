(() => {
  "use strict";
  const dialog = document.querySelector("[data-global-search-dialog]");
  const trigger = document.querySelector("[data-global-search-open]");
  if (!dialog || !trigger) return;
  const input = dialog.querySelector("[data-global-search-input]");
  const results = dialog.querySelector("[data-global-search-results]");
  const status = dialog.querySelector("[data-global-search-status]");
  const english = location.pathname.startsWith("/en/");
  const root = english ? "/en/" : "/";
  let entries = null;
  const normalize = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/æ/g,"ae").replace(/ø/g,"o").replace(/å/g,"a").trim();
  function rank(entry, q) {
    const title = normalize(entry.title), description = normalize(entry.description), keywords = normalize(entry.keywords);
    if (title === q) return 100;
    if (title.startsWith(q)) return 80;
    if (title.includes(q)) return 60;
    if (keywords.includes(q)) return 35;
    if (description.includes(q)) return 15;
    const terms = q.split(/\s+/).filter(Boolean);
    return terms.length > 1 && terms.every(t => (title+" "+keywords+" "+description).includes(t)) ? 10 : 0;
  }
  function render() {
    results.replaceChildren();
    const q = normalize(input.value);
    if (!q) { status.textContent = english ? "Type to search MODUS." : "Skriv for å søke i MODUS."; return; }
    if (!entries) { status.textContent = english ? "Loading search index…" : "Laster søkeindeks…"; return; }
    const matched = entries.map(item => ({...item,score:rank(item,q)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,12);
    status.textContent = matched.length ? (english ? matched.length+" results" : matched.length+" treff") : (english ? "No matches. Try another term." : "Ingen treff. Prøv et annet søkeord.");
    for (const item of matched) {
      const link = document.createElement("a"); link.href = root + item.url; link.className = "global-search-result";
      const title = document.createElement("strong"); title.textContent = item.title;
      const detail = document.createElement("small"); detail.textContent = item.description;
      link.append(title,detail); results.append(link);
    }
  }
  async function open() {
    if (!dialog.open) dialog.showModal();
    input.focus();
    if (entries) {render();return;}
    try {
      const response = await fetch(root + "search-index.json");
      if (!response.ok) throw new Error("Search index unavailable");
      entries = await response.json(); render();
    } catch (_) {status.textContent = english ? "Search is temporarily unavailable." : "Søket er midlertidig utilgjengelig.";}
  }
  trigger.addEventListener("click",open);
  dialog.querySelector("[data-global-search-close]").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  input.addEventListener("input",render);
  document.addEventListener("keydown",event=>{
    if ((event.metaKey||event.ctrlKey) && event.key.toLowerCase()==="k") {event.preventDefault();open();}
  });
})();
