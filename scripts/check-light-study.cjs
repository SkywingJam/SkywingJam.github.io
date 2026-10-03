// Optional browser QA for the reusable optical study. No production dependencies.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const out=process.env.LAB_QA_OUTPUT || path.join(require('node:os').tmpdir(),'lab-qa');
require('node:fs').mkdirSync(out,{recursive:true});
const baseURL=process.env.LAB_BASE_URL || 'http://127.0.0.1:8001';
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined});
 const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL+'/lab/');const study=page.locator('[data-light-study]');await page.waitForSelector('.study-enhanced');await study.scrollIntoViewIfNeeded();await page.waitForTimeout(400);
 assert.equal(await study.getAttribute('data-observing'),'true');
 for(const name of ['lens','layers','prism']){
  await study.locator(`[data-study-choice=${name}]`).click();await page.waitForTimeout(550);
  assert.equal(await study.getAttribute('data-specimen'),name);
  assert.equal(await study.locator(`[data-study-art=${name}]`).isVisible(),true);
  await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);await page.waitForTimeout(250);await study.screenshot({path:out+`/light-study-${name}-light.png`});
 }
 await study.locator('[data-study-choice=prism]').press('Home');assert.equal(await study.getAttribute('data-specimen'),'lens');
 await study.locator('[data-study-choice=lens]').press('ArrowDown');assert.equal(await study.getAttribute('data-specimen'),'layers');
 await study.locator('[data-study-light]').focus();await page.keyboard.press('End');
 assert.equal(await study.locator('[data-study-light]').inputValue(),'45');
 assert.equal(await study.locator('[data-study-angle]').textContent(),'+45°');
 await study.locator('[data-study-reset]').click();assert.equal(await study.locator('[data-study-light]').inputValue(),'-15');
 assert.equal(await study.locator('[data-study-reset]').isDisabled(),true);

 const box=await study.locator('.study-scene').boundingBox();
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5,{steps:8});
 assert.equal(await study.locator('[data-study-light]').inputValue(),'15');
 assert.equal(await study.locator('[data-study-angle]').textContent(),'+15°');
 await page.mouse.up();assert.equal(await study.evaluate(e=>e.classList.contains('study-dragging')),false);
 await study.locator('[data-study-reset]').click();
 // Real touch events verify implicit capture doesn't steal vertical scrolling.
 const touchPage=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await touchPage.goto(baseURL+'/lab/');await touchPage.locator('.study-scene').scrollIntoViewIfNeeded();
 const touchBox=await touchPage.locator('.study-scene').boundingBox();
 const cdp=await touchPage.context().newCDPSession(touchPage);
 const x=touchBox.x+touchBox.width*.5,y=touchBox.y+touchBox.height*.5;
 const swipe=async(dx,dy)=>{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});await touchPage.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 };
 const beforeScroll=await touchPage.evaluate(()=>scrollY);await swipe(2,-100);
 assert.equal(await touchPage.locator('[data-study-light]').inputValue(),'-15');
 assert(await touchPage.evaluate(()=>scrollY)>beforeScroll,'vertical touch scroll');
 await touchPage.locator('.study-scene').scrollIntoViewIfNeeded();
 // Restore the original stage position after scrolling so swipe coordinates match.
 await touchPage.evaluate(v=>scrollTo(0,v),beforeScroll);await touchPage.waitForTimeout(200);
 await swipe(65,0);assert(Number(await touchPage.locator('[data-study-light]').inputValue())>-15,'horizontal touch light');
 assert.equal(await touchPage.locator('[data-light-study]').evaluate(e=>e.classList.contains('study-dragging')),false);
 await touchPage.close();
 await page.locator('.theme-toggle').click();await study.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 for(const name of ['lens','layers','prism']){await study.locator(`[data-study-choice=${name}]`).click();await page.waitForTimeout(500);await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);await page.waitForTimeout(250);await study.screenshot({path:out+`/light-study-${name}-dark.png`});}
 for(const width of [1440,1024,760,700,390,375,320]){await page.setViewportSize({width,height:900});await study.scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);}
 await page.setViewportSize({width:390,height:844});await study.scrollIntoViewIfNeeded();await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);await page.waitForTimeout(250);await study.screenshot({path:out+'/light-study-mobile-dark.png'});
 await page.locator('.theme-toggle').click();await study.scrollIntoViewIfNeeded();await page.waitForTimeout(400);await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);await page.waitForTimeout(250);await study.screenshot({path:out+'/light-study-mobile-light.png'});
 // Reuse a second instance, with fresh accessible identities and independent state.
 const reuse=await page.evaluate(async()=>{const original=document.querySelector('[data-light-study]');const clone=original.cloneNode(true);clone.removeAttribute('id');document.querySelector('main').append(clone);const {createLightStudy}=await import('/lab/light-study.js');const api=createLightStudy(clone);const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);const originalState=original.dataset.specimen;clone.querySelector('[data-study-choice=lens]').click();const independent=original.dataset.specimen===originalState;api.dispose();clone.remove();return {duplicates,independent};});
 assert.deepEqual(reuse.duplicates,[]);assert.equal(reuse.independent,true);
 // Reuse contract: layout follows the block's own width, copy comes from HTML, range comes from the input.
 await page.setViewportSize({width:1440,height:1000});
 const contract=await page.evaluate(async()=>{
  const {createLightStudy}=await import('/lab/light-study.js');
  const original=document.querySelector('[data-light-study]');
  const host=document.createElement('div');host.style.width='480px';document.querySelector('main').append(host);
  const clone=original.cloneNode(true);clone.removeAttribute('id');
  clone.classList.remove('wrap');clone.setAttribute('data-study-theme','dark');clone.setAttribute('data-study-motion','paused');
  clone.querySelector('[data-study-hint]').dataset.studyHintActive='CUSTOM HINT';
  clone.querySelector('[data-study-angle]').dataset.format='{value} deg';
  const range=clone.querySelector('[data-study-light]');range.min='-10';range.max='30';range.value='10';range.defaultValue='10';
  host.append(clone);const api=createLightStudy(clone);
  const layout=getComputedStyle(clone.querySelector('.study-layout')).display;
  const scene=clone.querySelector('.study-scene').getBoundingClientRect();
  const plates=[...clone.querySelectorAll('.optic-plate')];clone.querySelector('[data-study-choice=layers]').click();
  const sceneBox=clone.querySelector('.study-scene').getBoundingClientRect();
  const platesInside=plates.every(p=>{const r=p.getBoundingClientRect();return r.left>=sceneBox.left-1&&r.right<=sceneBox.right+1});
  const result={layout,sceneWidth:Math.round(scene.width),overflow:clone.scrollWidth>clone.clientWidth,platesInside,
   hint:clone.querySelector('[data-study-hint]').textContent,angle:clone.querySelector('[data-study-angle]').textContent,
   progress:clone.style.getPropertyValue('--study-progress'),still:clone.dataset.still,
   ink:getComputedStyle(clone).getPropertyValue('--study-ink').trim(),
   titleBreaks:original.querySelectorAll('[data-study-title] br, .study-intro br').length};
  api.dispose();host.remove();return result;});
 assert.equal(contract.layout,'flex','narrow block stacks');assert.equal(contract.sceneWidth,480);
 assert.equal(contract.overflow,false);assert.equal(contract.platesInside,true,'plates scale with scene');
 assert.equal(contract.hint,'CUSTOM HINT');assert.equal(contract.angle,'10 deg');assert.equal(contract.progress,'50%');
 assert.equal(contract.still,'true');assert.equal(contract.ink,'#e1eaf4');assert.equal(contract.titleBreaks,0);
 await page.setViewportSize({width:1440,height:1000});await page.locator('.motion-toggle').click();await study.scrollIntoViewIfNeeded();
 assert.equal(await study.locator('[data-study-art=prism] .study-object').evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
 await page.emulateMedia({reducedMotion:'reduce'});await study.locator('[data-study-choice=lens]').click();
 assert.equal(await study.locator('[data-study-art=lens] .study-object').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.motion-toggle').click();await study.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
 assert.equal(await study.locator('[data-study-art=lens] .study-object').evaluate(e=>getComputedStyle(e).animationPlayState),'running');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);assert.equal(await study.getAttribute('data-observing'),'false');
 const staticPage=await browser.newPage({javaScriptEnabled:false});await staticPage.goto(baseURL+'/lab/');assert.equal(await staticPage.locator('[data-study-art=lens]').isVisible(),true);assert.equal(await staticPage.locator('[data-study-choices]').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('reuse contract (container layout, HTML copy, input range, forced theme, per-block pause), choices, keyboard, slider/reset, multi-instance IDs, themes, responsive, pause/reduced motion, offscreen, mouse/touch dragging, vertical touch scrolling and no JS: passed');
 await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
