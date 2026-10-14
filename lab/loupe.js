// Draggable acrylic magnifier over any HTML content. Content lives in HTML; the lens shows a
// scaled copy of it. Without JavaScript the lens stays hidden and the content reads as it is.
//   [data-loupe]          root (focusable; arrow keys move the lens). data-loupe-zoom, data-loupe-start="x,y" (0–1)
//   [data-loupe-source]   content to magnify
//   [data-loupe-lens]     lens (hidden in HTML), holding a .loupe-view
const instances = new WeakMap();

export function createLoupe(root) {
  if (instances.has(root)) return instances.get(root);
  const source = root.querySelector('[data-loupe-source]');
  const lens = root.querySelector('[data-loupe-lens]');
  const view = lens?.querySelector('.loupe-view');
  if (!source || !view) return null;
  const life = new AbortController(), options = { signal: life.signal };
  const zoom = Number(root.dataset.loupeZoom) || 2.2;
  const [startX, startY] = (root.dataset.loupeStart || '.5,.5').split(',').map(Number);
  const copy = source.cloneNode(true);
  copy.removeAttribute('data-loupe-source');
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  view.replaceChildren(copy);
  let x = 0, y = 0, fx = startX, fy = startY, drag = null;

  // Position is kept as a fraction of the source, so it survives resizes.
  function render() {
    const width = source.offsetWidth, height = source.offsetHeight, r = lens.offsetWidth / 2;
    x = Math.max(0, Math.min(width, fx * width));
    y = Math.max(0, Math.min(height, fy * height));
    copy.style.width = `${width}px`;
    lens.style.transform = `translate(${source.offsetLeft + x - r}px, ${source.offsetTop + y - r}px)`;
    view.style.transform = `translate(${r - x * zoom}px, ${r - y * zoom}px) scale(${zoom})`;
  }
  function moveTo(clientX, clientY) {
    const box = source.getBoundingClientRect();
    fx = Math.max(0, Math.min(1, (clientX - box.left - drag.dx) / box.width));
    fy = Math.max(0, Math.min(1, (clientY - box.top - drag.dy) / box.height));
    render();
  }
  lens.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const box = lens.getBoundingClientRect();
    drag = { id: event.pointerId, dx: event.clientX - (box.left + box.width / 2), dy: event.clientY - (box.top + box.height / 2) };
    lens.setPointerCapture(event.pointerId);
    root.classList.add('loupe-dragging');
    event.preventDefault();
  }, options);
  lens.addEventListener('pointermove', event => { if (drag?.id === event.pointerId) moveTo(event.clientX, event.clientY); }, options);
  const end = () => { drag = null; root.classList.remove('loupe-dragging'); };
  lens.addEventListener('pointerup', end, options);
  lens.addEventListener('pointercancel', end, options);
  lens.addEventListener('lostpointercapture', end, options);
  root.addEventListener('keydown', event => {
    const step = (event.shiftKey ? 36 : 12);
    const dx = { ArrowLeft: -step, ArrowRight: step }[event.key] || 0;
    const dy = { ArrowUp: -step, ArrowDown: step }[event.key] || 0;
    if (!dx && !dy) return;
    event.preventDefault();
    fx = Math.max(0, Math.min(1, fx + dx / source.offsetWidth));
    fy = Math.max(0, Math.min(1, fy + dy / source.offsetHeight));
    render();
  }, options);
  const resize = new ResizeObserver(render);
  resize.observe(source);
  lens.hidden = false;
  root.classList.add('loupe-enhanced');
  render();

  const api = {
    dispose() {
      end(); life.abort(); resize.disconnect(); view.replaceChildren();
      lens.hidden = true; root.classList.remove('loupe-enhanced'); instances.delete(root);
    },
  };
  instances.set(root, api);
  return api;
}

export function enhanceLoupes(scope = document) {
  return [...scope.querySelectorAll('[data-loupe]')].map(createLoupe).filter(Boolean);
}
