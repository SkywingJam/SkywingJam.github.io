// Reusable tabs for blocks that hold several panels. Copy and panels live in HTML;
// without JavaScript the tab list stays hidden and every panel shows in order.
//   [data-switch]            root; data-active names the initial key
//   [data-switch-tabs]       tab list (hidden in HTML), may hold a [data-switch-indicator]
//   [data-switch-tab="key"]  button
//   [data-switch-panel="key"] panel shown for that key
//   [data-switch-stagger]    optional: its children settle in one after another on change
// Nested switches are allowed; each root only manages its own elements.
const instances = new WeakMap();
let sequence = 0;
const SETTLE = 'cubic-bezier(.16,1,.3,1)';

export function createSwitch(root) {
  if (instances.has(root)) return instances.get(root);
  const own = element => element.closest('[data-switch]') === root;
  const tabs = [...root.querySelectorAll('[data-switch-tab]')].filter(own);
  const panels = [...root.querySelectorAll('[data-switch-panel]')].filter(own);
  const list = [...root.querySelectorAll('[data-switch-tabs]')].find(own);
  if (!list || !tabs.length || tabs.some(tab => !panels.some(panel => panel.dataset.switchPanel === tab.dataset.switchTab))) return null;
  const indicator = list.querySelector('[data-switch-indicator]');
  const life = new AbortController(), options = { signal: life.signal };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduced.matches || !!root.closest('.motion-paused');
  const prefix = `switch-${++sequence}`;
  let active = Math.max(0, tabs.findIndex(tab => tab.dataset.switchTab === root.dataset.active));
  let animations = [];

  list.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    const panel = panels.find(item => item.dataset.switchPanel === tab.dataset.switchTab);
    tab.id = `${prefix}-tab-${index}`;
    panel.id = `${prefix}-panel-${index}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => select(index), options);
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); select(next); tabs[next].focus();
    }, options);
  });

  // The indicator slides under the active tab; its size comes from layout, not hard-coded widths.
  function place() {
    if (!indicator) return;
    const tab = tabs[active];
    indicator.style.setProperty('--tab-x', `${tab.offsetLeft}px`);
    indicator.style.setProperty('--tab-w', `${tab.offsetWidth}px`);
  }
  function select(index, animate = true) {
    const changed = index !== active;
    active = index;
    const key = tabs[index].dataset.switchTab;
    root.dataset.active = key;
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    panels.forEach(panel => { panel.hidden = panel.dataset.switchPanel !== key; });
    place();
    animations.forEach(animation => animation.cancel());
    animations = [];
    if (animate && changed && !still() && !document.hidden) {
      for (const panel of panels.filter(item => !item.hidden)) {
        animations.push(panel.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 620, easing: SETTLE }));
        const rows = [...panel.querySelectorAll('[data-switch-stagger]')].filter(own).flatMap(group => [...group.children]);
        rows.slice(0, 12).forEach((row, i) => animations.push(row.animate(
          [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 560, delay: 80 + i * 45, easing: SETTLE, fill: 'backwards' })));
      }
    }
    root.dispatchEvent(new CustomEvent('switchchange', { detail: { key } }));
  }
  const resize = new ResizeObserver(place);
  resize.observe(list);
  list.hidden = false;
  root.classList.add('switch-enhanced');
  select(active, false);
  // Let the indicator take its first position without sliding in from the left.
  requestAnimationFrame(() => root.classList.add('switch-ready'));

  const api = {
    select(key) { const index = tabs.findIndex(tab => tab.dataset.switchTab === key); if (index >= 0) select(index); },
    dispose() {
      life.abort(); resize.disconnect(); animations.forEach(animation => animation.cancel());
      list.hidden = true; panels.forEach(panel => { panel.hidden = false; });
      root.classList.remove('switch-enhanced', 'switch-ready'); instances.delete(root);
    },
  };
  instances.set(root, api);
  return api;
}

export function enhanceSwitches(scope = document) {
  return [...scope.querySelectorAll('[data-switch]')].map(createSwitch).filter(Boolean);
}
