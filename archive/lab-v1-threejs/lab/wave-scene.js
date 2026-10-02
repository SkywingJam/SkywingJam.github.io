import * as THREE from './vendor/three.module.min.js';

// The physical material and shader chunks are pinned to Three.js 0.180.0.
const waveGLSL = `
uniform float uTime;
float waveHeight(vec2 p) {
  return .86 * sin(p.x * .57 + p.y * .31 + uTime * .19)
       + .48 * sin(p.x * .31 - p.y * .56 - uTime * .13 + 1.7)
       + .15 * sin(p.x * .91 + p.y * .44 + uTime * .11 + .8);
}
vec2 waveSlope(vec2 p) {
  return .86 * vec2(.57, .31) * cos(p.x * .57 + p.y * .31 + uTime * .19)
       + .48 * vec2(.31, -.56) * cos(p.x * .31 - p.y * .56 - uTime * .13 + 1.7)
       + .15 * vec2(.91, .44) * cos(p.x * .91 + p.y * .44 + uTime * .11 + .8);
}`;

function studioEnvironment(renderer) {
  // A compact, procedural HDR studio: long strips wrap around the material.
  const width = 512, height = 256;
  const data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / height;
    const band = 6 * Math.exp(-Math.pow((v - .31) / .009, 2))
               + 4 * Math.exp(-Math.pow((v - .53) / .007, 2))
               + 2 * Math.exp(-Math.pow((v - .69) / .012, 2));
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const softbox = .65 + .35 * Math.pow(Math.sin(u * Math.PI * 2), 2);
      const base = .22 + .18 * Math.sin(v * Math.PI);
      const value = base + band * softbox;
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value * .96;
      data[i + 2] = value * .87;
      data[i + 3] = 1;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  texture.dispose();
  generator.dispose();
  return target;
}

