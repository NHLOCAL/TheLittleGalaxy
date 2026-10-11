import { PLANETS, planetById, landingPosition } from './story.js';

export function createState(save={}) {
 return {mode:save.mode==='free'?'free':'story',phase:'opening',position:landingPosition(PLANETS[0]),targetId:'home',completed:new Set(save.completed || []),dialogue:null,travel:null,settings:{muted:true,quality:'high',reducedMotion:false,...save.settings}};
}
export function canVisit(s,id) {
 const p=planetById(id); return !!p && (id!=='snake' || s.mode==='free' || s.completed.size>=9);
}
export function setMode(s,mode) {
 if(!['story','free'].includes(mode)||['return','transit','dialogue'].includes(s.phase)) return false;
 s.mode=mode; return true;
}
export function startDialogue(s,id) {
 if(s.phase!=='explore'||!canVisit(s,id)) return false;
 s.dialogue={planetId:id,lineIndex:0};s.phase='dialogue';return true;
}
export function advanceDialogue(s) {
 if(s.phase!=='dialogue'||!s.dialogue) return false;
 const p=planetById(s.dialogue.planetId);
 s.dialogue.lineIndex++;
 if(s.dialogue.lineIndex>=p.lines.length) {
  if(s.mode==='story' && p.id!=='snake') s.completed.add(p.id);
  s.dialogue=null;
  if(p.id==='snake') {
   s.phase='return';s.travel={kind:'return',from:{...s.position},to:landingPosition(PLANETS[0]),elapsed:0,duration:s.settings.reducedMotion?2.5:8.5};
  } else s.phase='explore';
 }
 return true;
}
export function closeDialogue(s) {
 if(s.phase!=='dialogue')return false;
 s.dialogue=null;s.phase='explore';return true;
}
export function startTravel(s,id) {
 if(s.phase!=='explore'||!canVisit(s,id))return false;
 const to=landingPosition(planetById(id));
 s.travel={kind:'transit',from:{...s.position},to,elapsed:0,duration:s.settings.reducedMotion?.8:2.7};
 s.targetId=id;s.phase='transit';return true;
}
export function sampleFlight(from,to,t,lift=8) {
 t=Math.min(1,Math.max(0,t));
 const e=t*t*(3-2*t);
 // A squared sine keeps takeoff and landing derivatives soft as well as exact.
 const arc=Math.sin(Math.PI*t)**2*lift;
 return {x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e+arc,z:from.z+(to.z-from.z)*e};
}
export function stepState(s,dt) {
 if(!s.travel || !Number.isFinite(dt)||dt<=0)return;
 const tr=s.travel;tr.elapsed=Math.min(tr.duration,tr.elapsed+Math.min(dt,.05));
 let t=tr.elapsed/tr.duration;
 if(tr.kind==='return') {
  const bite=s.settings.reducedMotion?.2:.75;
  t=Math.max(0,(tr.elapsed-bite)/(tr.duration-bite));
 }
 s.position=sampleFlight(tr.from,tr.to,t,s.settings.reducedMotion?1.5:(tr.kind==='return'?12:6));
 if(tr.elapsed>=tr.duration) {
  s.position={...tr.to};s.phase=tr.kind==='return'?'ending':'explore';
  if(tr.kind==='return')s.targetId='home';
  s.travel=null;
 }
}
export function resetState(s) {
 const n=createState({mode:s.mode,settings:s.settings});n.settings=s.settings;n.phase='explore';Object.assign(s,n);
}
