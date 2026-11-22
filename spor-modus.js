(() => {
  "use strict";

  const english = document.documentElement.lang.toLowerCase().startsWith("en");
  const root = english ? "/en/" : "/";
  const copy = english ? {
    title: "Ask MODUS", close: "Close", prompt: "What would you like to find?",
    example: "Where can I learn about minor scales?", submit: "Find pages",
    loading: "Looking for pages…", found: "Here are some pages that might help.",
    empty: "No pages found. Try a topic such as intervals or chords.",
    error: "Search is temporarily unavailable. Try again."
  } : {
    title: "Spør MODUS", close: "Lukk", prompt: "Hva vil du finne på MODUS?",
    example: "Hvor kan jeg lære om moll?", submit: "Finn sider",
    loading: "Leter etter sider…", found: "Disse sidene kan hjelpe deg videre.",
    empty: "Fant ingen sider. Prøv et emne som intervaller eller akkorder.",
    error: "Søket er midlertidig utilgjengelig. Prøv igjen."
  };

  const normalize = value => String(value ?? "").toLowerCase().normalize("NFD")
    .replace(/\p{M}/gu, "").replaceAll("ø", "o").replaceAll("æ", "ae");
  const words = value => normalize(value).match(/[a-z0-9]+/g) ?? [];
  const stopWords = new Set(words(english
    ? "where can i learn about how do to find what is are a an the of on in for and me show modus please"
    : "hvor kan jeg lære om hvordan finner finne hva er en et det på i til å av for og med meg vis modus gjerne"));

  function rank(entry, terms) {
    const fields = [entry.title, entry.keywords, entry.description].map(value => new Set(words(value)));
    const weights = [10, 5, 3];
    return terms.reduce((total, term) => total + fields.reduce((score, field, index) => {
      if (field.has(term)) return score + weights[index];
      const stem = term.replace(english ? /s$/ : /(?:ene|er|en|et|s)$/, "");
      return stem.length >= 3 && [...field].some(word => word.startsWith(stem))
        ? score + weights[index] / 2
        : score;
    }, 0), 0);
  }

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "modus-assistant-open";
  trigger.textContent = copy.title;
  trigger.setAttribute("aria-haspopup", "dialog");

  const dialog = document.createElement("dialog");
  dialog.className = "global-search-dialog modus-assistant";
  dialog.setAttribute("aria-labelledby", "modus-assistant-title");
  dialog.innerHTML = `<div class="global-search-top">
    <h2 id="modus-assistant-title">${copy.title}</h2>
    <button type="button" data-close>${copy.close}</button>
  </div>
  <form>
    <label for="modus-assistant-question">${copy.prompt}</label>
    <input class="global-search-input" id="modus-assistant-question"
      placeholder="${copy.example}" maxlength="200" required autocomplete="off" autofocus>
    <button type="submit">${copy.submit}</button>
  </form>
  <p class="global-search-status" role="status"></p>
  <div class="global-search-results"></div>`;

  const form = dialog.querySelector("form");
  const input = dialog.querySelector("input");
  const status = dialog.querySelector("[role=status]");
  const results = dialog.querySelector(".global-search-results");
  const submit = form.querySelector("button");
  let index;

  trigger.addEventListener("click", () => dialog.showModal());
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => trigger.focus());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const terms = [...new Set(words(input.value).filter(word => !stopWords.has(word)))];
    results.replaceChildren();
    if (!terms.length) {
      status.textContent = copy.empty;
      return;
    }

    submit.disabled = true;
    status.textContent = copy.loading;
    try {
      if (!index) {
        const response = await fetch(root + "search-index.json");
        if (!response.ok) throw new Error("Search index unavailable");
        index = (await response.json()).filter(item => item &&
          typeof item.title === "string" && typeof item.description === "string" &&
          typeof item.url === "string" && /^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.html$/.test(item.url));
      }
      const matches = index.map(entry => ({ entry, score: rank(entry, terms) }))
        .filter(match => match.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);

      for (const { entry } of matches) {
        const link = document.createElement("a");
        link.className = "global-search-result";
        link.href = root + entry.url;
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const description = document.createElement("small");
        description.textContent = entry.description;
        link.append(title, description);
        results.append(link);
      }
      status.textContent = matches.length ? copy.found : copy.empty;
    } catch {
      status.textContent = copy.error;
    } finally {
      submit.disabled = false;
    }
  });

  document.body.append(trigger, dialog);
})();
