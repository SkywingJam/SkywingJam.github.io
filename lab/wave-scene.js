// Shape study after 7e3038a. Frosted transmission is an artistic 2D approximation.
// All light and wave layers share this canvas; page text is never sampled or blurred.
const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const mix = (a, b, t) => a + (b - a) * t;
// Deterministic but independent layers: no shared travelling phase or breathing cycle.
const waves = [
  { phase: .68, frequency: 1.14, speed: .073, breath: .23, amplitude: .95 },
  { phase: 2.05, frequency: .93, speed: -.051, breath: .31, amplitude: 1.08 },
  { phase: 2.48, frequency: 1.27, speed: .089, breath: .19, amplitude: .88 },
];
const palette = {
  sky: [[238, 233, 223], [8, 19, 38]],
  floor: [[183, 195, 198], [19, 40, 68]],
  light: [[255, 249, 233], [161, 194, 232]],
  rim: [[255, 255, 250], [196, 220, 249]],
  shade: [[75, 94, 112], [2, 10, 26]],
  frost: [[255, 251, 241], [112, 148, 186]],
};

/** Reusable painter, also used to export the fallback posters at a fixed phase. */
export function createAcrylicPainter(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');
  const soft = document.createElement('canvas');
  const softCtx = soft.getContext('2d', { alpha: false });
  if (!softCtx) throw new Error('Canvas buffer unavailable');
  const grain = document.createElement('canvas');
  grain.width = grain.height = 128;
  const grainCtx = grain.getContext('2d');
  const pixels = grainCtx.createImageData(128, 128);
  let seed = 71;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    pixels.data[i + 3] = (seed >>> 27);
  }
  grainCtx.putImageData(pixels, 0, 0);
  const texture = ctx.createPattern(grain, 'repeat');
  const hasFilter = 'filter' in ctx;
  let width = 1, height = 1, dpr = 1, quality = 0;

  function resize(w, h, ratio = 1, level = 0) {
    width = Math.max(1, w); height = Math.max(1, h); dpr = ratio; quality = level;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Preserve a half-resolution transmission buffer; coarse resampling caused visible
    // stair-steps in the reflected edges on large displays.
    soft.width = Math.max(1, Math.ceil(width / (quality ? 4 : 2)));
    soft.height = Math.max(1, Math.ceil(height / (quality ? 4 : 2)));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = softCtx.imageSmoothingEnabled = true;
  }

  function paint(time = 0, night = 0, tilt = 0, spread = 0) {
    const color = (name, alpha = 1) => {
      const [day, moon] = palette[name];
      return `rgba(${day.map((v, i) => Math.round(mix(v, moon[i], night))).join(',')},${alpha})`;
    };
    const bg = ctx.createLinearGradient(0, 0, width * .2, height);
    bg.addColorStop(0, color('sky')); bg.addColorStop(1, color('floor'));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    const sun = ctx.createRadialGradient(width * .23, height * .12, 0, width * .23, height * .12, width * .65);
    sun.addColorStop(0, color('light', mix(.72, .17, night)));
    sun.addColorStop(.4, color('light', mix(.22, .07, night)));
    sun.addColorStop(1, color('light', 0));
    ctx.fillStyle = sun; ctx.fillRect(0, 0, width, height);

    // Distant, broad illumination gives the frosted layers something to transmit.
    ctx.save();
    ctx.translate(width * .28, 0); ctx.rotate(-.22);
    const windowLight = ctx.createLinearGradient(-width * .25, 0, width * .25, 0);
    windowLight.addColorStop(0, color('rim', 0));
    windowLight.addColorStop(.43, color('rim', mix(.16, .07, night)));
    windowLight.addColorStop(.52, color('rim', mix(.3, .11, night)));
    windowLight.addColorStop(1, color('rim', 0));
    ctx.fillStyle = windowLight; ctx.fillRect(-width * .25, -height, width * .5, height * 3);
    ctx.restore();

    const amplitude = Math.min(height * .092, width * .115);
    const count = quality >= 2 ? 2 : 3;
    // Independent profiles may cross. Back-to-front transmission provides overlap;
    // never displace one profile to make room for another.
    for (let layer = 0; layer < count; layer++) {
      const index = count === 2 ? layer * 2 : layer;
      const base = height * (.36 + index * .17) + (index - 1) * spread * height * .018;
      const wave = waves[index];
      const phase = wave.phase + time * wave.speed;
      const points = [];
      // Fixed phases survive resize and theme changes. Gentle harmonics follow the reference.
      const span = Math.max(width, 760);
      for (let x = -24; x <= width + 24; x += 6) {
        const u = x / span;
        const a = amplitude * wave.amplitude * (1 + .045 * Math.sin(time * wave.breath + index * 2.1));
        let y = base + Math.cos(u * TAU * wave.frequency + phase) * a;
        y += Math.sin(u * TAU * wave.frequency * 1.77 + wave.phase * .7 + time * wave.speed * .63) * a * .28;
        y += Math.sin(u * TAU * wave.frequency * 3.33 + wave.phase * 1.6 - time * wave.speed * .41) * a * .055;
        y += (x / width - .5) * tilt * height * .028;
        points.push({ x, y });
      }
      const edge = new Path2D();
      edge.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p = points[i - 1], q = points[i];
        edge.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
      }
      edge.lineTo(points.at(-1).x, points.at(-1).y);
      const body = new Path2D(edge);
      body.lineTo(width + 24, height + 24); body.lineTo(-24, height + 24); body.closePath();

      // Shadow falls down/right onto the already painted layer, away from the light.
      ctx.save();
      ctx.clip(body);
      ctx.translate(3, 15 + index * 3);
      ctx.lineWidth = 8 + index * 3;
      ctx.strokeStyle = color('shade', mix(.32, .22, night));
      ctx.shadowColor = color('shade', mix(.58, .5, night)); ctx.shadowBlur = 22 * dpr;
      ctx.stroke(edge);
      ctx.restore();

      softCtx.drawImage(canvas, 0, 0, soft.width, soft.height);
      ctx.save(); ctx.clip(body);
      // Blur the transmitted image only. The surface and rim below stay sharp.
      if (hasFilter) {
        ctx.filter = `blur(${(5 + index * 1.5) * dpr}px)`;
        ctx.globalAlpha = .82;
        ctx.drawImage(soft, -8 - index * 2, -4 + index * 2, width + 20, height + 16);
        ctx.filter = 'none';
      } else {
        // Portable diffusion: overlapping samples retain detail without blocky upscaling.
        ctx.globalAlpha = .28;
        for (const [dx, dy] of [[-4, -3], [4, -3], [-4, 3], [4, 3], [0, 0]]) {
          ctx.drawImage(soft, dx - 8, dy - 4, width + 16, height + 12);
        }
      }
      ctx.globalAlpha = 1;
      const milk = ctx.createLinearGradient(0, base - amplitude, 0, height);
      milk.addColorStop(0, color('frost', mix(.07, .07, night)));
      milk.addColorStop(.3, color('frost', mix(.045, .035, night)));
      milk.addColorStop(1, color('frost', mix(.02, .015, night)));
      ctx.fillStyle = milk; ctx.fillRect(0, 0, width, height);

      // A translucent, curved bevel: broad specular reflection, then a shaded inner face.
      // Shading strength follows the local slope instead of a uniform neon outline.
      const depth = Math.min(height * .19, 140) * (1 + index * .12);
      for (let j = 0; j < points.length - 1; j++) {
        const p = points[j], q = points[j + 1];
        const slope = (q.y - p.y) / (q.x - p.x);
        // Daylight has less ambient fill and a stronger key light from the upper left.
        // Keep the moonlight endpoint unchanged while interpolating between themes.
        const lit = mix(clamp(.58 - slope * .85, .08, 1), clamp(.62 - slope * .55, .15, 1), night);
        const local = mix(
          .28 + .72 * Math.exp(-Math.pow((p.x / width - .27) / .22, 2)),
          .64 + .36 * Math.exp(-Math.pow((p.x / width - .27) / .26, 2)), night);
        const shade = ctx.createLinearGradient(p.x, p.y, p.x - slope * depth / (1 + slope * slope), p.y + depth / (1 + slope * slope));
        shade.addColorStop(0, color('rim', lit * local * mix(.98, .38, night)));
        shade.addColorStop(.07, color('rim', lit * local * mix(.42, .12, night)));
        shade.addColorStop(.21, color('shade', mix(.24, .11, night) * mix(1.35 - lit * .7, 1.2 - lit * .35, night)));
        shade.addColorStop(.44, color('frost', lit * mix(local * .3, .06, night)));
        shade.addColorStop(1, color('frost', 0));
        ctx.fillStyle = shade;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 1); ctx.lineTo(q.x, q.y - 1);
        ctx.lineTo(q.x, q.y + depth); ctx.lineTo(p.x, p.y + depth); ctx.closePath(); ctx.fill();
      }
      // A restrained reflection inside the bevel, strongest on the light-facing crest.
      const glint = ctx.createLinearGradient(0, 0, width, 0);
      glint.addColorStop(0, color('rim', 0));
      glint.addColorStop(.18, color('rim', mix(.12, .045, night)));
      glint.addColorStop(.3, color('rim', mix(.85, .32, night)));
      glint.addColorStop(.43, color('rim', mix(.1, .03, night)));
      glint.addColorStop(.65, color('rim', 0));
      glint.addColorStop(.84, color('rim', mix(.18, .09, night)));
      glint.addColorStop(1, color('rim', 0));
      ctx.save(); ctx.translate(0, 5 + index * 1.5);
      ctx.strokeStyle = glint; ctx.lineWidth = 2.2 + index * .4;
      ctx.shadowBlur = 9 * dpr; ctx.shadowColor = color('light', .4); ctx.stroke(edge);
      ctx.restore();
      // Cached static microtexture, never animated noise.
      ctx.globalAlpha = mix(.08, .035, night); ctx.fillStyle = texture;
      ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1;
      ctx.restore();

      const rim = ctx.createLinearGradient(0, 0, width, 0);
      rim.addColorStop(0, color('rim', mix(.3, .13, night)));
      rim.addColorStop(.23, color('rim', mix(.95, .58, night)));
      rim.addColorStop(.42, color('rim', mix(.5, .22, night)));
      rim.addColorStop(.66, color('rim', mix(.2, .08, night)));
      rim.addColorStop(.84, color('rim', mix(.7, .31, night)));
      rim.addColorStop(1, color('rim', mix(.25, .13, night)));
      ctx.save(); ctx.strokeStyle = rim; ctx.lineWidth = 1 + index * .35;
      ctx.shadowColor = color('rim', mix(.5, .2, night)); ctx.shadowBlur = (6 + index * 2) * dpr;
      ctx.stroke(edge); ctx.restore();
    }
  }
  return { resize, paint, dispose() { soft.width = soft.height = grain.width = grain.height = 1; } };
}

