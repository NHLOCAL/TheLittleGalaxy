import { PLANETS } from './story.js';
export const SAVE_KEY='little-galaxy-v1';
const defaults=()=>({completed:[],mode:'story',settings:{muted:true,quality:'high',reducedMotion:false}});
export function loadSave(storage) {
 const d=defaults();
 try {
  const v=JSON.parse(storage?.getItem(SAVE_KEY) || 'null');
  if(!v||typeof v!=='object')return d;
  d.completed=[...new Set(Array.isArray(v.completed)?v.completed.filter(id=>id!=='snake'&&PLANETS.some(p=>p.id===id)):[])];
  d.mode=v.mode==='free'?'free':'story';
  if(typeof v.settings?.muted==='boolean')d.settings.muted=v.settings.muted;
  if(['high','low'].includes(v.settings?.quality))d.settings.quality=v.settings.quality;
  if(typeof v.settings?.reducedMotion==='boolean')d.settings.reducedMotion=v.settings.reducedMotion;
 } catch { /* Private browsing, corrupt saves and quota failures must not block play. */ }
 return d;
}
export function saveState(storage,s) {
 try { storage.setItem(SAVE_KEY,JSON.stringify({mode:s.mode,completed:[...s.completed],settings:s.settings}));return true; }
 catch {return false;}
}
