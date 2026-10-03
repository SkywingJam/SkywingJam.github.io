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
 await page.setViewportSize({width:1440,height:1000});await page.locator('.motion-toggle').click();await study.scrollIntoViewIfNeeded();
 assert.equal(await study.locator('[data-study-art=prism] .study-object').evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
 await page.emulateMedia({reducedMotion:'reduce'});await study.locator('[data-study-choice=lens]').click();
 assert.equal(await study.locator('[data-study-art=lens] .study-object').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.motion-toggle').click();await study.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
 assert.equal(await study.locator('[data-study-art=lens] .study-object').evaluate(e=>getComputedStyle(e).animationPlayState),'running');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);assert.equal(await study.getAttribute('data-observing'),'false');
 const staticPage=await browser.newPage({javaScriptEnabled:false});await staticPage.goto(baseURL+'/lab/');assert.equal(await staticPage.locator('[data-study-art=lens]').isVisible(),true);assert.equal(await staticPage.locator('[data-study-choices]').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('choices, keyboard, slider/reset, multi-instance IDs, themes, responsive, pause/reduced motion, offscreen, mouse/touch dragging, vertical touch scrolling and no JS: passed');
 await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