export function createWaveScene(canvas, stage, { dark = false, paused = false, onFallback } = {}) {
  const painter = createAcrylicPainter(canvas);
  let disposed = false, visible = stage.getBoundingClientRect().bottom > 0;
  let frame = 0, last = 0, time = 0, night = Number(dark), targetNight = night;
  let tilt = 0, targetTilt = 0, spread = 0, quality = 0, slowFrames = 0;
  let mobile = false, width = 0, height = 0, renderAverage = 0;
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const life = new AbortController();
  const listener = { signal: life.signal, passive: true };
  const canMove = () => !paused && visible && !document.hidden;
  function draw() {
    const start = performance.now();
    painter.paint(time, night, tilt, spread);
    const cost = performance.now() - start;
    renderAverage = renderAverage ? mix(renderAverage, cost, .05) : cost;
    stage.dataset.renderMs = renderAverage.toFixed(1);
    stage.dataset.phase = time.toFixed(3);
  }
  function resize() {
    if (disposed) return;
    const rect = stage.getBoundingClientRect();
    width = rect.width; height = rect.height; mobile = width <= 700;
    painter.resize(width, height, Math.min(devicePixelRatio || 1, mobile || quality ? 1 : 1.5), quality);
    stage.dataset.quality = ['full', 'soft', 'minimal'][quality];
    draw(); sync();
  }
  function fallback() {
    dispose(); stage.classList.remove('scene-ready'); stage.dataset.state = 'static'; onFallback?.();
  }
  function tick(now) {
    frame = 0;
    if (disposed || document.hidden || !visible) { last = 0; return; }
    const elapsed = last ? (now - last) / 1000 : 1 / 60;
    if (mobile && last && elapsed < 1 / 30 - .002) { frame = requestAnimationFrame(tick); return; }
    const dt = Math.min(elapsed, .05); last = now;
    const blend = 1 - Math.exp(-dt * 5);
    if (canMove()) {
      time += dt;
      tilt += (targetTilt - tilt) * (1 - Math.exp(-dt * 2.2));
      const scroll = clamp(-stage.getBoundingClientRect().top / height, 0, 1);
      spread += (scroll - spread) * blend;
    }
    night += (targetNight - night) * (1 - Math.exp(-dt * 8));
    if (Math.abs(night - targetNight) < .002) night = targetNight;
    try { draw(); } catch { fallback(); return; }
    // Degrade only after sustained rendering cost, not idle time or a background-tab gap.
    if (canMove()) {
      slowFrames = renderAverage > (mobile ? 28 : 19) ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 100) {
        slowFrames = 0;
        if (quality === 2) { fallback(); return; }
        quality++; renderAverage = 0; resize(); return;
      }
    }
    if (canMove() || night !== targetNight) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (disposed) return;
    stage.dataset.state = !visible || document.hidden ? 'idle' : paused ? 'paused' : 'running';
    if (visible && !document.hidden && (canMove() || night !== targetNight)) frame = requestAnimationFrame(tick);
  }
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); life.abort(); observer.disconnect(); sizing.disconnect();
    painter.dispose();
  }
  window.addEventListener('pointermove', event => {
    if (pointer.matches && !mobile && canMove()) targetTilt = clamp((event.clientX / innerWidth - .5) * 2, -1, 1);
  }, listener);
  document.documentElement.addEventListener('pointerleave', () => { targetTilt = 0; }, listener);
  document.addEventListener('visibilitychange', sync, listener);
  canvas.addEventListener('contextlost', fallback, listener);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(stage);
  const sizing = new ResizeObserver(resize); sizing.observe(stage);
  try { resize(); } catch (error) { dispose(); throw error; }
  stage.classList.add('scene-ready');
  return {
    setTheme(value) {
      targetNight = Number(value);
      if (!visible || document.hidden) { night = targetNight; draw(); }
      sync();
    },
    setPaused(value) { paused = value; sync(); },
    dispose,
  };
}
