(() => {
  const strip = document.querySelector('.side-menu-toggle');
  const menu = document.querySelector('#side-menu');
  const heading = menu.querySelector('h2');
  const groups = menu.querySelectorAll('[data-group]');
  let button;
  let closeTimer;
  let hover = false;

  function position() {
    const rect = strip.getBoundingClientRect();
    const below = innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const useAbove = below < 290 && above > below;
    menu.style.setProperty('--side-menu-height', Math.max(80, useAbove ? above : below) + 'px');
    const icon = button.getBoundingClientRect();
    const halfWidth = menu.offsetWidth / 2;
    const center = Math.max(halfWidth + 8, Math.min(document.documentElement.clientWidth - halfWidth - 8, icon.left + icon.width / 2));
    menu.style.setProperty('--side-menu-center', center + 'px');
    const top = useAbove ? rect.top - menu.offsetHeight - 6 : rect.bottom + 6;
    menu.style.setProperty('--side-menu-top', Math.max(8, top) + 'px');
  }

  function open(trigger, byHover) {
    clearTimeout(closeTimer);
    if (button === trigger && menu.open && byHover) return;
    if (button) button.setAttribute('aria-expanded', 'false');
    button = trigger;
    hover = byHover;
    heading.replaceChildren(trigger.querySelector('.side-row-icon').cloneNode(true), trigger.getAttribute('aria-label'));
    for (const group of groups) group.hidden = group.dataset.group !== trigger.dataset.menu;
    if (byHover) menu.setAttribute('open', '');
    else {
      if (menu.open) menu.close();
      menu.showModal();
    }
    trigger.setAttribute('aria-expanded', 'true');
    position();
  }

  function close() {
    clearTimeout(closeTimer);
    if (!menu.open) return;
    const restore = !hover || menu.contains(document.activeElement);
    menu.close();
    button.setAttribute('aria-expanded', 'false');
    if (restore) button.focus();
  }

  function scheduleClose() {
    if (!hover || !menu.open) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 240);
  }

  for (const item of strip.children) {
    item.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || menu.matches(':modal')) return;
      if (item.dataset.menu) open(item, true);
      else close();
    });
    if (item.dataset.menu) item.addEventListener('click', () => open(item, false));
  }
  strip.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  strip.addEventListener('pointerleave', scheduleClose);
  menu.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  menu.addEventListener('pointerleave', scheduleClose);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open && hover) close();
  });
  menu.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !strip.contains(event.target)) close();
  });
  menu.addEventListener('click', event => {
    if (event.target !== menu || !menu.matches(':modal')) return;
    const rect = menu.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  addEventListener('resize', () => { if (menu.open) position(); });
  addEventListener('scroll', () => { if (menu.open) position(); }, { passive: true });
})();
