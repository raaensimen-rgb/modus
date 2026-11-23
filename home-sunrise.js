(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: no-preference) and (forced-colors: none)');
  if (!motion.matches || ['readable', 'contrast'].includes(root.dataset.theme) || location.hash) return;
  const key = 'modus-home-sunrise-v1';
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    return;
  }

  const listeners = new AbortController();
  const options = { capture: true, signal: listeners.signal };
  const timeout = setTimeout(finish, 2100);

  function finish() {
    root.classList.remove('home-sunrise');
    clearTimeout(timeout);
    listeners.abort();
  }

  for (const event of ['pointerdown', 'keydown', 'focusin', 'wheel', 'pagehide']) {
    addEventListener(event, finish, options);
  }
  addEventListener('animationend', event => {
    if (event.animationName === 'dawn-clear') finish();
  }, options);
  motion.addEventListener('change', finish, options);
  root.classList.add('home-sunrise');
})();
