import { PLANETS, planetById, landingPosition } from './story.js';
import { createState, canVisit, setMode, startDialogue, advanceDialogue, closeDialogue, startTravel, stepState, resetState } from './state.js';
import { loadSave, saveState } from './storage.js';
import { createScene } from './scene.js';
import { createUI } from './ui.js';
import { createInput } from './input.js';
import { createFlightMotion } from './motion.js';
import { createAudio } from './audio.js';

let storage;try{storage=localStorage;}catch{storage=null;}
export const state=createState(loadSave(storage));
state.settings.reducedMotion ||= matchMedia('(prefers-reduced-motion: reduce)').matches;
export let world;
let ui,input,raf=0,lastTime=0,disposed=false;
const flightMotion=createFlightMotion();state.motion=flightMotion.motion;
const audio=createAudio();audio.setMuted(state.settings.muted);
function persist(){saveState(storage,state);}
function clearMovement(){input?.clear();flightMotion.reset();}
function finishAction(){clearMovement();persist();ui?.update();}
function nearbyPlanet() {
 let result=null,dist=Infinity;
 for(const p of PLANETS) {const d=Math.hypot(state.position.x-p.position.x,state.position.z-p.position.z);if(d<p.radius+2.4&&d<dist){result=p;dist=d;}}
 return result;
}
const actions={
 start(mode){audio.unlock();setMode(state,mode);state.phase='explore';if(mode==='story'&&!state.completed.has('home'))startDialogue(state,'home');finishAction();},
 setMode(mode){if(setMode(state,mode))finishAction();},
 travel(id){
  if(!canVisit(state,id)){ui.toast('לפני הדרך הביתה, נפגשים עם הדמויות בשאר הכוכבים.');return;}
  if(startTravel(state,id)){audio.play('travel');finishAction();ui.announce('בדרך אל '+planetById(id).name);}
 },
 navigate(offset){if(state.phase!=='explore')return;let index=PLANETS.findIndex(p=>p.id===state.targetId);for(let i=0;i<PLANETS.length;i++){index=(index+offset+PLANETS.length)%PLANETS.length;if(canVisit(state,PLANETS[index].id)){actions.travel(PLANETS[index].id);return;}}},
 interact(){
  audio.unlock();
  if(state.phase==='dialogue'){actions.nextLine();return;}
  if(state.phase!=='explore')return;
  const p=nearbyPlanet();if(!p){ui.toast('התקרבו לכוכב או בחרו אותו במפה.');return;}
  if(!canVisit(state,p.id)){ui.toast('עוד מפגשים מחכים לך לפני הדרך הביתה.');return;}
  if(startDialogue(state,p.id)){state.targetId=p.id;audio.play('dialogue');finishAction();}
 },
 nextLine(){if(advanceDialogue(state)){audio.play(state.phase==='return'?'ending':'dialogue');finishAction();}},
 closeDialogue(){if(closeDialogue(state)){finishAction();}},
 restart(){resetState(state);if(state.mode==='story')startDialogue(state,'home');finishAction();},
 continueFree(){state.phase='explore';setMode(state,'free');finishAction();},
 resetProgress(){state.completed.clear();persist();ui.update();},
 setMuted(value){state.settings.muted=value;audio.unlock();audio.setMuted(value);if(!value)audio.play('arrival');persist();ui.update();},
 setQuality(value){state.settings.quality=value;world?.setQuality(value);persist();ui.update();},
 setReduced(value){state.settings.reducedMotion=value;persist();ui.update();},
 mode:()=>state.mode
};
ui=createUI(state,actions);input=createInput(actions);
try {
 world=createScene(document.getElementById('world'),PLANETS,state.settings);
 const resize=()=>world.resize(innerWidth,innerHeight);window.addEventListener('resize',resize);
 document.getElementById('world').addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);ui.showError('החיבור הגרפי הופסק. אפשר לנסות שוב או לבחור איכות קלה יותר למכשיר.');});
 ui.update();
 function frame(now) {
  if(disposed)return;
  const elapsed=lastTime?Math.max(0,(now-lastTime)/1000):0;lastTime=now;
  const paused=document.hidden||elapsed>1;
  const dt=paused?0:Math.min(.1,elapsed);
  if(paused)clearMovement();
  const before=state.phase;
  if(state.phase==='explore') {
   const direction=input.direction();
   const basis=world.camera.matrixWorld.elements;
   const previousPlanet=nearbyPlanet();
   const hovering=!previousPlanet||Math.hypot(state.position.x-previousPlanet.position.x,state.position.z-previousPlanet.position.z)>=previousPlanet.radius;
   const movement=flightMotion.step(direction,dt,{x:basis[0],z:basis[2]},hovering);
   state.position.x=Math.max(-62,Math.min(62,state.position.x+movement.x));state.position.z=Math.max(-58,Math.min(58,state.position.z+movement.z));
   const p=nearbyPlanet();
   let desired=5,response=2;
   if(p){state.targetId=p.id;const dx=state.position.x-p.position.x,dz=state.position.z-p.position.z;
    if(Math.hypot(dx,dz)<p.radius){const surface=Math.sqrt(p.radius*p.radius-dx*dx-dz*dz)+.06;
     desired=surface+(Math.max(5,p.radius+.9)-surface)*state.motion.flight;response=12;
    }
   }
   state.position.y+=(desired-state.position.y)*(1-Math.exp(-dt*response));
  }
  // Advance the travel clock even when a slower device misses a frame.
  for(let remaining=dt;remaining>0;remaining-=.05)stepState(state,Math.min(.05,remaining));
  if(before!==state.phase){finishAction();if(state.phase==='explore')audio.play('arrival');if(state.phase==='ending')audio.play('ending');}
  world.update(state,dt);ui.update();raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 window.addEventListener('blur',()=>{clearMovement();lastTime=0;});
 document.addEventListener('visibilitychange',()=>{clearMovement();lastTime=0;});
 window.addEventListener('pagehide',event=>{
  clearMovement();lastTime=0;persist();
  // A cached document will resume with its existing scene and pending animation frame.
  if(event.persisted)return;
  disposed=true;cancelAnimationFrame(raf);input.dispose();ui.dispose();audio.dispose();world.dispose();window.removeEventListener('resize',resize);
 });
 window.addEventListener('pageshow',event=>{if(event.persisted){lastTime=0;clearMovement();world.resize(innerWidth,innerHeight);}});
}catch(error){console.error('Unable to start the 3D game:',error);ui.showError('המשחק דורש דפדפן עם תמיכה ב־WebGL. נסו דפדפן מעודכן עם האצת חומרה פעילה.');}
