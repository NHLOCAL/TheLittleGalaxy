import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlightMotion } from '../code/motion.js';

function motionController(){return createFlightMotion();}
function simulate(controller,seconds,fps,direction,right={x:1,z:0}) {
 const position={x:0,z:0};
 for(let i=0;i<Math.round(seconds*fps);i++) {const d=controller.step(direction,1/fps,right);position.x+=d.x;position.z+=d.z;}
 return position;
}

test('manual flight accelerates gently then cruises with a bounded speed',async()=>{
 const c=await motionController(),first=c.step({x:1,z:0},1/60,{x:1,z:0});
 assert.ok(first.x>0&&first.x<.015);assert.ok(c.motion.speed>0&&c.motion.speed<.2);
 simulate(c,2,60,{x:1,z:0});assert.ok(c.motion.speed>.99&&c.motion.speed<=1);
});
test('flight displacement is independent of frame rate during acceleration and braking',async()=>{
 const slow=await motionController(),fast=await motionController();
 const a=simulate(slow,1,30,{x:1,z:0}),b=simulate(fast,1,120,{x:1,z:0});
 assert.ok(Math.abs(a.x-b.x)<.002);assert.ok(Math.abs(slow.motion.x-fast.motion.x)<.002);
 const coastA=simulate(slow,.3,30,{x:0,z:0}),coastB=simulate(fast,.3,120,{x:0,z:0});
 assert.ok(coastA.x>0&&coastA.x<.7);assert.ok(Math.abs(coastA.x-coastB.x)<.002);
});
test('arrows follow the camera screen directions and diagonals share the same maximum speed',async()=>{
 const right={x:17/Math.hypot(17,10),z:-10/Math.hypot(17,10)};
 const horizontal=await motionController(),vertical=await motionController(),diagonal=await motionController();
 const a=simulate(horizontal,2,60,{x:1,z:0},right),b=simulate(vertical,2,60,{x:0,z:-1},right);
 simulate(diagonal,2,60,{x:Math.SQRT1_2,z:-Math.SQRT1_2},right);
 assert.ok(a.x>0&&a.z<0);assert.ok(b.x<0&&b.z<0);
 assert.ok(Math.abs(horizontal.motion.speed-diagonal.motion.speed)<.001);
});
test('reset stops all drift immediately and a long pause does not advance manual motion',async()=>{
 const c=await motionController();simulate(c,1,60,{x:1,z:0});c.reset();
 assert.deepEqual(c.step({x:0,z:0},1/60),{x:0,z:0});assert.equal(c.motion.speed,0);
 simulate(c,1,60,{x:1,z:0});assert.deepEqual(c.step({x:1,z:0},10),{x:0,z:0});assert.equal(c.motion.speed,0);
});
test('manual flight blends into a hovering pose in open space and settles on a surface',async()=>{
 const c=await motionController();simulate(c,1,60,{x:1,z:0});assert.ok(c.motion.flight>.95);
 const before=c.motion.flight;c.step({x:0,z:0},1/60,{x:1,z:0},true);assert.ok(c.motion.flight>=before-.1);
 for(let i=0;i<180;i++)c.step({x:0,z:0},1/60,{x:1,z:0},true);
 assert.ok(c.motion.flight>.25&&c.motion.flight<.45);
 for(let i=0;i<180;i++)c.step({x:0,z:0},1/60,{x:1,z:0},false);
 assert.ok(c.motion.flight<.005);
});
