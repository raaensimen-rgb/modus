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

  const poses = [
    { turn: -31, depth: -62, drop: -12, roll: 6 },
    { turn: -10, depth: 22, drop: 15, roll: 2 },
    { turn: 10, depth: 11, drop: 17, roll: -2 },
    { turn: 31, depth: -62, drop: -12, roll: -6 },
  ];
  const wrap = index => (index + cards.length) % cards.length;
  let active = 1;
  let lastWheelTime = -Infinity;
  let mouseOrigin;
  let lastMouseStep = -Infinity;
  let touchStart;
  let ignoreTouchClickUntil = -Infinity;

  function render() {
    slots.forEach((slot, index) => {
      const position = wrap(index - active + 1);
      const { turn, depth, drop, roll } = poses[position];
      slot.style.order = position;
      cards[index].style.setProperty('--arc-turn', `${turn}deg`);
      cards[index].style.setProperty('--arc-depth', `${depth}px`);
      cards[index].style.setProperty('--arc-drop', `${drop}px`);
      cards[index].style.setProperty('--arc-roll', `${roll}deg`);
      if (index === active) cards[index].setAttribute('aria-current', 'true');
      else cards[index].removeAttribute('aria-current');
    });
  }

  function step(direction) {
    const wrapSlot = slots.find(slot => Number(slot.style.order) === (direction > 0 ? 0 : 3));
    const start = motion.matches ? slots.map(slot => [slot.offsetLeft, slot.offsetTop]) : null;
    active = wrap(active + direction);
    render();
    if (!start) return;

    const end = slots.map(slot => [slot.offsetLeft, slot.offsetTop]);
    slots.forEach((slot, index) => {
      slot.getAnimations().forEach(animation => animation.cancel());
      const [x, y] = start[index];
      const [nextX, nextY] = end[index];
      const frames = slot === wrapSlot
        ? [{ opacity: .35 }, { opacity: 1 }]
        : [{ translate: `${x - nextX}px ${y - nextY}px` }, { translate: '0px 0px' }];
      slot.animate(frames, { duration: 280, easing: 'ease-out' });
    });
  }

  buttons[0].addEventListener('click', () => step(-1));
  buttons[1].addEventListener('click', () => step(1));
  cards.forEach((card, index) => {
    card.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!direction) return;
      event.preventDefault();
      active = index;
      render();
      step(direction);
      cards[active].focus({ preventScroll: true });
    });
  });

  function resetMouse(event) {
    mouseOrigin = { x: event.clientX, y: event.clientY };
  }

  group.addEventListener('pointerenter', resetMouse);
  group.addEventListener('pointerdown', resetMouse);
  group.addEventListener('pointerleave', () => { mouseOrigin = undefined; });
  group.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || event.buttons || !mouseOrigin) return;
    const x = event.clientX - mouseOrigin.x;
    const y = event.clientY - mouseOrigin.y;
    // A predominantly horizontal sweep turns the arc. Vertical approaches leave it still.
    if (Math.abs(y) > 42 && Math.abs(y) > Math.abs(x)) resetMouse(event);
    if (Math.abs(x) < 96 || Math.abs(x) < Math.abs(y) * 1.8 ||
        event.timeStamp - lastMouseStep < 320) return;
    resetMouse(event);
    lastMouseStep = event.timeStamp;
    step(Math.sign(x));
  }, { passive: true });

  group.addEventListener('wheel', event => {
    if (event.ctrlKey || !event.cancelable) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    resetMouse(event);
    if (event.timeStamp - lastWheelTime > 180) step(Math.sign(delta));
    lastWheelTime = event.timeStamp;
  }, { passive: false });

  group.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? event.touches[0] : undefined;
  }, { passive: true });
  group.addEventListener('touchcancel', () => { touchStart = undefined; }, { passive: true });
  group.addEventListener('touchend', event => {
    if (!touchStart) return;
    const end = event.changedTouches[0];
    const x = end.clientX - touchStart.clientX;
    const y = end.clientY - touchStart.clientY;
    touchStart = undefined;
    if (Math.abs(x) < 40 || Math.abs(x) <= Math.abs(y)) return;
    ignoreTouchClickUntil = event.timeStamp + 350;
    step(-Math.sign(x));
  }, { passive: true });
  group.addEventListener('click', event => {
    if (event.detail && event.timeStamp < ignoreTouchClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true });

  motion.addEventListener('change', () => {
    if (!motion.matches) slots.forEach(slot => slot.getAnimations().forEach(animation => animation.cancel()));
  });
  render();
}
