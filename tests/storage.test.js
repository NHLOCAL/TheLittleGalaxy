import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, saveState, SAVE_KEY } from '../code/storage.js';
import { createState } from '../code/state.js';
test('corrupt and inaccessible storage fall back to playable defaults',()=>{
 for(const store of [null,{getItem:()=>'{broken'}, {getItem(){throw Error('blocked')}}]) {
  const saved=loadSave(store); assert.deepEqual(saved.completed,[]);assert.equal(saved.settings.muted,true);
 }
});
test('invalid saved ids and settings are filtered',()=>{
 const saved=loadSave({getItem:()=>JSON.stringify({completed:['home','bogus','snake','home'],settings:{quality:'ultra',muted:'false'},mode:'free'})});
 assert.deepEqual(saved.completed,['home']);assert.equal(saved.settings.quality,'high');assert.equal(saved.settings.muted,true);assert.equal(saved.mode,'free');
});
test('progress round-trips and storage write failures do not interrupt play',()=>{
 let value;const storage={getItem:()=>value,setItem:(k,v)=>{assert.equal(k,SAVE_KEY);value=v}};
 const s=createState();s.completed.add('fox');s.settings.muted=false;assert.equal(saveState(storage,s),true);
 assert.deepEqual(loadSave(storage).completed,['fox']);assert.equal(loadSave(storage).settings.muted,false);
 assert.equal(saveState({setItem(){throw Error('quota')}},s),false);
});
