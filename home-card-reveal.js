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
  }
}