export function createWaveScene(canvas, stage, { dark = false, paused = false, onFallback = () => {} } = {}) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'low-power' });
  if (!context) throw new Error('WebGL2 unavailable');
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  const environment = studioEnvironment(renderer);
  scene.environment = environment.texture;
  const clock = { value: 0 };
  const material = new THREE.MeshPhysicalMaterial({
    color: '#fbf9f1', metalness: 0, roughness: .035, transmission: 1,
    thickness: .38, ior: 1.47, opacity: 1, envMapIntensity: 1.35,
    attenuationColor: '#eee6d4', attenuationDistance: 7,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = clock;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + waveGLSL);
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      vec2 slope = waveSlope(position.xz);
      vec3 objectNormal;
      if (abs(normal.y) > .5) {
        objectNormal = normalize(vec3(-slope.x, 1., -slope.y)) * sign(normal.y);
      } else {
        // Inverse transpose of the height-field deformation, including slab edges.
        objectNormal = normalize(vec3(normal.x - slope.x * normal.y, normal.y, normal.z - slope.y * normal.y));
      }
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position; transformed.y += waveHeight(position.xz);');
  };
  material.customProgramCacheKey = () => 'lab-wave-r180-v1';
  const mobile = matchMedia('(max-width: 700px)').matches;
  const geometry = new THREE.BoxGeometry(32, .16, 40, mobile ? 80 : 160, 1, mobile ? 80 : 144);
  const wave = new THREE.Mesh(geometry, material);
  // Shader deformation extends beyond the original geometry bounds.
  wave.frustumCulled = false;
  scene.add(wave);

  const floorMaterial = new THREE.ShaderMaterial({
    uniforms: { uDark: { value: dark ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float uDark;
      void main(){
        vec2 p=vUv;
        float softness=sin(p.x*19.+p.y*9.)*.085+sin(p.y*25.-p.x*4.)*.065;
        float pool=exp(-length((p-vec2(.64,.57))*vec2(2.,3.))*3.);
        vec3 light=vec3(.63,.56,.45)+softness+pool*.23;
        vec3 dark=vec3(.023,.038,.047)+softness*.08+pool*vec3(.028,.044,.052);
        gl_FragColor=vec4(mix(light,dark,uDark),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.8;
  scene.add(floor);

  let running = false, disposed = false, failed = false, visible = true, frame = 0;
  let last = null, previousRender = null, time = 0, quality = 0, samples = [], warmup = 0;
  let isDark = dark, themeCurrent = dark ? 1 : 0, themeTarget = themeCurrent;
  let width = 1, height = 1, small = mobile;
  const pointer = { x: 0, y: 0 }, current = { x: 0, y: 0 };
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const colorLight = new THREE.Color('#f2efe8'), colorDark = new THREE.Color('#151c20');
  scene.background = colorLight.clone();

  function applyTheme() {
    scene.background.copy(colorLight).lerp(colorDark, themeCurrent);
    floorMaterial.uniforms.uDark.value = themeCurrent;
    material.color.set('#fbf9f1').lerp(new THREE.Color('#b9d4d9'), themeCurrent);
    material.attenuationColor.set('#eee6d4').lerp(new THREE.Color('#59767e'), themeCurrent);
    material.envMapIntensity = 1.35 - themeCurrent * .45;
    renderer.toneMappingExposure = 1.12 - themeCurrent * .37;
  }
  function render() {
    clock.value = time;
    applyTheme();
    camera.position.set(current.x * .24, (small ? 7.8 : 5.8) + current.y * .15, small ? 15.5 : 14.5);
    camera.lookAt(0, small ? -.05 : .1, -1.4);
    // A very small exposure cycle gives the highlights a slow breath.
    renderer.toneMappingExposure += Math.sin(time * .48) * .014;
    renderer.render(scene, camera);
  }
  function fail() {
    if (failed || disposed) return;
    failed = true;
    stop();
    stage.classList.remove('scene-ready');
    stage.dataset.state = 'static';
    onFallback();
    dispose();
  }
  function stop() {
    cancelAnimationFrame(frame);
    running = false;
    last = previousRender = null;
  }
  function animate(timestamp) {
    if (!running || disposed) return;
    const rate = small || quality > 0 ? 30 : 60;
    if (previousRender !== null && timestamp - previousRender < 1000 / rate - 1) {
      frame = requestAnimationFrame(animate);
      return;
    }
    const elapsed = last === null ? 0 : (timestamp - last) / 1000;
    const delta = Math.min(elapsed, .05);
    last = previousRender = timestamp;
    time += delta;
    const damping = 1 - Math.exp(-delta * 3);
    current.x += (pointer.x - current.x) * damping;
    current.y += (pointer.y - current.y) * damping;
    themeCurrent += (themeTarget - themeCurrent) * (1 - Math.exp(-delta * 10));
    try { render(); } catch { fail(); return; }
    warmup += delta;
    if (elapsed > 0 && warmup > 2) samples.push(elapsed * 1000);
    if (samples.length === 90) {
      const sorted = samples.slice().sort((a, b) => a - b);
      const median = sorted[45];
      stage.dataset.frameMs = median.toFixed(1);
      samples = [];
      if (median > (small || quality > 0 ? 60 : 40)) {
        if (quality < 2) {
          quality++;
          resize();
        } else { fail(); return; }
      }
    }
    frame = requestAnimationFrame(animate);
  }
  function sync() {
    stop();
    if (disposed || failed) return;
    stage.dataset.state = paused ? 'paused' : visible && !document.hidden ? 'running' : 'idle';
    if (!visible || document.hidden || paused) return;
    running = true;
    frame = requestAnimationFrame(animate);
  }
  function resize() {
    if (disposed) return;
    const bounds = stage.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    small = width <= 700;
    const ratio = Math.min(devicePixelRatio || 1, small ? 1 : 1.5) * (quality === 0 ? 1 : quality === 1 ? .8 : .6);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = small ? 44 : 38;
    camera.updateProjectionMatrix();
    // Keep the waves horizontal on narrow screens without stretching geometry.
    stage.dataset.quality = String(quality);
    render();
  }
  function move(event) {
    if (paused || !finePointer.matches || event.pointerType !== 'mouse') return;
    const rect = stage.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / width * 2 - 1;
    pointer.y = (event.clientY - rect.top) / height * 2 - 1;
  }
  function leave() { pointer.x = pointer.y = 0; }
  const hero = stage.closest('.hero');
  hero.addEventListener('pointermove', move, { passive: true });
  hero.addEventListener('pointerleave', leave);
  document.addEventListener('visibilitychange', sync);
  canvas.addEventListener('webglcontextlost', lost);
  function lost(event) { event.preventDefault(); fail(); }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, { threshold: .02 });
  visibilityObserver.observe(stage);
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    hero.removeEventListener('pointermove', move);
    hero.removeEventListener('pointerleave', leave);
    document.removeEventListener('visibilitychange', sync);
    canvas.removeEventListener('webglcontextlost', lost);
    geometry.dispose(); material.dispose();
    floorGeometry.dispose(); floorMaterial.dispose();
    environment.dispose(); renderer.dispose();
  }
  try {
    resize();
    stage.classList.add('scene-ready');
    sync();
  } catch (error) { dispose(); throw error; }
  return {
    setPaused(value) { paused = value; leave(); sync(); },
    setTheme(value) {
      isDark = value;
      themeTarget = isDark ? 1 : 0;
      if (paused || !visible || document.hidden) { themeCurrent = themeTarget; render(); }
    },
    dispose,
  };
}
