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

  const water = [];
  const slots = cards.map(card => {
    const slot = document.createElement('div');
    slot.className = 'portal-arc-slot';
    card.replaceWith(slot);
    const ripple = document.createElement('span');
    ripple.className = 'portal-arc-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    water.push(ripple);
    const reflection = document.createElement('span');
    reflection.className = 'portal-arc-reflection';
    reflection.setAttribute('aria-hidden', 'true');
    const picture = card.querySelector('picture img');
    if (picture) reflection.style.setProperty('--arc-reflection-image', `url(${JSON.stringify(picture.src)})`);
    slot.append(card, ripple, reflection);
    return slot;
  });
  const waterline = Array.from({ length: 2 }, () => {
    const ripple = document.createElement('span');
    ripple.className = 'portal-arc-ripple portal-arc-waterline';
    ripple.setAttribute('aria-hidden', 'true');
    group.append(ripple);
    return ripple;
  });
  let diveAnimation;
  group.after(controls);
  group.setAttribute('data-card-arc', '');

  const poses = [
    { turn: -27, depth: -48, drop: -7, roll: 5 },
    { turn: 0, depth: 34, drop: 14, roll: 0 },
    { turn: 18, depth: -38, drop: 4, roll: -3 },
    { turn: 29, depth: -62, drop: -9, roll: -6 },
  ];
  const wrap = index => (index + cards.length) % cards.length;
  let active = 1;
  let lastWheelTime = -Infinity;
  let drag;
  let ignoreMouseClick = false;
  let touchStart;
  let touchOffset = 0;
  let ignoreTouchClickUntil = -Infinity;

  function render() {
    slots.forEach((slot, index) => {
      const position = wrap(index - active + 1);
      const { turn, depth, drop, roll } = poses[position];
      slot.style.order = position;
      slot.dataset.arcPosition = position;
      cards[index].style.setProperty('--arc-turn', `${turn}deg`);
      cards[index].style.setProperty('--arc-depth', `${depth}px`);
      cards[index].style.setProperty('--arc-drop', `${drop}px`);
      cards[index].style.setProperty('--arc-roll', `${roll}deg`);
      if (index === active) cards[index].setAttribute('aria-current', 'true');
      else cards[index].removeAttribute('aria-current');
    });
  }

  function splash(ripple, x, y, width, delay) {
    ripple.style.left = `${x - width / 2}px`;
    ripple.style.top = `${y - 10}px`;
    ripple.style.width = `${width}px`;
    ripple.getAnimations().forEach(animation => animation.cancel());
    ripple.animate([
      { opacity: 0, scale: .52 },
      { opacity: .84, scale: .9, offset: .24 },
      { opacity: 0, scale: 1.3 },
    ], { duration: 510, delay, easing: 'ease-out' });
  }

  function dive(slot, card, fromX, fromY) {
    // Follow the lower half of an ellipse before returning to the visible arc.
    const path = Array.from({ length: 9 }, (_, index) => {
      const offset = index / 8;
      const progress = (1 - Math.cos(Math.PI * offset)) / 2;
      const depth = Math.sin(Math.PI * offset);
      return {
        offset,
        translate: `${fromX * (1 - progress)}px ${fromY * (1 - progress) + depth * 62}px`,
        scale: 1 - depth * .23,
      };
    });

    const submerged = 'linear-gradient(to bottom, #000 0 44%, transparent 54%)';
    diveAnimation?.cancel();
    diveAnimation = card.animate([
      { maskPosition: '0% 0%', filter: 'none', opacity: 1, offset: 0 },
      { maskPosition: '0% 34%', filter: 'blur(1.6px)', opacity: .94, offset: .15 },
      { maskPosition: '0% 100%', filter: 'blur(5px)', opacity: 0, offset: .35 },
      { maskPosition: '0% 100%', filter: 'blur(5px)', opacity: 0, offset: .65 },
      { maskPosition: '0% 34%', filter: 'blur(1.6px)', opacity: .94, offset: .85 },
      { maskPosition: '0% 0%', filter: 'none', opacity: 1, offset: 1 },
    ].map(frame => ({ ...frame, maskImage: submerged, maskSize: '100% 280%', maskRepeat: 'no-repeat' })),
    { duration: 660, easing: 'linear' });

    slot.animate(path, { duration: 660, easing: 'linear' });
  }

  function step(direction, dragOffset = 0) {
    const wrapSlot = slots.find(slot => Number(slot.style.order) === (direction > 0 ? 0 : 3));
    const previous = active;
    const start = motion.matches ? slots.map(slot => [slot.offsetLeft, slot.offsetTop, slot.offsetWidth, slot.offsetHeight]) : null;
    active = wrap(active + direction);
    render();
    if (!start) return;

    const end = slots.map(slot => [slot.offsetLeft, slot.offsetTop]);
    slots.forEach((slot, index) => {
      slot.getAnimations().forEach(animation => animation.cancel());
      const [x, y] = start[index];
      const [nextX, nextY] = end[index];
      const fromX = x - nextX + dragOffset;
      const fromY = y - nextY;
      const from = { translate: `${fromX}px ${fromY}px` };
      const to = { translate: '0px 0px' };
      const isRising = index === active;
      const isSinking = index === previous;
      const surface = (progress, dip) => ({
        translate: `${fromX * (1 - progress)}px ${fromY * (1 - progress) + dip}px`,
      });
      if (slot === wrapSlot) {
        const [, , oldWidth, oldHeight] = start[index];
        splash(waterline[0], x + oldWidth / 2 + dragOffset, y + oldHeight, oldWidth * .82, 32);
        splash(waterline[1], nextX + slot.offsetWidth / 2, nextY + slot.offsetHeight, slot.offsetWidth * .82, 395);
        dive(slot, cards[index], fromX, fromY);
      } else {
        const frames = isRising
          ? [from, { ...surface(.42, 13), offset: .42 }, { ...surface(.93, -4), offset: .82 }, to]
          : isSinking ? [from, { ...surface(.42, 17), offset: .42 }, to] : [from, to];
        slot.animate(frames, { duration: 420, easing: 'cubic-bezier(.24, .62, .3, 1)' });
      }

      const ripple = water[index];
      ripple.getAnimations().forEach(animation => animation.cancel());
      if (isRising || isSinking) {
        ripple.animate([
          { opacity: 0, scale: .55 },
          { opacity: .72, scale: .9, offset: .24 },
          { opacity: 0, scale: 1.22 },
        ], { duration: 540, delay: 25, easing: 'ease-out' });
      }
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

  group.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    ignoreMouseClick = false;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: 0, moved: false };
  });

  group.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    if (!drag || event.pointerId !== drag.id || !event.buttons) {
      const card = event.target.closest('.home-portal');
      if (!card || !motion.matches) return;
      const bounds = card.getBoundingClientRect();
      const x = 2 * (event.clientX - bounds.left) / bounds.width - 1;
      card.style.setProperty('--arc-hover-tilt', `${Math.max(-1, Math.min(1, x)) * 4}deg`);
      return;
    }
    const delta = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(delta) < 8 || Math.abs(delta) < Math.abs(event.clientY - drag.y)) return;
      drag.moved = true;
      group.setPointerCapture(event.pointerId);
      group.setAttribute('data-arc-dragging', '');
    }
    drag.offset = Math.max(-64, Math.min(64, delta * .55));
    group.style.setProperty('--arc-drag-offset', `${drag.offset}px`);
  });

  function finishDrag(event, commit) {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved, x, offset } = drag;
    drag = undefined;
    group.removeAttribute('data-arc-dragging');
    group.style.removeProperty('--arc-drag-offset');
    if (!moved) return;
    ignoreMouseClick = true;
    const delta = event.clientX - x;
    if (commit && Math.abs(delta) >= 48) step(-Math.sign(delta), offset);
    else settleDrag(offset);
  }

  function settleDrag(offset) {
    if (!motion.matches) return;
    slots.forEach(slot => slot.animate([
      { translate: `${offset}px 0px` }, { translate: '0px 0px' },
    ], { duration: 160, easing: 'ease-out' }));
  }

  group.addEventListener('pointerup', event => finishDrag(event, true));
  group.addEventListener('pointercancel', event => finishDrag(event, false));
  group.addEventListener('lostpointercapture', event => finishDrag(event, false));
  group.addEventListener('pointerleave', event => {
    if (drag && !drag.moved) finishDrag(event, false);
  });
  group.addEventListener('dragstart', event => {
    if (drag) event.preventDefault();
  });

  group.addEventListener('wheel', event => {
    if (event.ctrlKey || drag?.moved || !event.cancelable) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    if (event.timeStamp - lastWheelTime > 180) step(Math.sign(delta));
    lastWheelTime = event.timeStamp;
  }, { passive: false });

  function clearTouch() {
    touchStart = undefined;
    touchOffset = 0;
    group.removeAttribute('data-arc-dragging');
    group.style.removeProperty('--arc-drag-offset');
  }

  group.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) {
      clearTouch();
      return;
    }
    touchStart = event.touches[0];
  }, { passive: true });
  group.addEventListener('touchmove', event => {
    if (!touchStart) return;
    const touch = event.touches[0];
    const x = touch.clientX - touchStart.clientX;
    const y = touch.clientY - touchStart.clientY;
    if (!touchOffset && (Math.abs(x) < 8 || Math.abs(x) <= Math.abs(y))) return;
    touchOffset = Math.max(-42, Math.min(42, x * .5));
    group.setAttribute('data-arc-dragging', '');
    group.style.setProperty('--arc-drag-offset', `${touchOffset}px`);
  }, { passive: true });
  group.addEventListener('touchcancel', clearTouch, { passive: true });
  group.addEventListener('touchend', event => {
    if (!touchStart) return;
    const end = event.changedTouches[0];
    const x = end.clientX - touchStart.clientX;
    const y = end.clientY - touchStart.clientY;
    const offset = touchOffset;
    clearTouch();
    if (Math.abs(x) < 40 || Math.abs(x) <= Math.abs(y)) {
      if (offset) settleDrag(offset);
      return;
    }
    ignoreTouchClickUntil = event.timeStamp + 350;
    step(-Math.sign(x), offset);
  }, { passive: true });
  group.addEventListener('click', event => {
    if (event.detail && ((event.pointerType !== 'touch' && ignoreMouseClick) ||
        event.timeStamp < ignoreTouchClickUntil)) {
      ignoreMouseClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true });

  motion.addEventListener('change', () => {
    if (motion.matches) return;
    diveAnimation?.cancel();
    [...slots, ...water, ...waterline].forEach(element => {
      element.getAnimations().forEach(animation => animation.cancel());
    });
  });
  render();
}
