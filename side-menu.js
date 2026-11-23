(() => {
  const strip = document.querySelector('.side-menu-toggle');
  const menu = document.querySelector('#side-menu');
  if (!strip || !menu) return;
  const plus = strip.lastElementChild;
  if (plus?.matches('a[href$="/modus-plus.html"]')) {
    const english = document.documentElement.lang === 'en';
    const courses = document.createElement('a');
    courses.href = english ? '/en/kurs.html' : '/kurs.html';
    courses.title = english ? 'Courses' : 'Kurs';
    courses.setAttribute('aria-label', courses.title);
    if (/^\/(?:en\/)?kurs(?:-finn-pulsen)?(?:\.html)?\/?$/.test(location.pathname)) {
      courses.setAttribute('aria-current', 'page');
    }
    const icon = plus.querySelector('.side-row-icon').cloneNode(true);
    icon.querySelector('path').setAttribute('d', 'M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z M4 17a3 3 0 0 1 3-3h13 M10 7l5 2-5 2z');
    courses.append(icon);
    plus.before(courses);
  }
  const glide = strip.hasAttribute('data-gliding-menu');
  const current = strip.querySelector('[aria-current="page"], .side-current-section');
  const heading = menu.querySelector('h2');
  const panelNav = menu.querySelector('nav');
  const groups = menu.querySelectorAll('[data-group]');
  let button;
  let closeTimer;
  let hover = false;
  let outgoing;
  const motion = glide && matchMedia('(prefers-reduced-motion: no-preference)');

  function fadePreviousLinks() {
    outgoing?.remove();
    if (!motion.matches) return;
    const previous = [...groups].find(group => !group.hidden);
    if (!previous) return;
    const copy = previous.cloneNode(true);
    copy.removeAttribute('data-group');
    copy.classList.add('side-links-outgoing');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    panelNav.append(copy);
    outgoing = copy;
    copy.animate([{ opacity: getComputedStyle(previous).opacity }, { opacity: 0 }],
      { duration: 195, easing: 'ease-out', fill: 'forwards' }).finished.then(() => copy.remove(), () => copy.remove());
  }

  if (motion) motion.addEventListener('change', () => outgoing?.remove());

  function mark(item) {
    if (!glide) return;
    strip.toggleAttribute('data-menu-marker', Boolean(item));
    if (item) strip.style.setProperty('--menu-marker-x', item.offsetLeft + item.offsetWidth / 2 + 'px');
  }

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
    let height = menu.offsetHeight;
    if (glide) {
      const style = getComputedStyle(menu);
      const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
        .reduce((sum, property) => sum + parseFloat(style[property]), 0);
      const headingBlock = heading.parentElement;
      height = Math.min(Math.max(80, useAbove ? above : below),
        Math.ceil(chrome + headingBlock.offsetHeight + parseFloat(getComputedStyle(headingBlock).marginBottom) + panelNav.offsetHeight));
      menu.style.setProperty('--side-panel-size', height + 'px');
    }
    const top = useAbove ? rect.top - height - 6 : rect.bottom + 6;
    menu.style.setProperty('--side-menu-top', Math.max(8, top) + 'px');
  }

  function open(trigger, byHover) {
    clearTimeout(closeTimer);
    if (button === trigger && menu.open && byHover) return;
    const alreadyModal = glide && menu.matches(':modal');
    if (glide) {
      const switching = menu.open && button !== trigger;
      if (switching) fadePreviousLinks();
      menu.toggleAttribute('data-menu-sliding', switching);
    }
    if (button) button.setAttribute('aria-expanded', 'false');
    button = trigger;
    hover = byHover;
    heading.replaceChildren(trigger.querySelector('.side-row-icon').cloneNode(true), trigger.getAttribute('aria-label'));
    for (const group of groups) group.hidden = group.dataset.group !== trigger.dataset.menu;
    if (byHover) menu.setAttribute('open', '');
    else if (!alreadyModal) {
      if (menu.open) menu.close();
      menu.showModal();
    }
    trigger.setAttribute('aria-expanded', 'true');
    mark(trigger);
    position();
    if (alreadyModal) panelNav.querySelector('[data-group]:not([hidden]) a')?.focus({ preventScroll: true });
  }

  function close() {
    clearTimeout(closeTimer);
    if (!menu.open) return;
    const restore = !hover || menu.contains(document.activeElement);
    outgoing?.remove();
    menu.removeAttribute('data-menu-sliding');
    menu.close();
    button.setAttribute('aria-expanded', 'false');
    if (restore) button.focus();
    mark(current);
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
      else { close(); mark(item); }
    });
    if (item.dataset.menu) item.addEventListener('click', () => open(item, false));
  }
  strip.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  strip.addEventListener('pointerleave', () => {
    scheduleClose();
    if (!menu.open) mark(current);
  });
  mark(current);
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
        event.clientY < rect.top || event.clientY > rect.bottom) {
      const trigger = glide && [...strip.querySelectorAll('button[data-menu]')].find(item => {
        const bounds = item.getBoundingClientRect();
        return event.clientX >= bounds.left && event.clientX <= bounds.right &&
          event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      });
      if (trigger && trigger !== button) open(trigger, false);
      else close();
    }
  });
  addEventListener('resize', () => {
    if (menu.open) position();
    mark(menu.open ? button : current);
  });
  addEventListener('scroll', () => { if (menu.open) position(); }, { passive: true });
})();
