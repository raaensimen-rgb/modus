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
    const tiltEnabled = matchMedia(
      '(min-width: 760px) and (hover: hover) and (pointer: fine) ' +
      'and (prefers-reduced-motion: no-preference) and (forced-colors: none)'
    );

    function resetTilt(card) {
      card.removeAttribute('data-card-tilt');
      card.style.removeProperty('--portal-tilt-x');
      card.style.removeProperty('--portal-tilt-y');
    }

    for (const card of cards) {
      card.addEventListener('pointermove', (event) => {
        if (!tiltEnabled.matches || event.pointerType !== 'mouse') return;
        const bounds = card.getBoundingClientRect();
        const x = (2 * event.clientX - bounds.left - bounds.right) / card.offsetWidth;
        const y = (2 * event.clientY - bounds.top - bounds.bottom) / card.offsetHeight;
        card.style.setProperty('--portal-tilt-x', `${Math.max(-1, Math.min(1, -y)) * 6}deg`);
        card.style.setProperty('--portal-tilt-y', `${Math.max(-1, Math.min(1, x)) * 8}deg`);
        card.setAttribute('data-card-tilt', '');
      }, { passive: true });
      card.addEventListener('pointerleave', () => resetTilt(card));
      card.addEventListener('pointercancel', () => resetTilt(card));
    }
    tiltEnabled.addEventListener('change', () => cards.forEach(resetTilt));
    window.addEventListener('pagehide', () => cards.forEach(resetTilt));

    cards.forEach((card) => card.setAttribute('data-card-ready', ''));
    // Paint the initial illustration-only state before arming the fade.
    requestAnimationFrame(() => requestAnimationFrame(() => group.setAttribute('data-card-motion', '')));
  }
}
