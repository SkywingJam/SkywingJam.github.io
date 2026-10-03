// Optional: paint cost and pixel difference for the acrylic wave painter. No production dependencies.
// Usage (with python3 server.py running):
//   node scripts/bench-wave.cjs
//   git show <ref>:lab/wave-scene.js > lab/wave-scene.ref.js && WAVE_REF=/lab/wave-scene.ref.js node scripts/bench-wave.cjs
// Software rendering in headless browsers inflates absolute times; compare ratios, then confirm on device.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.LAB_BASE_URL || 'http://127.0.0.1:8001';
const ref = process.env.WAVE_REF || '';
const [w, h, dpr] = (process.env.WAVE_SIZE || '1440x880x1.5').split('x').map(Number);
let browser;
(async () => {
  browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined});
  const page = await browser.newPage();
  await page.goto(baseURL + '/lab/');
  const result = await page.evaluate(async ({ref, w, h, dpr}) => {
    const load = async url => {
      const {createAcrylicPainter} = await import(url + '?bench=' + Math.random());
      const canvas = document.createElement('canvas'), painter = createAcrylicPainter(canvas);
      painter.resize(w, h, dpr, 0);
      return {canvas, painter};
    };
    const time = ({canvas, painter}, moving) => {
      const samples = [];
      for (let i = 0; i < 50; i++) {
        const tilt = moving ? Math.sin(i / 20) * .8 : 0, lift = moving ? Math.cos(i / 25) * .5 : 0;
        const start = performance.now();
        painter.paint(10 + i / 60, 0, tilt, 0, lift);
        canvas.getContext('2d').getImageData(0, 0, 1, 1); // flush
        if (i >= 10) samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      return +samples[samples.length >> 1].toFixed(1);
    };
    const current = await load('/lab/wave-scene.js');
    const out = {current: {idleMs: time(current, false), movingMs: time(current, true)}};
    if (ref) {
      const base = await load(ref);
      out.reference = {idleMs: time(base, false), movingMs: time(base, true)};
      out.diff = [];
      for (const s of [[0, 0, 0, 0], [35, 1, 0, 0], [12, 0, .8, .4], [50, .5, -.9, -.6]]) {
        const pixels = [current, base].map(({canvas, painter}) => {
          painter.paint(s[0], s[1], s[2], 0, s[3]); painter.paint(s[0], s[1], s[2], 0, s[3]);
          return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        });
        let max = 0, se = 0, n = 0;
        for (let i = 0; i < pixels[0].length; i += 4) for (let k = 0; k < 3; k++) {
          const e = Math.abs(pixels[0][i + k] - pixels[1][i + k]); if (e > max) max = e; se += e * e; n++;
        }
        out.diff.push({sample: s.join(','), maxChannelDiff: max, psnr: +(10 * Math.log10(65025 / (se / n || 1e-9))).toFixed(1)});
      }
    }
    return out;
  }, {ref, w, h, dpr});
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });
