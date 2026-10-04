import { enhanceLightStudies } from './light-study.js';

const root = document.documentElement;
const stage = document.querySelector('.wave-stage');
const themeButton = document.querySelector('.theme-toggle');
const controls = document.querySelector('.motion-controls');
const motionButton = document.querySelector('.motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const colorScheme = matchMedia('(prefers-color-scheme: dark)');
// Inline SVG, not Unicode glyphs (Ⅱ ▷ can fall back to emoji or a different font on iOS).
const ICON_PAUSE = '<svg class="i-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5.5 3.5v9M10.5 3.5v9"/></svg>';
const ICON_PLAY = '<svg class="i-arrow i-fill" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 3.5l7 4.5-7 4.5z"/></svg>';
let scene = null, loading = false, loadGeneration = 0, userPaused = false, themeExplicit = false;
try { themeExplicit = ['light', 'dark'].includes(localStorage.getItem('theme')); } catch {}

function setTheme(dark, save = false, instant = false) {
  root.classList.toggle('dark-mode', dark);
  themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  themeButton.setAttribute('aria-pressed', String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#081326' : '#f2eee5';
  if (save) {
    themeExplicit = true;
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
  }
  scene?.setTheme(dark, instant);
}
themeButton.hidden = false;
setTheme(root.classList.contains('dark-mode'));
// The new theme opens as a circle from the toggle. Without View Transitions, or with reduced
// motion, it falls back to the colour cross-fade.
let themeReveal = 0;
// Repeated clicks must not start a text selection around the toggle.
themeButton.addEventListener('mousedown', event => { if (event.detail > 1) event.preventDefault(); });
themeButton.addEventListener('click', () => {
  // Read the requested state, not the DOM: during a reveal the class changes a frame later,
  // and quick repeated clicks must each count.
  const dark = themeButton.getAttribute('aria-pressed') !== 'true';
  if (!document.startViewTransition || reducedMotion.matches || userPaused) { setTheme(dark, true); return; }
  const box = themeButton.getBoundingClientRect();
  const x = box.left + box.width / 2, y = box.top + box.height / 2;
  root.style.setProperty('--reveal-x', `${x}px`);
  root.style.setProperty('--reveal-y', `${y}px`);
  root.style.setProperty('--reveal-r', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
  root.classList.add('theme-switching');
  // Announce the new state right away; the reveal is only the visual.
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  // Hold the wave during the reveal: a live canvas inside the new snapshot would be re-captured
  // every frame and is the main cost of the transition.
  scene?.setPaused(true);
  const token = ++themeReveal;
  const transition = document.startViewTransition(() => setTheme(dark, true, true));
  // A quick second click supersedes this reveal; only the latest one restores state.
  transition.finished.finally(() => {
    if (token !== themeReveal) return;
    root.classList.remove('theme-switching');
    scene?.setPaused(userPaused);
  });
});
colorScheme.addEventListener('change', event => { if (!themeExplicit) setTheme(event.matches); });
window.addEventListener('storage', event => {
  if (event.key !== 'theme') return;
  themeExplicit = ['light', 'dark'].includes(event.newValue);
  setTheme(themeExplicit ? event.newValue === 'dark' : colorScheme.matches);
});
requestAnimationFrame(() => root.classList.add('theme-ready'));
document.querySelector('#year').textContent = new Date().getFullYear();

function updateMotionControls() {
  root.classList.toggle('motion-paused', userPaused);
  controls.hidden = !scene || reducedMotion.matches;
  motionButton.setAttribute('aria-pressed', String(userPaused));
  motionButton.querySelector('.motion-label').textContent = userPaused ? 'Resume motion' : 'Pause motion';
  motionButton.querySelector('.motion-icon').innerHTML = userPaused ? ICON_PLAY : ICON_PAUSE;
  controls.querySelector('.motion-state').textContent = userPaused ? 'A MOMENT OF STILLNESS' : 'GENTLY IN MOTION';
}
motionButton.addEventListener('click', () => {
  userPaused = !userPaused;
  scene?.setPaused(userPaused);
  updateMotionControls();
  if (userPaused) resetSurface();
});

async function enhanceWave() {
  if (reducedMotion.matches || scene || loading) return;
  loading = true;
  const generation = ++loadGeneration;
  try {
    const { createWaveScene } = await import('./wave-scene.js');
    if (generation !== loadGeneration || reducedMotion.matches) return;
    scene = createWaveScene(document.querySelector('.wave-canvas'), stage, {
      dark: root.classList.contains('dark-mode'), paused: userPaused,
      onFallback() { scene = null; updateMotionControls(); },
    });
  } catch {
    stage.classList.remove('scene-ready');
    stage.dataset.state = 'static';
  } finally {
    loading = false;
    updateMotionControls();
    if (generation !== loadGeneration && !reducedMotion.matches && !scene) enhanceWave();
  }
}
// Keep the static page available while the visual enhancement loads.
if ('requestIdleCallback' in window) requestIdleCallback(enhanceWave, { timeout: 1200 });
else setTimeout(enhanceWave, 100);
reducedMotion.addEventListener('change', () => {
  loadGeneration++;
  if (reducedMotion.matches) {
    scene?.dispose();
    scene = null;
    stage.classList.remove('scene-ready');
    stage.dataset.state = 'static';
    updateMotionControls();
  } else enhanceWave();
});

// Surfaces ([data-surface]): only the card under the pointer gets a moving reflection
// (and the featured file a small lift). Text stays crisp; nothing moves on its own.
const surfaces = [...document.querySelectorAll('[data-surface]')];
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let surfaceFrame = 0, surfaceTarget = null, surfaceX = 0, surfaceY = 0;
// The light fades out where the pointer left it: the position is kept, only the
// opacity changes, so it never slides back to the centre on the way out.
function resetSurface(target = null) {
  if (!target || target === surfaceTarget) { cancelAnimationFrame(surfaceFrame); surfaceFrame = 0; }
  for (const item of target ? [target] : surfaces) item.classList.remove('surface-active');
}
for (const item of surfaces) {
  item.addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches || userPaused || event.pointerType === 'touch') return;
    const rect = item.getBoundingClientRect();
    surfaceTarget = item;
    surfaceX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    surfaceY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    if (surfaceFrame) return;
    surfaceFrame = requestAnimationFrame(() => {
      surfaceFrame = 0;
      surfaceTarget.classList.add('surface-active');
      surfaceTarget.style.setProperty('--surface-x', `${surfaceX * 100}%`);
      surfaceTarget.style.setProperty('--surface-y', `${surfaceY * 100}%`);
    });
  }, { passive: true });
  item.addEventListener('pointerleave', () => resetSurface(item));
  item.addEventListener('pointercancel', () => resetSurface(item));
}
window.addEventListener('blur', () => resetSurface());
finePointer.addEventListener('change', () => resetSurface());
reducedMotion.addEventListener('change', () => resetSurface());
document.addEventListener('visibilitychange', () => { if (document.hidden) resetSurface(); });

