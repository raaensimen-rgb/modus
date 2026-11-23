(() => {
  const key = 'modus-course-essentials-pulse-v1';
  const start = document.querySelector('[data-course-start]');
  const progress = document.querySelector('[data-course-progress]');
  const finish = document.querySelector('[data-course-finish]');
  const status = document.querySelector('[data-course-audio-status]');
  try {
    if (start && localStorage.getItem(key) === 'complete') {
      start.textContent = start.dataset.completedLabel;
      progress.textContent = progress.dataset.completedLabel;
      progress.hidden = false;
    }
    finish?.addEventListener('click', () => {
      try { localStorage.setItem(key, 'complete'); } catch {}
    });
  } catch {}
  if (!status) return;

  let context;
  let sequence = 0;
  let oscillators = [];
  let timers = [];
  let activeBeat;

  function stop() {
    sequence++;
    for (const oscillator of oscillators) oscillator.stop();
    for (const timer of timers) clearTimeout(timer);
    activeBeat?.classList.remove('is-beat');
    oscillators = [];
    timers = [];
  }

  function click(time, frequency, volume) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(.001, time + .065);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + .075);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      oscillators = oscillators.filter(source => source !== oscillator);
    };
    oscillators.push(oscillator);
  }

  async function play(button) {
    stop();
    const current = sequence;
    try {
      context ??= new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      if (current !== sequence) return;
      const lead = .08;
      const beatDuration = .6;
      const startTime = context.currentTime + lead;
      const marks = button.parentElement.querySelectorAll('.course-beats span');
      status.textContent = status.dataset.playingLabel;
      marks.forEach((mark, beat) => {
        click(startTime + beat * beatDuration, 420, .22);
        timers.push(setTimeout(() => {
          activeBeat?.classList.remove('is-beat');
          activeBeat = mark;
          mark.classList.add('is-beat');
        }, (lead + beat * beatDuration) * 1000));
      });
      if (button.dataset.play === 'rhythm') {
        for (const beat of [0, .5, 1.5, 2, 3, 3.5]) {
          click(startTime + beat * beatDuration, 940, .10);
        }
      }
      timers.push(setTimeout(() => {
        stop();
        status.textContent = status.dataset.stoppedLabel;
      }, (lead + 4 * beatDuration) * 1000));
    } catch {
      if (current === sequence) status.textContent = status.dataset.errorLabel;
    }
  }

  document.querySelectorAll('[data-play]').forEach(button => {
    button.addEventListener('click', () => { void play(button); });
  });
  addEventListener('pagehide', stop);
})();
