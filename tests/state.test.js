import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANETS } from '../code/story.js';
import { createState, canVisit, setMode, startDialogue, advanceDialogue, startTravel, stepState, resetState, sampleFlight } from '../code/state.js';

function finish(s,id) { assert.ok(startDialogue(s,id)); while(s.phase==='dialogue') advanceDialogue(s); }
test('all ten original encounters have dialogue and unique identities',()=>{
 assert.equal(PLANETS.length,10); assert.equal(new Set(PLANETS.map(p=>p.id)).size,10);
 assert.equal(PLANETS.reduce((n,p)=>n+p.lines.length,0),48);
});
test('story completion requires the entire conversation and repeated visits count once',()=>{
 const s=createState(); s.phase='explore'; assert.ok(startDialogue(s,'home')); assert.equal(s.completed.size,0);
 while(s.phase==='dialogue') advanceDialogue(s);
 assert.equal(s.completed.size,1); finish(s,'home'); assert.equal(s.completed.size,1);
});
test('snake is locked in story until all nine other conversations finish',()=>{
 const s=createState(); s.phase='explore'; assert.equal(canVisit(s,'snake'),false); assert.equal(startDialogue(s,'snake'),false);
 for(const p of PLANETS.slice(0,9)) finish(s,p.id);
 assert.equal(canVisit(s,'snake'),true); finish(s,'snake'); assert.equal(s.phase,'return');
});
test('free exploration opens every planet without granting story progress',()=>{
 const s=createState(); s.phase='explore'; setMode(s,'free');
 for(const p of PLANETS) assert.equal(canVisit(s,p.id),true);
 finish(s,'king'); assert.equal(s.completed.size,0);
 assert.ok(startTravel(s,'snake')); for(let i=0;i<160;i++) stepState(s,.025);
 assert.equal(s.phase,'explore'); assert.equal(s.targetId,'snake'); assert.equal(s.completed.size,0);
 finish(s,'snake'); assert.equal(s.phase,'return');
});
test('switching modes preserves story progress without fabricating completion',()=>{
 const s=createState(); s.phase='explore'; finish(s,'home'); setMode(s,'free'); finish(s,'fox'); setMode(s,'story');
 assert.deepEqual([...s.completed],['home']); assert.equal(canVisit(s,'snake'),false);
});
test('transit rejects duplicates and invalid targets and ends at exact target',()=>{
 const s=createState(); s.phase='explore'; assert.equal(startTravel(s,'unknown'),false); assert.ok(startTravel(s,'king'));
 assert.equal(startTravel(s,'fox'),false); assert.equal(startDialogue(s,'king'),false);
 for(let i=0;i<200;i++) stepState(s,.025);
 assert.equal(s.phase,'explore'); assert.equal(s.targetId,'king'); assert.ok(Object.values(s.position).every(Number.isFinite));
});
test('flight samples are exact at the ends and raised and continuous in between',()=>{
 const a={x:12,y:2,z:30},b={x:-5,y:4,z:-20};
 assert.deepEqual(sampleFlight(a,b,0,12),a); assert.deepEqual(sampleFlight(a,b,1,12),b);
 assert.ok(sampleFlight(a,b,.5,12).y>12); assert.ok(Math.abs(sampleFlight(a,b,.999,12).x-b.x)<.001);
});
test('return reaches home, stays rendered as ending and can restart',()=>{
 const s=createState(); s.phase='explore'; setMode(s,'free'); finish(s,'snake');
 assert.equal(startTravel(s,'king'),false); assert.equal(startDialogue(s,'snake'),false);
 for(let i=0;i<500;i++) stepState(s,.025);
 assert.equal(s.phase,'ending'); assert.equal(s.targetId,'home'); assert.ok(Object.values(s.position).every(Number.isFinite));
 resetState(s); assert.equal(s.phase,'explore'); assert.equal(s.completed.size,0); assert.equal(canVisit(s,'snake'),true);
});
test('large or negative animation deltas never corrupt state',()=>{
 const s=createState();s.phase='explore';startTravel(s,'fox');stepState(s,-2);stepState(s,NaN);stepState(s,500);
 assert.ok(Object.values(s.position).every(Number.isFinite));assert.equal(s.phase,'transit');
});
test('restart preserves the live settings binding used by the renderer',()=>{
 const s=createState(),binding=s.settings;s.settings.reducedMotion=true;resetState(s);
 assert.equal(s.settings,binding);s.settings.reducedMotion=false;assert.equal(binding.reducedMotion,false);
});
