import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../code/input.js';

function controls(mode='story') {
 const previousWindow=globalThis.window,previousDocument=globalThis.document;
 const events=new EventTarget();
 const buttons=['up','left','down','right'].map(direction=>Object.assign(new EventTarget(),{dataset:{direction},setPointerCapture(){}}));
 globalThis.window=events;globalThis.document={querySelectorAll:()=>buttons};
 const actions={mode:()=>mode,navigate(){this.travels++;},interact(){this.interactions++;},closeDialogue(){this.closed++;},interactions:0,closed:0,travels:0};
 const input=createInput(actions);
 function key(code,type='keydown',target=null,repeat=false){const event=new Event(type,{cancelable:true});Object.defineProperties(event,{code:{value:code},repeat:{value:repeat},...(target?{target:{value:target}}:{})});events.dispatchEvent(event);return event;}
 function dispose(){input.dispose();globalThis.window=previousWindow;globalThis.document=previousDocument;}
 return {input,events,buttons,key,actions,dispose};
}

for(const mode of ['story','free'])test(`arrows steer manually in ${mode} mode without starting automatic travel`,()=>{
 const c=controls(mode);
 try {
  for(const [code,want] of [['ArrowRight',{x:1,z:0}],['ArrowLeft',{x:-1,z:0}],['ArrowUp',{x:0,z:-1}],['ArrowDown',{x:0,z:1}]]) {
   assert.equal(c.key(code).defaultPrevented,true);assert.deepEqual(c.input.direction(),want);
   c.key(code,'keyup');assert.deepEqual(c.input.direction(),{x:0,z:0});
  }
  assert.equal(c.actions.travels,0);
 }finally{c.dispose();}
});

test('diagonal steering does not increase speed and opposing arrows cancel',()=>{
 const c=controls();
 try {
  c.key('ArrowRight');c.key('ArrowUp');assert.ok(Math.abs(Math.hypot(...Object.values(c.input.direction()))-1)<1e-12);
  c.key('ArrowLeft');c.key('ArrowDown');assert.deepEqual(c.input.direction(),{x:0,z:0});
 }finally{c.dispose();}
});

test('letter movement shortcuts no longer steer the prince while Space and E still interact',()=>{
 const c=controls();
 try {
  for(const code of ['KeyW','KeyA','KeyS','KeyD']){c.key(code);assert.deepEqual(c.input.direction(),{x:0,z:0});c.key(code,'keyup');}
  c.key('Space');c.key('Space','keydown',null,true);c.key('KeyE');assert.equal(c.actions.interactions,2);
 }finally{c.dispose();}
});

test('focused form controls retain their arrow keys and Escape closes a focused dialogue',()=>{
 const c=controls(),form={closest:()=>true};
 try {
  assert.equal(c.key('ArrowRight','keydown',form).defaultPrevented,false);assert.deepEqual(c.input.direction(),{x:0,z:0});
  c.key('Escape','keydown',form);assert.equal(c.actions.closed,1);
 }finally{c.dispose();}
});

test('blur clears held keyboard and touch directions',()=>{
 const c=controls();
 try {
  c.key('ArrowRight');const pointer=new Event('pointerdown',{cancelable:true});Object.defineProperty(pointer,'pointerId',{value:3});c.buttons[0].dispatchEvent(pointer);
  assert.notDeepEqual(c.input.direction(),{x:0,z:0});c.events.dispatchEvent(new Event('blur'));
  assert.deepEqual(c.input.direction(),{x:0,z:0});
 }finally{c.dispose();}
});
