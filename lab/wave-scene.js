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
// Exact critically damped spring: responsive under the pointer, no ringing on release.
function settle(value, velocity, target, dt) {
  const omega = 5.5;
  const offset = value - target;
  const impulse = (velocity + omega * offset) * dt;
  const decay = Math.exp(-omega * dt);
  return [target + (offset + impulse) * decay, (velocity - omega * impulse) * decay];
}
// Liquid response: each layer sloshes on its own under-damped spring. Deeper layers are
// heavier (lower ω) and a little more viscous (higher ζ), so they lag and settle later.
// ζ ≈ .6 gives one soft overshoot (~8%) and no visible ringing.
const sloshing = [{ omega: 4.6, zeta: .6 }, { omega: 3.85, zeta: .66 }, { omega: 3.2, zeta: .72 }];
function slosh(value, velocity, target, omega, zeta, dt) {
  const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    velocity += (-omega * omega * (value - target) - 2 * zeta * omega * velocity) * h;
    value += velocity * h;
  }
  return [value, velocity];
}
const palette = {
  sky: [[238, 233, 223], [8, 19, 38]],
  floor: [[183, 195, 198], [19, 40, 68]],
  light: [[255, 249, 233], [161, 194, 232]],
  rim: [[255, 255, 250], [196, 220, 249]],
  shade: [[75, 94, 112], [2, 10, 26]],
  frost: [[255, 251, 241], [112, 148, 186]],
  prismWarm: [[255, 151, 83], [182, 159, 233]],
  prismCool: [[61, 151, 219], [88, 190, 240]],
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
  const prefixes = {};
  let prefixNight = NaN;
  // Blurred transmission is computed at buffer resolution, then scaled up: the soft buffer is
  // already low-frequency, so blurring before upscaling matches the old full-resolution blur.
  const blurred = document.createElement('canvas');
  const blurCtx = blurred.getContext('2d');
  // Backdrop (sky, sun, window light) depends only on size, theme and pointer, never on time.
  const backdrop = document.createElement('canvas');
  const backdropCtx = backdrop.getContext('2d', { alpha: false });
  let backdropKey = '', pendingKey = '';

  function resize(w, h, ratio = 1, level = 0) {
    width = Math.max(1, w); height = Math.max(1, h); dpr = ratio; quality = level;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Preserve a half-resolution transmission buffer; coarse resampling caused visible
    // stair-steps in the reflected edges on large displays.
    soft.width = Math.max(1, Math.ceil(width / (quality ? 4 : 2)));
    soft.height = Math.max(1, Math.ceil(height / (quality ? 4 : 2)));
    if (blurCtx) { blurred.width = soft.width; blurred.height = soft.height; }
    if (backdropCtx) { backdrop.width = canvas.width; backdrop.height = canvas.height; backdropCtx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    backdropKey = pendingKey = '';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = softCtx.imageSmoothingEnabled = true;
  }

  // layers: optional per-layer { tilt, lift, stir } from the scene; posters omit it.
  function paint(time = 0, night = 0, tilt = 0, spread = 0, lift = 0, layers = null) {
    // Build each palette prefix once per frame; hundreds of colour strings are made per paint.
    if (night !== prefixNight) {
      prefixNight = night;
      for (const name in palette) {
        const [day, moon] = palette[name];
        prefixes[name] = `rgba(${day.map((v, i) => Math.round(mix(v, moon[i], night))).join(',')},`;
      }
    }
    const color = (name, alpha = 1) => `${prefixes[name]}${alpha})`;
    const lightX = .23 + tilt * .065;
    const lightY = .12 + lift * .035;
    function paintBackdrop(c, lightX, lightY) {
      const bg = c.createLinearGradient(0, 0, width * .2, height);
      bg.addColorStop(0, color('sky')); bg.addColorStop(1, color('floor'));
      c.fillStyle = bg; c.fillRect(0, 0, width, height);
      const sun = c.createRadialGradient(width * lightX, height * lightY, 0, width * lightX, height * lightY, width * .65);
      sun.addColorStop(0, color('light', mix(.72, .17, night)));
      sun.addColorStop(.4, color('light', mix(.22, .07, night)));
      sun.addColorStop(1, color('light', 0));
      c.fillStyle = sun; c.fillRect(0, 0, width, height);

      // Distant, broad illumination gives the frosted layers something to transmit.
      c.save();
      c.translate(width * (.28 + tilt * .045), 0); c.rotate(-.22);
      const windowLight = c.createLinearGradient(-width * .25, 0, width * .25, 0);
      windowLight.addColorStop(0, color('rim', 0));
      windowLight.addColorStop(.43, color('rim', mix(.16, .07, night)));
      windowLight.addColorStop(.52, color('rim', mix(.3, .11, night)));
      windowLight.addColorStop(1, color('rim', 0));
      c.fillStyle = windowLight; c.fillRect(-width * .25, -height, width * .5, height * 3);
      c.restore();
    }
    // Quantised key: 0.001 of tilt/lift moves the light by well under a device pixel.
    const key = `${night.toFixed(4)}|${tilt.toFixed(3)}|${lift.toFixed(3)}`;
    // Cache only once the key holds for two frames; while the pointer moves, paint directly.
    if (backdropCtx && (key === backdropKey || key === pendingKey)) {
      if (key !== backdropKey) { backdropKey = key; paintBackdrop(backdropCtx, lightX, lightY); }
      ctx.drawImage(backdrop, 0, 0, width, height);
    } else { pendingKey = key; paintBackdrop(ctx, lightX, lightY); }

    const amplitude = Math.min(height * .092, width * .115);
    const count = quality >= 2 ? 2 : 3;
    // Independent profiles may cross. Back-to-front transmission provides overlap;
    // never displace one profile to make room for another.
    for (let layer = 0; layer < count; layer++) {
      const index = count === 2 ? layer * 2 : layer;
      const base = height * (.36 + index * .17) + (index - 1) * spread * height * .018;
      const wave = waves[index];
      const own = layers?.[index];
      const layerTilt = own ? own.tilt : tilt, layerLift = own ? own.lift : lift, stir = own ? own.stir : 0;
      // A viscous liquid surface: components travel with dispersion (phase speed ∝ √k, so
      // longer swells lead and shorter ripples drift), and short wavelengths are damped
      // much harder (amplitude ∝ k^-2.5). A slow standing term adds the sloshing of a
      // contained volume. Fixed phases survive resize and theme changes.
      const k = wave.frequency * TAU, w = wave.speed;
      const p0 = wave.phase + time * w;
      const p1 = wave.phase * .7 + time * w * 1.272;   // √1.618
      const p2 = wave.phase * 1.6 + time * w * 1.618;  // √2.618
      const standing = .16 * Math.sin(time * wave.breath * .55 + index * 1.7);
      // Stirring by the pointer briefly lifts the swell, then the liquid calms.
      const a = amplitude * wave.amplitude * 1.12
        * (1 + .045 * Math.sin(time * wave.breath + index * 2.1) + .08 * stir);
      const lean = height * (.145 + index * .04);
      const points = [];
      const span = Math.max(width, 760);
      for (let x = -24; x <= width + 24; x += 6) {
        const u = (x + layerTilt * (20 + index * 15)) / span;
        let d = Math.cos(u * k + p0)
          + .3 * Math.cos(u * k * 1.618 + p1)
          + .045 * Math.cos(u * k * 2.618 + p2)
          + standing * Math.cos(u * k * .5 + wave.phase * 1.3);
        // Surface tension rounds the tallest crests and troughs instead of letting
        // aligned components form a point.
        d /= Math.sqrt(1 + d * d * .18);
        let y = base + d * a;
        // The lean follows the first sloshing mode of a tank (half sine), not a rigid
        // ramp: the middle carries the motion, the edges stay rounded.
        y += .5 * Math.sin(Math.PI * (x / width - .5)) * layerTilt * lean;
        y += layerLift * height * (.012 + index * .013);
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
      if (blurCtx) {
        // The cast shadow is a 22px blur; rendering it at buffer resolution is indistinguishable.
        const sx = blurred.width / width, sy = blurred.height / height;
        blurCtx.setTransform(1, 0, 0, 1, 0, 0); blurCtx.clearRect(0, 0, blurred.width, blurred.height);
        blurCtx.setTransform(sx, 0, 0, sy, (3 + tilt * 3) * sx, (15 + index * 3 + lift * 2) * sy);
        blurCtx.lineWidth = 8 + index * 3;
        blurCtx.strokeStyle = color('shade', mix(.32, .22, night));
        blurCtx.shadowColor = color('shade', mix(.58, .5, night)); blurCtx.shadowBlur = 22 * sx;
        blurCtx.stroke(edge);
        blurCtx.shadowBlur = 0; blurCtx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save(); ctx.clip(body); ctx.drawImage(blurred, 0, 0, width, height); ctx.restore();
      } else {
        ctx.save();
        ctx.clip(body);
        ctx.translate(3 + tilt * 3, 15 + index * 3 + lift * 2);
        ctx.lineWidth = 8 + index * 3;
        ctx.strokeStyle = color('shade', mix(.32, .22, night));
        ctx.shadowColor = color('shade', mix(.58, .5, night)); ctx.shadowBlur = 22 * dpr;
        ctx.stroke(edge);
        ctx.restore();
      }

      softCtx.drawImage(canvas, 0, 0, soft.width, soft.height);
      ctx.save(); ctx.clip(body);
      // Blur the transmitted image only. The surface and rim below stay sharp.
      if (hasFilter && blurCtx) {
        // Same radius as before (5–8 CSS px), converted into buffer pixels.
        blurCtx.clearRect(0, 0, blurred.width, blurred.height);
        blurCtx.filter = `blur(${(5 + index * 1.5) * soft.width / (width + 20)}px)`;
        blurCtx.drawImage(soft, 0, 0);
        blurCtx.filter = 'none';
        ctx.globalAlpha = .82;
        ctx.drawImage(blurred, -8 - index * 2, -4 + index * 2, width + 20, height + 16);
      } else if (hasFilter) {
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
      // Bevel shading per 12px span (was 6px): the slope varies slowly, so the result is unchanged
      // to the eye while the number of gradient fills is halved.
      for (let j = 0; j < points.length - 1; j += 2) {
        const p = points[j], q = points[Math.min(j + 2, points.length - 1)];
        const slope = (q.y - p.y) / (q.x - p.x);
        // Daylight has less ambient fill and a stronger key light from the upper left.
        // Keep the moonlight endpoint unchanged while interpolating between themes.
        const lit = mix(clamp(.58 - slope * .85, .08, 1), clamp(.62 - slope * .55, .15, 1), night);
        const local = mix(
          .28 + .72 * Math.exp(-Math.pow((p.x / width - (.27 + tilt * .065)) / .22, 2)),
          .64 + .36 * Math.exp(-Math.pow((p.x / width - (.27 + tilt * .065)) / .26, 2)), night);
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
      const glint = ctx.createLinearGradient(width * tilt * .045, 0, width * (1 + tilt * .045), 0);
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

      // Fine chromatic separation inside the polished rim, concentrated in reflected light.
      // The neutral highlight stays on top; tint is strongest where the key light lands.
      ctx.save(); ctx.clip(body);
      ctx.globalAlpha = mix(.75, 1, night);
      const separation = 1.15 + Math.abs(tilt) * 1.1;
      for (const [tint, direction] of [['prismWarm', -1], ['prismCool', 1]]) {
        const spectral = ctx.createLinearGradient(width * tilt * .045, 0, width * (1 + tilt * .045), 0);
        spectral.addColorStop(0, color(tint, 0));
        spectral.addColorStop(.2, color(tint, mix(.36, .2, night)));
        spectral.addColorStop(.32, color(tint, mix(.66, .42, night)));
        spectral.addColorStop(.55, color(tint, mix(.095, .05, night)));
        spectral.addColorStop(.72, color(tint, 0));
        spectral.addColorStop(.86, color(tint, mix(.35, .2, night)));
        spectral.addColorStop(1, color(tint, 0));
        ctx.save(); ctx.translate(direction * separation, 1.7 + index * .28 + direction * .55);
        ctx.strokeStyle = spectral; ctx.lineWidth = 1.35 + index * .25; ctx.stroke(edge); ctx.restore();
      }
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
  return { resize, paint, dispose() { soft.width = soft.height = grain.width = grain.height = blurred.width = blurred.height = backdrop.width = backdrop.height = 1; } };
}

export function createWaveScene(canvas, stage, { dark = false, paused = false, onFallback } = {}) {
  const painter = createAcrylicPainter(canvas);
  let disposed = false, visible = stage.getBoundingClientRect().bottom > 0;
  let frame = 0, last = 0, time = 0, night = Number(dark), targetNight = night;
  let tilt = 0, targetTilt = 0, tiltVelocity = 0, lift = 0, targetLift = 0, liftVelocity = 0;
  let spread = 0, quality = 0, slowFrames = 0;
  let mobile = false, width = 0, height = 0, renderAverage = 0, reported = 0;
  // Ambient drift moves well under half a pixel per frame at 30fps, so it is drawn at 30fps.
  // Pointer response, theme fades and scroll easing run at up to 60fps; 120Hz displays
  // (ProMotion) would otherwise repaint the whole canvas twice as often for no visible gain.
  const AMBIENT_FRAME = 1 / 30, ACTIVE_FRAME = 1 / 60;
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const hero = stage.closest('.hero') || stage;
  const life = new AbortController();
  const listener = { signal: life.signal, passive: true };
  const canMove = () => !paused && visible && !document.hidden;
  const layers = sloshing.map(spring => ({ ...spring, tilt: 0, tiltVelocity: 0, lift: 0, liftVelocity: 0, stir: 0 }));
  function draw() {
    const start = performance.now();
    painter.paint(time, night, tilt, spread, lift, layers);
    const cost = performance.now() - start;
    renderAverage = renderAverage ? mix(renderAverage, cost, .05) : cost;
    // Diagnostics are written a few times per second, not every frame, to avoid DOM churn.
    if (start - reported > 250) report(start);
  }
  function report(now = performance.now()) {
    reported = now;
    stage.dataset.renderMs = renderAverage.toFixed(1);
    stage.dataset.phase = time.toFixed(3);
    stage.dataset.tilt = tilt.toFixed(3);
    stage.dataset.lift = lift.toFixed(3);
  }
  const settled = () => night === targetNight
    && Math.abs(tilt - targetTilt) < .002 && Math.abs(tiltVelocity) < .01
    && Math.abs(lift - targetLift) < .002 && Math.abs(liftVelocity) < .01
    && layers.every(l => Math.abs(l.tilt - targetTilt) < .002 && Math.abs(l.tiltVelocity) < .01
      && Math.abs(l.lift - targetLift) < .002 && Math.abs(l.liftVelocity) < .01 && l.stir < .01)
    && Math.abs(clamp(-stage.getBoundingClientRect().top / height, 0, 1) - spread) < .001;
  function resize() {
    if (disposed) return;
    const rect = stage.getBoundingClientRect();
    width = rect.width; height = rect.height; mobile = width <= 700;
    if (mobile || !pointer.matches) resetPointer();
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
    const minFrame = mobile || settled() ? AMBIENT_FRAME : ACTIVE_FRAME;
    if (last && elapsed < minFrame - .002) { frame = requestAnimationFrame(tick); return; }
    const dt = Math.min(elapsed, .05); last = now;
    const blend = 1 - Math.exp(-dt * 5);
    if (canMove()) {
      time += dt;
      [tilt, tiltVelocity] = settle(tilt, tiltVelocity, targetTilt, dt);
      [lift, liftVelocity] = settle(lift, liftVelocity, targetLift, dt);
      const calm = 1 - Math.exp(-dt * 2.5);
      for (const layer of layers) {
        [layer.tilt, layer.tiltVelocity] = slosh(layer.tilt, layer.tiltVelocity, targetTilt, layer.omega, layer.zeta, dt);
        [layer.lift, layer.liftVelocity] = slosh(layer.lift, layer.liftVelocity, targetLift, layer.omega, layer.zeta, dt);
        layer.stir += (Math.min(1, Math.abs(layer.tiltVelocity) * .5 + Math.abs(layer.liftVelocity) * .3) - layer.stir) * calm;
      }
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
    report();
    stage.dataset.state = !visible || document.hidden ? 'idle' : paused ? 'paused' : 'running';
    if (visible && !document.hidden && (canMove() || night !== targetNight)) frame = requestAnimationFrame(tick);
  }
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); life.abort(); observer.disconnect(); sizing.disconnect();
    painter.dispose();
  }
  function resetPointer() { targetTilt = 0; targetLift = 0; }
  hero.addEventListener('pointermove', event => {
    if (!pointer.matches || mobile || !canMove() || event.pointerType === 'touch') return;
    const rect = hero.getBoundingClientRect();
    targetTilt = clamp(((event.clientX - rect.left) / rect.width * 2 - 1) * 1.3, -1, 1);
    targetLift = clamp(((event.clientY - rect.top) / rect.height * 2 - 1) * 1.15, -1, 1);
  }, listener);
  hero.addEventListener('pointerleave', resetPointer, listener);
  hero.addEventListener('pointercancel', resetPointer, listener);
  window.addEventListener('blur', resetPointer, listener);
  pointer.addEventListener('change', resetPointer, listener);
  document.addEventListener('visibilitychange', sync, listener);
  canvas.addEventListener('contextlost', fallback, listener);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) resetPointer();
    sync();
  });
  observer.observe(stage);
  const sizing = new ResizeObserver(resize); sizing.observe(stage);
  try { resize(); } catch (error) { dispose(); throw error; }
  stage.classList.add('scene-ready');
  return {
    // instant: jump to the new palette (used under a view-transition reveal, which is itself the fade).
    setTheme(value, instant = false) {
      targetNight = Number(value);
      if (instant || !visible || document.hidden) { night = targetNight; draw(); }
      sync();
    },
    setPaused(value) { paused = value; sync(); },
    dispose,
  };
}