// Ambient experiment art only animates while it is on screen.
const artObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('in-view', entry.isIntersecting);
}, { rootMargin: '80px 0px' });
document.querySelectorAll('.experiment-art').forEach(art => artObserver.observe(art));

const arrivals = document.querySelectorAll('[data-arrival]');
const arrivalObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('arrival-visible');
    arrivalObserver.unobserve(entry.target);
  }
}, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
if (!reducedMotion.matches) {
  arrivals.forEach(element => {
    // Siblings that arrive together are gently staggered.
    const peers = [...element.parentElement.children].filter(item => item.hasAttribute('data-arrival'));
    element.style.setProperty('--arrival-delay', `${Math.min(peers.indexOf(element), 4) * 80}ms`);
    const rect = element.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) return;
    element.classList.add('arrival-pending');
    arrivalObserver.observe(element);
  });
}
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  arrivals.forEach(element => element.classList.add('arrival-visible'));
  arrivalObserver.disconnect();
});
window.addEventListener('pagehide', () => {
  resetSurface();
  artObserver.disconnect();
  loadGeneration++;
  scene?.dispose();
  scene = null;
  stage.classList.remove('scene-ready');
  updateMotionControls();
});
window.addEventListener('pageshow', event => { if (event.persisted) enhanceWave(); });

// Independent reusable blocks: no animation loop or renderer dependency.
enhanceLightStudies(document);
