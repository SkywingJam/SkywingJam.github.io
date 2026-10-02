// Reusable progressive enhancement. Content and artwork live in HTML, not this module.
const instances = new WeakMap();
let sequence = 0;

export function createLightStudy(root) {
  if (instances.has(root)) return instances.get(root);
  const choices = [...root.querySelectorAll('[data-study-choice]')];
  const arts = [...root.querySelectorAll('[data-study-art]')];
  const group = root.querySelector('[data-study-choices]');
  const display = root.querySelector('[data-study-display]');
  const caption = root.querySelector('[data-study-caption]');
  const plate = root.querySelector('[data-study-number]');
  const input = root.querySelector('[data-study-light]');
  const output = root.querySelector('[data-study-angle]');
  const reset = root.querySelector('[data-study-reset]');
  const scene = root.querySelector('.study-scene');
  if (!choices.length || !group || !display || !caption || !plate || !input || !output || !reset || !root.querySelector('[data-study-controls]') || choices.some(choice => !arts.some(art => art.dataset.studyArt === choice.dataset.studyChoice))) return null;
  const life = new AbortController(), options = { signal: life.signal };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const prefix = `light-study-${++sequence}`;
  let active = Math.max(0, choices.findIndex(choice => choice.dataset.studyChoice === root.dataset.specimen));
  let animation = null, visible = false;
  const still = () => reduced.matches || document.documentElement.classList.contains('motion-paused');

  const heading = root.querySelector('[data-study-title]');
  if (heading) { heading.id = `${prefix}-title`; root.setAttribute('aria-labelledby', heading.id); }
  display.id = `${prefix}-display`;
  display.setAttribute('role', 'tabpanel');
  group.setAttribute('role', 'tablist');
  // The stacked choices also accept left/right keys for a consistent narrow-screen experience.
  group.setAttribute('aria-orientation', 'vertical');
  choices.forEach((choice, index) => {
    choice.id = `${prefix}-choice-${index}`;
    choice.setAttribute('role', 'tab');
    choice.setAttribute('aria-controls', display.id);
    choice.addEventListener('click', () => select(index), options);
    choice.addEventListener('keydown', event => {
      let next;
      if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % choices.length;
      if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index - 1 + choices.length) % choices.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = choices.length - 1;
      if (next === undefined) return;
      event.preventDefault(); select(next); choices[next].focus();
    }, options);
  });
  function select(index, animate = true) {
    animation?.cancel();
    active = index;
    const choice = choices[active];
    root.dataset.specimen = choice.dataset.studyChoice;
    choices.forEach((item, i) => {
      item.setAttribute('aria-selected', String(i === active)); item.tabIndex = i === active ? 0 : -1;
    });
    arts.forEach(art => { art.hidden = art.dataset.studyArt !== choice.dataset.studyChoice; });
    display.setAttribute('aria-labelledby', choice.id);
    caption.textContent = choice.dataset.caption || '';
    plate.textContent = choice.dataset.number || '';
    if (animate && visible && !still() && !document.hidden) {
      const art = arts.find(item => !item.hidden);
      animation = art.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
  }
  function light() {
    const angle = Number(input.value);
    root.style.setProperty('--study-key', `${50 + angle * .8}%`);
    root.style.setProperty('--study-angle', `${angle}deg`);
    root.style.setProperty('--study-turn', `${angle * .08}deg`);
    root.style.setProperty('--study-progress', `${(angle + 45) / 90 * 100}%`);
    output.textContent = `${angle < 0 ? '−' : '+'}${Math.abs(angle)}°`;
    input.setAttribute('aria-valuetext', `${angle}°`);
    reset.disabled = input.value === input.defaultValue;
  }
  // Direct manipulation is optional; the native range remains the keyboard equivalent.
  let drag = null;
  function endDrag(event) {
    if (drag && scene?.hasPointerCapture(drag.id)) scene.releasePointerCapture(drag.id);
    drag = null; root.classList.remove('study-dragging');
  }
  scene?.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, value: Number(input.value), width: scene.getBoundingClientRect().width };
  }, options);
  scene?.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!scene.hasPointerCapture(event.pointerId)) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      scene.setPointerCapture(event.pointerId); root.classList.add('study-dragging');
    }
    input.value = String(Math.round(Math.max(-45, Math.min(45, drag.value + dx / drag.width * 120))));
    light();
  }, options);
  scene?.addEventListener('pointerup', endDrag, options);
  scene?.addEventListener('pointercancel', endDrag, options);
  scene?.addEventListener('lostpointercapture', () => { drag = null; root.classList.remove('study-dragging'); }, options);
  window.addEventListener('pointerup', endDrag, options);
  window.addEventListener('blur', endDrag, options);
  function sync() {
    root.dataset.observing = String(visible && !document.hidden);
    if (still() || document.hidden || !visible) animation?.cancel();
    if (document.hidden || !visible) endDrag();
  }
  input.addEventListener('input', light, options);
  reset.addEventListener('click', () => { input.value = input.defaultValue; light(); }, options);
  reduced.addEventListener('change', sync, options);
  document.addEventListener('visibilitychange', sync, options);
  window.addEventListener('pagehide', () => { root.dataset.observing = 'false'; animation?.cancel(); }, options);
  window.addEventListener('pageshow', sync, options);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .15 });
  observer.observe(root);
  const motionObserver = new MutationObserver(sync);
  motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  select(active, false); light(); sync();
  group.hidden = false; root.querySelector('[data-study-controls]').hidden = false;
  root.classList.add('study-enhanced');
  const hint = root.querySelector('[data-study-hint]');
  const initialHint = hint?.textContent;
  if (hint) hint.textContent = 'DRAG TO MOVE LIGHT';
  const api = {
    dispose() {
      endDrag(); life.abort(); observer.disconnect(); motionObserver.disconnect(); animation?.cancel();
      if (hint) hint.textContent = initialHint;
      root.dataset.observing = 'false'; group.hidden = true; root.querySelector('[data-study-controls]').hidden = true;
      root.classList.remove('study-enhanced'); instances.delete(root);
    },
  };
  instances.set(root, api);
  return api;
}

export function enhanceLightStudies(scope = document) {
  return [...scope.querySelectorAll('[data-light-study]')].map(createLightStudy).filter(Boolean);
}
