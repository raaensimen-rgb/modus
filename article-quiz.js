(async function () {
  'use strict';
  const IDS = ["toner-og-intervaller", "dur-og-moll", "kvintsirkelen", "din-forste-improvisasjon", "moduser-og-tonalt-sentrum", "ii-v-i-kadensen", "septimakkorder", "harmonisk-moll-og-frygisk-dominant", "stemmeforing", "rytme-i-sju-aatte", "bygg-akkorder-i-en-toneart", "ett-skalakart-nye-maltoner", "dorisk-og-eolisk"];
  if(typeof window!=='undefined') IDS.push(...(window.MODUS_CMS_IDS||[]).filter(id=>!IDS.includes(id)));
  const prefix = 'modus.article-quiz.v1.';
  function grade(answers, expected) {
    const correct = expected.map((answer, i) => Number.isInteger(answers[i]) && answers[i] === answer);
    return {correct, score:correct.filter(Boolean).length, passed:expected.length > 0 && correct.every(Boolean)};
  }
  function progress(storage) {
    const memory = new Set();
    return {
      has(id) { if (!IDS.includes(id)) return false; try { return storage.getItem(prefix + id) === 'passed' || memory.has(id); } catch (_) { return memory.has(id); } },
      pass(id) { if (!IDS.includes(id)) return false; memory.add(id); try { storage.setItem(prefix + id, 'passed'); return true; } catch (_) { return false; } }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {grade, progress, IDS};
  if (typeof document === 'undefined') return;
  let storage; try { storage = window.localStorage; } catch (_) { storage = null; }
  const account = window.ModusAccount;
  if (account) await account.ready;
  const saved = account || progress(storage), en = document.documentElement.lang === 'en';
  const t = (nb, english) => en ? english : nb;
  const cards = [...document.querySelectorAll('[data-article-id]')];
  function updateCards() {
    cards.forEach(card => {
      const done = saved.has(card.dataset.articleId);
      card.classList.toggle('is-complete', done);
      card.querySelector('.card-quiz-status').textContent = done ? t('✓ Quiz fullført','✓ Quiz complete') : t('3 spørsmål','3 questions');
      const link = card.querySelector('.card-quiz-link');
      link.textContent = done ? t('Repeter ↗','Retake ↗') : t('Ta quizen ↗','Take the quiz ↗');
      link.setAttribute('aria-label', link.textContent.replace(' ↗','') + ': ' + card.querySelector('h2').textContent);
    });
    const total = document.getElementById('articleProgress');
    if (total) {
      const count = cards.filter(card => saved.has(card.dataset.articleId)).length;
      total.textContent = en ? `${count} of ${cards.length} quizzes completed` : `${count} av ${cards.length} quizer fullført`;
    }
  }
  updateCards();
  window.addEventListener('storage', updateCards);
  document.addEventListener('modus-account-change', updateCards);
  window.addEventListener('pageshow', updateCards);
  const quiz = document.querySelector('[data-quiz-id]');
  if (!quiz) return;
  const form = quiz.querySelector('form'), fields = [...form.querySelectorAll('fieldset')];
  const result = quiz.querySelector('.quiz-result'), complete = quiz.querySelector('.quiz-complete');
  const submit = form.querySelector('[type=submit]'), retry = form.querySelector('.quiz-retry');
  const id = quiz.dataset.quizId;
  if (saved.has(id)) { complete.hidden = false; form.hidden = true; }
  let quizOwner = account?.user?.id || 'guest';
  document.addEventListener('modus-account-change', () => {
    const nextOwner = account?.user?.id || 'guest';
    if (nextOwner !== quizOwner) {
      quizOwner = nextOwner; clearAttempt(false);
      complete.hidden = !saved.has(id); form.hidden = saved.has(id);
    } else if (!form.querySelector('input:checked') && saved.has(id)) {
      complete.hidden = false; form.hidden = true;
    }
  });
  function clearAttempt(focus = true) {
    form.reset(); form.hidden = false; submit.hidden = false; retry.hidden = true; result.textContent = '';
    fields.forEach(field => {
      field.classList.remove('is-correct','is-incorrect');
      field.querySelector('.quiz-feedback').hidden = true;
      field.querySelectorAll('input').forEach(input => { input.disabled = false; });
    });
    if (focus) fields[0].querySelector('input').focus();
  }
  quiz.querySelector('.quiz-retake').addEventListener('click', clearAttempt);
  retry.addEventListener('click', clearAttempt);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const attempt = grade(fields.map(field => {
      const input = field.querySelector('input:checked'); return input ? Number(input.value) : null;
    }), fields.map(field => Number(field.dataset.answer)));
    fields.forEach((field, i) => {
      field.classList.toggle('is-correct', attempt.correct[i]);
      field.classList.toggle('is-incorrect', !attempt.correct[i]);
      field.querySelector('.quiz-verdict').textContent = attempt.correct[i] ? t('✓ Riktig','✓ Correct') : t('Se forklaringen','Review the explanation');
      field.querySelector('.quiz-feedback').hidden = false;
      field.querySelectorAll('input').forEach(input => { input.disabled = true; });
    });
    submit.hidden = true;
    if (attempt.passed) {
      const savedResult = await saved.pass(id);
      const persisted = typeof savedResult === 'object' ? savedResult.saved : savedResult;
      complete.hidden = false;
      result.textContent = savedResult.where === 'pending' ? t('3 av 3 riktige. Lagret på denne enheten; venter på synkronisering.','3 of 3 correct. Saved on this device; waiting to sync.') : savedResult.where === 'account' ? t('3 av 3 riktige. Fullføringen er lagret på kontoen din.','3 of 3 correct. Completion is saved to your account.') : persisted ? t('3 av 3 riktige. Fullføringen er lagret.','3 of 3 correct. Completion saved.') : t('3 av 3 riktige. Nettleseren kunne ikke lagre fullføringen.','3 of 3 correct. This browser could not save completion.');
    } else {
      retry.hidden = false;
      result.textContent = en ? `${attempt.score} of 3 correct. Read the explanations and try again.` : `${attempt.score} av 3 riktige. Les forklaringene og prøv igjen.`;
    }
    result.focus();
  });
}());
