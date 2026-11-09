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
  let entries = null, loading = null, loadFailed = false;
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
    if (!entries) {
      status.textContent = loadFailed
        ? (english ? "Search is temporarily unavailable. Close and reopen to retry." : "Søket er midlertidig utilgjengelig. Lukk og åpne for å prøve igjen.")
        : (english ? "Loading search index…" : "Laster søkeindeks…");
      return;
    }
    if (!q) { status.textContent = english ? "Type to search MODUS." : "Skriv for å søke i MODUS."; return; }
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
    if (loading) return loading;
    loadFailed = false;
    render();
    loading = (async () => {
      try {
        const response = await fetch(root + "search-index.json");
        if (!response.ok) throw new Error("Search index unavailable");
        const data = await response.json();
        if (!Array.isArray(data) || !data.every(item => item &&
            typeof item.title === "string" && typeof item.description === "string" &&
            typeof item.url === "string" && /^[a-z0-9][a-z0-9/-]*\.html$/.test(item.url) &&
            !item.url.split("/").includes(".."))) throw new Error("Invalid search index");
        entries = data;
      } catch (_) { loadFailed = true; }
      finally { loading = null; render(); }
    })();
    return loading;
  }
  function closeSearch() {
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener("close", () => trigger.focus());
  // Own Escape before target handlers/default actions. The text input with
  // role=searchbox avoids Safari's native type=search Escape-to-clear action.
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !dialog.open || event.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    closeSearch();
  }, true);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeSearch();
  });
  trigger.addEventListener("click",open);
  dialog.querySelector("[data-global-search-close]").addEventListener("click",closeSearch);
  dialog.addEventListener("click",event=>{if(event.target===dialog)closeSearch();});
  input.addEventListener("input",render);
  document.addEventListener("keydown",event=>{
    if ((event.metaKey||event.ctrlKey) && event.key.toLowerCase()==="k") {event.preventDefault();open();}
  });
})();
