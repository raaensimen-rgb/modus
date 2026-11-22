(function () {
  "use strict";

  const key = "modus.article-path.v1";
  const quizPrefix = "modus.article-quiz.v1.";

  function createProgress(storage, ids) {
    let state = { read: {}, last: null };
    function refresh() {
      try {
        const saved = JSON.parse(storage.getItem(key));
        if (!saved || typeof saved !== "object") return;
        state = {
          read: Object.fromEntries(ids.filter(id => saved.read?.[id] === true).map(id => [id, true])),
          last: ids.includes(saved.last) ? saved.last : null,
        };
      } catch (_) { /* Use memory when storage is unavailable. */ }
    }
    function write() {
      try { storage.setItem(key, JSON.stringify(state)); return true; }
      catch (_) { return false; }
    }
    refresh();
    return {
      refresh,
      mark(id, read) {
        if (!ids.includes(id)) return false;
        refresh();
        if (read) state.read[id] = true;
        else delete state.read[id];
        return write();
      },
      visit(id) {
        if (!ids.includes(id)) return false;
        refresh();
        state.last = id;
        return write();
      },
      status(id) {
        if (!ids.includes(id)) return "remaining";
        try { if (storage.getItem(quizPrefix + id) === "passed") return "reviewed"; }
        catch (_) { /* Read status can still be tracked in memory. */ }
        return state.read[id] ? "read" : "remaining";
      },
      last() { return state.last; },
    };
  }

  function summarize(ids, progress) {
    const reviewed = ids.filter(id => progress.status(id) === "reviewed").length;
    const last = progress.last();
    const next = ids.find(id => progress.status(id) === "remaining")
      ?? ids.find(id => progress.status(id) === "read") ?? null;
    return { reviewed, next, resume: last && progress.status(last) === "remaining" ? last : next };
  }

  if (typeof module !== "undefined") module.exports = { createProgress, summarize };
  if (typeof document === "undefined") return;
  const root = document.querySelector("[data-lesesti]");
  const article = document.querySelector("[data-lesesti-article]");
  if (!root && !article) return;

  let storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  const cards = [...document.querySelectorAll("[data-path-step]")];
  const ids = cards.length ? cards.map(card => card.dataset.pathStep) : article.dataset.pathIds.split(",");
  const progress = createProgress(storage, ids);
  const en = document.documentElement.lang === "en";
  const t = (nb, english) => en ? english : nb;
  const warning = document.querySelector("[data-path-warning]");
  function notify(saved) {
    if (warning) warning.hidden = saved;
  }

  if (article) {
    const id = article.dataset.lesestiArticle;
    const mark = article.querySelector("button");
    function renderArticle() {
      progress.refresh();
      const status = progress.status(id);
      mark.disabled = status === "reviewed";
      mark.setAttribute("aria-pressed", String(status !== "remaining"));
      mark.textContent = status === "reviewed" ? t("Gjennomgått", "Reviewed")
        : status === "read" ? t("Lest", "Read") : t("Marker som lest", "Mark as read");
    }
    if (new URLSearchParams(location.search).get("fra") === "lesesti") notify(progress.visit(id));
    mark.addEventListener("click", () => {
      notify(progress.mark(id, progress.status(id) !== "read"));
      renderArticle();
    });
    window.addEventListener("pageshow", renderArticle);
    document.addEventListener("modus-account-change", renderArticle);
    renderArticle();
    return;
  }

  const meter = root.querySelector("progress");
  const count = root.querySelector("[data-path-count]");
  const resumeLink = root.querySelector("[data-path-resume]");
  const completed = root.querySelector("[data-path-complete]");
  function render() {
    progress.refresh();
    const { reviewed, next, resume } = summarize(ids, progress);
    meter.value = reviewed;
    count.textContent = t(`${reviewed} av ${ids.length} gjennomgått`, `${reviewed} of ${ids.length} reviewed`);
    let resumeCard = null;
    for (const card of cards) {
      const id = card.dataset.pathStep;
      const status = progress.status(id);
      card.classList.toggle("is-next", id === next);
      card.querySelector("[data-path-status]").textContent = status === "reviewed" ? t("Gjennomgått", "Reviewed")
        : status === "read" ? t("Lest", "Read") : id === next ? t("Neste", "Next") : t("Gjenstår", "To do");
      if (id === resume) resumeCard = card;
    }
    completed.hidden = reviewed !== ids.length;
    resumeLink.hidden = !resumeCard;
    if (resumeCard) {
      const isReview = progress.status(resume) === "read";
      resumeLink.href = resumeCard.querySelector("[data-path-open]").href + (isReview ? "#quiz" : "");
      resumeLink.textContent = isReview ? t("Gå til neste quiz", "Go to the next quiz")
        : reviewed === 0 && !progress.last() ? t("Start lesestien", "Start reading")
        : t("Fortsett der du slapp", "Continue reading");
    }
  }
  root.addEventListener("click", event => {
    const link = event.target.closest("[data-path-open]");
    const id = link?.closest("[data-path-step]")?.dataset.pathStep;
    if (id) notify(progress.visit(id));
  });
  window.addEventListener("pageshow", render);
  window.addEventListener("storage", render);
  document.addEventListener("modus-account-change", render);
  render();
})();
