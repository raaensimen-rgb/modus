/* Extend the visible edges of the existing home photographs without recropping them. */
(() => {
  'use strict';
  const body = document.body;
  const header = body.querySelector('.site-header');
  const hero = body.querySelector('.home-hero');
  const landscape = hero?.querySelector('.landscape');
  const lower = body.querySelector('.home-lower-landscape');
  const intro = lower?.querySelector('.home-introduction');
  if (!header || !hero || !landscape || !intro || typeof ResizeObserver !== 'function') return;

  const px = value => `${value}px`;

  const menu = header.querySelector('.side-menu-toggle');
  const heading = menu ? hero.querySelector('#welcome') : null;
  const copy = heading?.closest('.hero-content');
  let menuOffset = 0;

  function update() {
    const width = body.clientWidth;
    const heroHeight = hero.getBoundingClientRect().height;
    const heroStart = hero.getBoundingClientRect().top - header.getBoundingClientRect().top;
    const horizon = heroStart + heroHeight * 0.94;
    // The horizon is at 53.5% of the photograph. Keep the bright reflection below the upper crop.
    const imageHeight = Math.max(width / 2, horizon / 0.535);
    // On phones the navigation overlaps the original sun position.
    const mobileSkyLift = width <= 760 ? 72 : 0;
    const top = horizon - imageHeight * 0.535 - mobileSkyLift;
    const imageWidth = imageHeight * 2;
    body.style.setProperty('--scene-width', px(imageWidth));
    body.style.setProperty('--scene-x', px((width - imageWidth) * 0.8));
    body.style.setProperty('--scene-top', px(top));
    hero.style.setProperty('--landscape-top-offset', px(top - heroStart));
    const landscapeStart = landscape.getBoundingClientRect().top - header.getBoundingClientRect().top;
    hero.style.setProperty('--landscape-image-top', px(top - landscapeStart));
    hero.dataset.landscapeExtension = '';

    const lowerBounds = lower.getBoundingClientRect();
    const joinDepth = intro.getBoundingClientRect().top - lowerBounds.top;
    if (joinDepth > 0) {
      lower.style.setProperty('--lake-join-depth', px(joinDepth));
      lower.dataset.lakeJoin = '';
    }

    const page = body.getBoundingClientRect();
    const fill = Math.max(0, page.bottom - lowerBounds.bottom);
    // Show only the portion below the horizon. Both crops use exactly the same horizontal mapping.
    const waterHeight = lowerBounds.height / 0.465;
    body.style.setProperty('--scene-water-height', px(waterHeight));
    body.style.setProperty('--landscape-lower-start', px(lowerBounds.bottom - page.top));
    body.style.setProperty('--landscape-lower-height', px(Math.max(waterHeight, fill / 0.2)));
    body.dataset.landscapeExtension = '';

    if (menu && heading) {
      const menuBottom = menu.getBoundingClientRect().bottom - menuOffset;
      const copyDrop = copy ? Number.parseFloat(getComputedStyle(copy).top) || 0 : 0;
      menuOffset = Math.max(0, heading.getBoundingClientRect().top - copyDrop - menuBottom - 22);
      menu.style.setProperty('--home-menu-offset', `0 ${px(menuOffset)}`);
    }
  }

  const observer = new ResizeObserver(update);
  for (const element of [body, header, hero, lower, intro, menu, heading]) {
    if (element) observer.observe(element);
  }
  update();
})();
