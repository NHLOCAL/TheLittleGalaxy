// Run with GALAXY_CHROMIUM and GALAXY_PLAYWRIGHT_MODULE when these are not on the standard paths.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.GALAXY_PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({headless:true,...(process.env.GALAXY_CHROMIUM?{executablePath:process.env.GALAXY_CHROMIUM}:process.platform==='win32'?{channel:'chrome'}:{}),args:['--no-sandbox']});
const base=process.env.GALAXY_TEST_URL||'http://127.0.0.1:8000/';
const errors=[],checks=[];
function watchErrors(page){page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});}
async function pose(page) {
 return page.evaluate(()=>{
  const {state,world}=qaGame,prince=world.scene.getObjectByName('little-prince');
  const shoulder=prince?.getObjectByName('left-shoulder'),knee=prince?.getObjectByName('left-knee'),head=prince?.getObjectByName('prince-head'),scarf=prince?.getObjectByName('scarf-tail');
  if(!shoulder||!knee||!head||!scarf)return null;
  const headOffset=head.getWorldPosition(prince.position.clone()).sub(prince.getWorldPosition(prince.position.clone())),velocity=state.motion;
  return {shoulderZ:shoulder.rotation.z,kneeX:knee.rotation.x,flight:velocity.flight,headLead:(headOffset.x*velocity.x+headOffset.z*velocity.z)/(Math.hypot(velocity.x,velocity.z)||1),scarf:Array.from(scarf.geometry.attributes.position.array),scarfIndices:scarf.geometry.index?.count,frames:world.frames};
 });
}
function assertGlide(sample,label) {
 assert.ok(sample,`${label}: the rendered prince must contain articulated limbs and a scarf`);
 assert.ok(sample.flight>.9,`${label}: sustained arrows must blend into full flight`);
 assert.ok(Math.abs(sample.shoulderZ)>1,`${label}: arms must spread to glide`);
 assert.ok(sample.kneeX>.6,`${label}: knees must bend instead of walking`);
 assert.ok(sample.headLead>.1,`${label}: the head must lead along the actual world movement`);
 assert.ok(sample.scarfIndices>150&&sample.scarf.every(Number.isFinite),`${label}: scarf must remain a finite connected ribbon`);
}
function scarfChange(a,b){return Math.max(...a.scarf.map((value,index)=>Math.abs(value-b.scarf[index])));}
async function assertMobileHeadVisible(page,label) {
 const bounds=await page.evaluate(async()=>{
  const THREE=await import('./assets/vendor/three.module.js');
  const {world}=qaGame,box=new THREE.Box3().setFromObject(world.scene.getObjectByName('prince-head')),points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const p=new THREE.Vector3(x,y,z).project(world.camera);points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});
  }
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y)),width:innerWidth,height:innerHeight,mapBottom:document.querySelector('.journey-map').getBoundingClientRect().bottom};
 });
 assert.ok(bounds.left>=0&&bounds.right<=bounds.width&&bounds.top>=bounds.mapBottom&&bounds.bottom<=bounds.height,`${label}: the prince's face and hair must stay visible: ${JSON.stringify(bounds)}`);
}
try {
 for(const mode of ['story','free']) {
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});
  await context.addInitScript(()=>localStorage.setItem('little-galaxy-v1',JSON.stringify({settings:{quality:'low',muted:true}})));
  const page=await context.newPage();watchErrors(page);await page.goto(base);
  await page.waitForFunction(()=>!document.querySelector('#opening').hidden||!document.querySelector('#error').hidden);
  assert.equal(await page.locator('#error').isVisible(),false,errors.join('\n')||'The 3D scene failed to load');
  await page.locator(mode==='story'?'#start-story':'#start-free').click();
  if(mode==='story')await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.body.dataset.phase==='explore');
  await page.evaluate(async()=>{window.qaGame=await import('./code/game.js');});
  const snapshot=()=>page.evaluate(()=>{const {state,world}=qaGame;return {phase:state.phase,position:{...state.position},motion:{...state.motion},targetId:state.targetId,completed:[...state.completed],right:{x:world.camera.matrixWorld.elements[0],z:world.camera.matrixWorld.elements[2]}};});
  async function home(){await page.locator('[data-planet="home"]').click();await page.waitForFunction(()=>qaGame.state.phase==='explore'&&qaGame.state.targetId==='home');const landed=await snapshot();assert.equal(landed.motion.speed,0);assert.equal(landed.motion.flight,0);}
  for(const [key,axis,sign] of [['ArrowRight','right',1],['ArrowLeft','right',-1],['ArrowUp','down',-1],['ArrowDown','down',1]]) {
   const before=await snapshot();await page.keyboard.down(key);
   await page.waitForFunction(p=>Math.hypot(qaGame.state.position.x-p.x,qaGame.state.position.z-p.z)>.4,before.position);
   await page.waitForFunction(()=>qaGame.state.motion.flight>.98&&qaGame.state.motion.speed>.95);await page.waitForTimeout(200);
   const rendered=await pose(page);assertGlide(rendered,`${mode} ${key}`);
   if(key==='ArrowRight'){await page.waitForFunction(frame=>qaGame.world.frames>frame+8,rendered.frames);assert.ok(scarfChange(rendered,await pose(page))>.002,`${mode}: scarf must ripple during sustained flight`);}
   const after=await snapshot();await page.keyboard.up(key);
   const dx=after.position.x-before.position.x,dz=after.position.z-before.position.z,len=Math.hypot(before.right.x,before.right.z);
   const screenRight=(dx*before.right.x+dz*before.right.z)/len,screenDown=(-dx*before.right.z+dz*before.right.x)/len;
   assert.ok(sign*(axis==='right'?screenRight:screenDown)>.3,`${mode} ${key} must follow screen direction`);
   assert.equal(after.phase,'explore',`${mode} ${key} must steer manually`);assert.ok(after.motion.flight>.4,`${mode} ${key} must animate flight`);
   await page.waitForFunction(()=>qaGame.state.motion.speed<.01);await home();
  }
  checks.push(`${mode}: all four arrows steer on screen with a real gliding pose and head leading travel`);
  checks.push(`${mode}: connected scarf visibly ripples during sustained flight`);
  // Flying away from the home globe must keep the prince above its surface rather than follow a walking descent.
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(()=>Math.hypot(qaGame.state.position.x,qaGame.state.position.z)>6);
  const departure=await snapshot();assert.ok(departure.position.y>4.8,'Manual flight keeps a clear, level altitude when leaving the globe');
  await page.waitForFunction(()=>Math.hypot(qaGame.state.position.x,qaGame.state.position.z)>8);await page.keyboard.up('ArrowRight');
  await page.waitForFunction(()=>qaGame.state.motion.speed<.01);await page.waitForTimeout(800);
  const hover=await snapshot();assert.ok(hover.motion.flight>.25&&hover.motion.flight<.45);assert.ok(hover.position.y>4.8);
  checks.push(`${mode}: level takeoff and stationary space hover`);await home();
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>qaGame.state.motion.speed>.2);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const stopped=await snapshot();await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
  const afterBlur=await snapshot();assert.equal(afterBlur.motion.speed,0);assert.equal(afterBlur.position.x,stopped.position.x);assert.equal(afterBlur.position.z,stopped.position.z);
  checks.push(`${mode}: blur cancels both keys and momentum`);
  await page.locator('#settings-button').click();await page.locator('#quality').focus();const focused=await snapshot();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
  const afterFocus=await snapshot();assert.equal(afterFocus.phase,'explore');assert.equal(afterFocus.position.x,focused.position.x);assert.equal(afterFocus.position.z,focused.position.z);await page.locator('#settings-button').click();
  checks.push(`${mode}: focused settings keep their arrow controls`);
  const beforeLetter=await snapshot();await page.keyboard.down('KeyD');await page.waitForTimeout(200);await page.keyboard.up('KeyD');const afterLetter=await snapshot();
  assert.equal(afterLetter.position.x,beforeLetter.position.x);assert.equal(afterLetter.position.z,beforeLetter.position.z);
  await page.locator('#next-planet').click();await page.waitForFunction(()=>qaGame.state.phase==='explore'&&qaGame.state.targetId==='king');
  assert.equal((await snapshot()).completed.length,0);checks.push(`${mode}: explicit planet navigation and story isolation retained`);
  await page.setViewportSize({width:390,height:844});const pad=page.locator('[data-direction="up"]');await pad.waitFor({state:'visible'});const rect=await pad.boundingBox(),beforeTouch=await snapshot();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForFunction(p=>Math.hypot(qaGame.state.position.x-p.x,qaGame.state.position.z-p.z)>.3,beforeTouch.position);await page.mouse.up();
  assert.equal((await snapshot()).phase,'explore');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push(`${mode}: touch flight and mobile layout`);
  await home();
  for(const key of ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown']){
   await page.keyboard.down(key);await page.waitForFunction(()=>qaGame.state.motion.flight>.98);await page.waitForTimeout(200);
   await assertMobileHeadVisible(page,`${mode} mobile ${key}`);await page.keyboard.up(key);await home();
  }
  checks.push(`${mode}: mobile camera keeps the prince's face and hair within the viewport in all four flight directions`);
  await context.close();
 }
 // Start a fresh high quality scene with reduced motion already enabled, using normal saved preferences.
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('little-galaxy-v1',JSON.stringify({settings:{quality:'high',muted:true,reducedMotion:true}})));
 const page=await context.newPage();watchErrors(page);await page.goto(base);
 await page.waitForFunction(()=>!document.querySelector('#opening').hidden||!document.querySelector('#error').hidden);
 assert.equal(await page.locator('#error').isVisible(),false,errors.join('\n')||'The high quality 3D scene failed to load');
 await page.locator('#start-free').click();await page.evaluate(async()=>{window.qaGame=await import('./code/game.js');});
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>qaGame.state.motion.flight>.999999&&qaGame.state.motion.speed>.999);
 const reduced=await pose(page);assertGlide(reduced,'high quality reduced motion');
 await page.waitForFunction(frame=>qaGame.world.frames>frame+8,reduced.frames);const still=await pose(page);assertGlide(still,'high quality reduced motion after eight frames');
 assert.ok(scarfChange(reduced,still)<.00002,'Reduced motion must keep the scarf ripple static while retaining the flight pose');
 await page.keyboard.up('ArrowRight');await page.waitForFunction(()=>qaGame.state.motion.speed<.01);
 await page.locator('[data-planet="home"]').click();await page.waitForFunction(()=>qaGame.state.phase==='explore'&&qaGame.state.targetId==='home');
 const reset=await page.evaluate(()=>({speed:qaGame.state.motion.speed,flight:qaGame.state.motion.flight,position:{...qaGame.state.position}}));
 assert.equal(reset.speed,0);assert.equal(reset.flight,0);assert.equal(reset.position.x,1.25);assert.equal(reset.position.z,.65);
 checks.push('fresh high quality scene: reduced motion retains flight pose, static scarf ripple and clean landing motion');await context.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks,errors}));
}finally{await browser.close();}
