// Deterministic scheduler checks: no browser/GPU timing or visual assertions.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../lab/wave-scene.js'), 'utf8').replaceAll('export function ', 'function ');
function scene() {
 let now = 1000, next = 0, paints = 0;
 const queued = new Map(), events = {}, stage = {dataset:{},classList:{add(){},remove(){}},getBoundingClientRect:()=>({top:0,left:0,right:1440,bottom:900,width:1440,height:900})};
 const hero = {...stage, addEventListener:(name,fn)=>events[name]=fn}; stage.closest=()=>hero;
 const document = {hidden:false,addEventListener:(name,fn)=>events[name]=fn};
 const context = vm.createContext({Math,AbortController,document,performance:{now:()=>now},devicePixelRatio:1.5,
  requestAnimationFrame:fn=>{queued.set(++next,fn);return next},cancelAnimationFrame:id=>queued.delete(id),
  matchMedia:()=>({matches:true,addEventListener(){}}),window:{addEventListener(){}},
  IntersectionObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}}});
 vm.runInContext(source,context);
 context.stubPainter={resize(){},paint(){paints++},dispose(){}};
 vm.runInContext('createAcrylicPainter=()=>stubPainter',context);
 context.stage=stage;
 const api=vm.runInContext('createWaveScene({addEventListener(){}},stage)',context);paints=0;
 function step(ms,active=false){now+=ms;if(active)events.pointermove({pointerType:'mouse',clientX:720+550*Math.sin(now/400),clientY:450+300*Math.cos(now/600)});const callbacks=[...queued.values()];queued.clear();for(const fn of callbacks)fn(now);}
 return {step,api,stage,document,events,count:()=>paints,pending:()=>queued.size};
}
for(const hz of [60,100,120])for(const active of [false,true]){
 const s=scene(),seconds=6;for(let i=0;i<hz*seconds;i++)s.step(1000/hz,active);
 const target=active?60:30;assert(Math.abs(s.count()/seconds-target)<.5,`${hz}Hz ${active?'active':'idle'}: ${s.count()/seconds}`);
 assert.equal(s.stage.dataset.quality,'full');s.api.dispose();assert.equal(s.pending(),0);
}
{
 const s=scene();for(let i=0;i<60;i++)s.step(1000/60,true);s.api.setPaused(true);const before=s.count();for(let i=0;i<120;i++)s.step(1000/60);assert.equal(s.count(),before);assert.equal(s.pending(),0);
 s.api.setPaused(false);s.step(1000/60);assert(s.count()>before);
 s.document.hidden=true;s.events.visibilitychange();const hidden=s.count();s.step(60000);assert.equal(s.count(),hidden);
 s.document.hidden=false;s.events.visibilitychange();s.step(1000/60);assert.equal(s.stage.dataset.quality,'full');assert(s.count()>hidden);s.api.dispose();
}
{
 // Cheap synchronous paint, slow delivered callbacks: detect sustained asynchronous pressure.
 const s=scene();for(let i=0;i<55;i++)s.step(100,true);assert.equal(s.stage.dataset.quality,'soft');s.api.dispose();
}
{
 const s=scene();for(let i=0;i<22;i++)s.step(250,true);assert.equal(s.stage.dataset.quality,'soft');s.api.dispose();
}
{
 const s=scene();for(let i=0;i<120;i++)s.step(1000/60,true);s.step(1000,true);
 for(let i=0;i<180;i++)s.step(1000/60,true);assert.equal(s.stage.dataset.quality,'full');s.api.dispose();
}
console.log('PASS: idle/active cadence at 60/100/120Hz; pause, visibility resume, dispose; sustained delivery-pressure downgrade.');
