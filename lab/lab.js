const root = document.documentElement;
const stage = document.querySelector('.wave-stage');
const themeButton = document.querySelector('.theme-toggle');
const controls = document.querySelector('.motion-controls');
const motionButton = document.querySelector('.motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const colorScheme = matchMedia('(prefers-color-scheme: dark)');
let scene = null, loading = false, loadGeneration = 0, userPaused = false, themeExplicit = false;
try { themeExplicit = ['light', 'dark'].includes(localStorage.getItem('theme')); } catch {}

function setTheme(dark, save = false) {
  root.classList.toggle('dark-mode', dark);
  themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  themeButton.setAttribute('aria-pressed', String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#081326' : '#f2eee5';
  if (save) {
    themeExplicit = true;
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
  }
  scene?.setTheme(dark);
}
themeButton.hidden = false;
setTheme(root.classList.contains('dark-mode'));
themeButton.addEventListener('click', () => setTheme(!root.classList.contains('dark-mode'), true));
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
  motionButton.querySelector('.motion-icon').textContent = userPaused ? '▷' : 'Ⅱ';
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

// Only the selected file gets a small lift and a moving reflection. Keep text crisp.
const surface = document.querySelector('.featured-file');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let surfaceFrame = 0, surfaceX = 0, surfaceY = 0;
function resetSurface() {
  cancelAnimationFrame(surfaceFrame); surfaceFrame = 0;
  surface.classList.remove('surface-active');
  for (const name of ['--surface-x', '--surface-y']) surface.style.removeProperty(name);
}
surface.addEventListener('pointermove', event => {
  if (!finePointer.matches || reducedMotion.matches || userPaused || event.pointerType === 'touch') return;
  const rect = surface.getBoundingClientRect();
  surfaceX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  surfaceY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  if (surfaceFrame) return;
  surfaceFrame = requestAnimationFrame(() => {
    surfaceFrame = 0;
    surface.classList.add('surface-active');
    surface.style.setProperty('--surface-x', `${surfaceX * 100}%`);
    surface.style.setProperty('--surface-y', `${surfaceY * 100}%`);
  });
}, { passive: true });
surface.addEventListener('pointerleave', resetSurface);
surface.addEventListener('pointercancel', resetSurface);
window.addEventListener('blur', resetSurface);
finePointer.addEventListener('change', resetSurface);
reducedMotion.addEventListener('change', resetSurface);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetSurface(); });

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
    if (element.closest('.interest-grid')) {
      const index = [...element.parentElement.children].indexOf(element);
      element.style.setProperty('--arrival-delay', `${index * 65}ms`);
    }
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
  loadGeneration++;
  scene?.dispose();
  scene = null;
  stage.classList.remove('scene-ready');
  updateMotionControls();
});
window.addEventListener('pageshow', event => { if (event.persisted) enhanceWave(); });
