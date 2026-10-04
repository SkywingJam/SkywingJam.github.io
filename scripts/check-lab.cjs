// Optional browser QA; the static site itself has no Node dependencies.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const out = process.env.LAB_QA_OUTPUT || path.join(require('node:os').tmpdir(), 'lab-qa');
const baseURL = process.env.LAB_BASE_URL || 'http://127.0.0.1:8001';
fs.mkdirSync(out, {recursive:true});
let browser;
(async()=> {
browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined});
const ctx = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1.5,colorScheme:'light'});
const page = await ctx.newPage(); const errors = [], requests = [];
page.on('pageerror', e=>errors.push(e.message)); page.on('request', r=>requests.push(r.url()));
await page.goto(baseURL+'/lab'); assert(page.url().endsWith('/lab/'));
await page.waitForSelector('.scene-ready'); await page.waitForTimeout(1800);
const state = ()=>page.locator('.wave-stage').evaluate(e=>({...e.dataset}));
console.log('desktop', await state());
// Stronger lean is restricted to the hero and settles back after leaving it.
await page.mouse.move(30,450); await page.waitForTimeout(800);
assert(Number((await state()).tilt)<-.7, 'leftward lean');
await page.mouse.move(1410,750); await page.waitForTimeout(900);
assert(Number((await state()).tilt)>.7, 'rightward lean');
await page.mouse.move(720,975); await page.waitForTimeout(800);
assert(Number((await state()).lift)>.7, 'vertical depth response');
await page.locator('.featured-file').hover({position:{x:400,y:35}}); await page.waitForTimeout(200);
assert.equal(await page.locator('.featured-file').evaluate(e=>e.classList.contains('surface-active')),true);
assert.notEqual(await page.locator('.featured-file').evaluate(e=>getComputedStyle(e).transform),'none');
await page.mouse.move(720,40); await page.waitForTimeout(1100);
assert(Math.abs(Number((await state()).tilt))<.04, 'lean returns to neutral');
assert.equal(await page.locator('.featured-file').evaluate(e=>e.classList.contains('surface-active')),false);
console.log('pointer lean, depth, card response and release: passed');
await page.locator('.motion-toggle').click();
const phase = (await state()).phase, pausedTilt = (await state()).tilt;
await page.mouse.move(1410,450); await page.waitForTimeout(250);
assert.equal((await state()).phase, phase); assert.equal((await state()).tilt, pausedTilt);
await page.locator('.theme-toggle').click(); await page.waitForTimeout(1100); assert.equal((await state()).phase, phase);
assert.equal(await page.locator('.theme-toggle').getAttribute('aria-pressed'),'true');
await page.screenshot({path:out+'/lab-acrylic-dark.png'});
await page.locator('.theme-toggle').click(); await page.waitForTimeout(1100); assert.equal((await state()).phase, phase);
await page.screenshot({path:out+'/lab-acrylic-light.png'});
const posters = await page.evaluate(async()=>{
 const {createAcrylicPainter} = await import('/lab/wave-scene.js');
 const c = document.createElement('canvas'), p = createAcrylicPainter(c); p.resize(1600,1000,1);
 p.paint(0,0); const light = c.toDataURL('image/webp',.9);
 p.paint(0,1); const dark = c.toDataURL('image/webp',.9);
 // Inspect a one-minute sample without waiting a minute; independent layers must evolve.
 const samples=[];
 for (const t of [0,15,30,35,45,60]) {p.paint(t,0); samples.push({time:t, data:c.toDataURL('image/webp',.9)});}
 p.paint(35,1); samples.push({time:'35-dark', data:c.toDataURL('image/webp',.9)});
 p.dispose(); return {light,dark,samples};
});
if (process.argv.includes('--update-posters')) for(const theme of ['light','dark']) fs.writeFileSync(repo+`/lab/assets/wave-poster-${theme}.webp`,Buffer.from(posters[theme].split(',')[1],'base64'));
posters.samples.forEach(({time,data})=>fs.writeFileSync(out+`/lab-wave-phase-${time}.webp`,Buffer.from(data.split(',')[1],'base64')));
assert.equal(new Set(posters.samples.map(s=>s.data)).size,7);
console.log('pause/theme fixed phase',phase, process.argv.includes('--update-posters') ? 'posters exported' : 'poster generation checked');
await page.setViewportSize({width:1024,height:900}); await page.waitForTimeout(200); assert.equal((await state()).phase,phase);
for (const width of [1440,1024,760,700,390,375,320]) {
 await page.setViewportSize({width,height:900}); await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,`overflow ${width}`);
}
await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(500);
await page.screenshot({path:out+'/lab-acrylic-mobile-light.png'});
await page.locator('.theme-toggle').click(); await page.waitForTimeout(1100);
await page.screenshot({path:out+'/lab-acrylic-mobile-dark.png'});
await page.locator('.motion-toggle').click(); await page.waitForTimeout(1500);
console.log('mobile',await state());
assert.notEqual((await state()).phase,phase);
await page.locator('#about').scrollIntoViewIfNeeded(); await page.waitForTimeout(500); assert.equal((await state()).state,'idle');
const idlePhase=(await state()).phase; await page.waitForTimeout(200); assert.equal((await state()).phase,idlePhase);
for (const item of await page.locator('[data-arrival]').all()) {await item.scrollIntoViewIfNeeded();}
await page.waitForTimeout(600); assert.equal(await page.locator('.arrival-pending:not(.arrival-visible)').count(),0);
await page.screenshot({path:out+'/lab-acrylic-mobile-full.png',fullPage:true});
await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'})); await page.waitForTimeout(200);
await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(200);
assert.equal(await page.locator('.motion-controls').isVisible(),false); assert.equal(await page.locator('.scene-ready').count(),0);
await page.locator('.featured-file').hover(); await page.waitForTimeout(50);
assert.equal(await page.locator('.featured-file').evaluate(e=>e.classList.contains('surface-active')),false);
await page.screenshot({path:out+'/lab-acrylic-reduced.png'});
await page.emulateMedia({reducedMotion:'no-preference'}); await page.waitForSelector('.scene-ready');
// Native 2D context-loss event follows the same fallback path as a browser context loss.
await page.locator('.wave-canvas').evaluate(c=>c.dispatchEvent(new Event('contextlost')));
assert.equal(await page.locator('.scene-ready').count(),0); assert.equal(await page.locator('.motion-controls').isVisible(),false);
console.log('responsive, pause, resume, idle, reduced-motion, context loss: passed');
assert.equal(requests.some(u=>u.includes('/vendor/')),false);
assert.deepEqual(errors,[]); console.log('page errors', errors, 'no Three.js requests');
const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
const staticPage=await noJS.newPage(); await staticPage.goto(baseURL+'/lab/');
assert.equal(await staticPage.locator('h1').isVisible(),true); assert.equal(await staticPage.locator('.arrival-pending').count(),0);
assert((await staticPage.locator('.wave-poster').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('wave-poster-light'));
console.log('no JS: static content and poster passed');
const denied=await browser.newContext({viewport:{width:390,height:844}});
await denied.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null; Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})});
const fail=await denied.newPage();await fail.goto(baseURL+'/lab/');await fail.waitForTimeout(1400);
assert.equal(await fail.locator('.scene-ready').count(),0);assert.equal(await fail.locator('h1').isVisible(),true);
await fail.locator('.theme-toggle').click();assert.equal(await fail.locator('.theme-toggle').getAttribute('aria-pressed'),'true');
console.log('no Canvas / no storage: passed');
await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
