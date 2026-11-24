'use strict';

{
  const group = document.querySelector('.home-portals');
  const cards = group?.querySelectorAll('.home-portal[data-card-reveal]');

  if (cards?.length) {
    let openCard;
    let touchCard;

    function closeCard() {
      openCard?.removeAttribute('data-card-open');
      openCard = undefined;
    }

    document.addEventListener('pointerdown', (event) => {
      const card = event.target.closest('.home-portal[data-card-reveal]');
      const isTouch = event.pointerType === 'touch';
      touchCard = isTouch ? card : undefined;
      group.toggleAttribute('data-card-touch', isTouch);
      if (card !== openCard || !isTouch) closeCard();
    });

    document.addEventListener('pointercancel', () => { touchCard = undefined; });

    group.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') group.removeAttribute('data-card-touch');
    });

    group.addEventListener('click', (event) => {
      const card = event.target.closest('.home-portal[data-card-reveal]');
      const isTouch = event.pointerType === 'touch' || (event.detail > 0 && card === touchCard);
      touchCard = undefined;
      // Keep native keyboard, assistive technology and modified link activation.
      if (!card || !isTouch || event.detail === 0 || event.defaultPrevented ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (card === openCard) return;
      event.preventDefault();
      closeCard();
      openCard = card;
      card.setAttribute('data-card-open', '');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeCard();
    });

    window.addEventListener('pagehide', closeCard);
    cards.forEach((card) => card.setAttribute('data-card-ready', ''));
    // Paint the initial illustration-only state before arming the fade.
    requestAnimationFrame(() => requestAnimationFrame(() => group.setAttribute('data-card-motion', '')));
    if (cards.length === 4) setupCardArc(group, [...cards]);
  }
}

function setupCardArc(group, cards) {
  const motion = matchMedia('(prefers-reduced-motion: no-preference) and (forced-colors: none)');
  const english = document.documentElement.lang === 'en';
  const controls = document.createElement('div');
  controls.className = 'portal-arc-controls';
  group.id ||= 'home-card-arc';
  const buttons = (english ? ['Previous card', 'Next card'] : ['Forrige kort', 'Neste kort'])
    .map((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = index === 0 ? '←' : '→';
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-controls', group.id);
      controls.append(button);
      return button;
    });

  const slots = cards.map(card => {
    const slot = document.createElement('div');
    slot.className = 'portal-arc-slot';
    card.replaceWith(slot);
    slot.append(card);
    return slot;
  });
  group.after(controls);
  group.setAttribute('data-card-arc', '');

  let frame = 0;
  let active = 0;
  let lastWheelTime = -Infinity;

  function target(slot) {
    return slot.offsetLeft + slot.offsetWidth / 2 - group.clientWidth / 2;
  }

  function render() {
    frame = 0;
    const position = group.scrollLeft;
    const distances = slots.map(slot => target(slot) - position);
    active = distances.reduce((closest, distance, index) =>
      Math.abs(distance) < Math.abs(distances[closest]) ? index : closest, 0);
    const spacing = slots[1].offsetLeft - slots[0].offsetLeft || 1;
    slots.forEach((slot, index) => {
      const distance = Math.max(-2, Math.min(2, distances[index] / spacing));
      const depth = Math.abs(distance);
      cards[index].style.setProperty('--arc-turn', `${distance * 24}deg`);
      cards[index].style.setProperty('--arc-depth', `${-depth * 46}px`);
      cards[index].style.setProperty('--arc-drop', `${depth * 8}px`);
    });
    buttons[0].setAttribute('aria-disabled', String(active === 0));
    buttons[1].setAttribute('aria-disabled', String(active === cards.length - 1));
  }

  function queueRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function select(index, animate = true) {
    if (!slots[index]) return;
    group.scrollTo({ left: target(slots[index]), behavior: animate && motion.matches ? 'smooth' : 'instant' });
  }

  buttons[0].addEventListener('click', () => select(active - 1));
  buttons[1].addEventListener('click', () => select(active + 1));
  cards.forEach((card, index) => {
    card.addEventListener('focus', () => {
      if (card.matches(':focus-visible')) select(index, false);
    });
    card.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!step) return;
      event.preventDefault();
      cards[index + step]?.focus({ preventScroll: true });
    });
  });

  group.addEventListener('wheel', event => {
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const direction = Math.sign(event.deltaY);
    if (!slots[active + direction]) return;
    event.preventDefault();
    const previousWheelTime = lastWheelTime;
    lastWheelTime = event.timeStamp;
    if (event.timeStamp - previousWheelTime > 180) select(active + direction);
  }, { passive: false });

  group.addEventListener('scroll', queueRender, { passive: true });
  new ResizeObserver(queueRender).observe(group);
  select(group.clientWidth >= 760 ? 1 : 0, false);
  render();
}
