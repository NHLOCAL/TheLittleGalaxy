import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacter } from '../code/characters.js';

test('the prince blends into a jointed flight pose with bent knees', () => {
 const prince=createCharacter('prince');
 const knee=prince.root.getObjectByName('left-knee');
 const shoulder=prince.root.getObjectByName('left-shoulder');
 assert.ok(knee && shoulder,'Flight needs articulated knees and shoulders');
 prince.animate({elapsed:0,flight:0});
 const resting=knee.rotation.x;
 prince.animate({elapsed:0,flight:.5});
 const halfway=knee.rotation.x;
 prince.animate({elapsed:0,flight:1});
 assert.ok(halfway>resting && halfway<knee.rotation.x,'The pose should blend, not snap');
 assert.ok(Math.abs(shoulder.rotation.z)>1,'Arms spread to glide');
 assert.ok(knee.rotation.x>.6,'The trailing legs bend rather than walk');
});

test('the scarf is a continuous animated cloth surface with finite geometry', () => {
 const prince=createCharacter('prince');
 const scarf=prince.root.getObjectByName('scarf-tail');
 assert.ok(scarf?.geometry.index,'The scarf must be one connected ribbon');
 prince.animate({elapsed:0,flight:1});
 const before=Array.from(scarf.geometry.attributes.position.array);
 prince.animate({elapsed:1,flight:1});
 const after=Array.from(scarf.geometry.attributes.position.array);
 assert.notDeepEqual(after,before,'The cloth follows the air in flight');
 assert.ok(after.every(Number.isFinite));
 prince.animate({elapsed:0,flight:.5});
 const reduced=Array.from(scarf.geometry.attributes.position.array);
 prince.animate({elapsed:0,flight:.5});
 assert.deepEqual(Array.from(scarf.geometry.attributes.position.array),reduced,'Reduced motion is stable');
});

test('every character has finite renderable geometry throughout its animation', () => {
 for(const type of ['prince','rose','sheep','fox','king','conceited','drunkard','businessman','lamplighter','geographer','pilot','snake']){
  const character=createCharacter(type);let vertices=0;
  for(const elapsed of [0,.3,3])character.animate({elapsed,speed:1,flight:.65,bite:.5});
  character.root.traverse(object=>{
   if(!object.isMesh)return;
   const positions=object.geometry.attributes.position;
   assert.ok(Array.from(positions.array).every(Number.isFinite),type+' geometry');
   assert.ok([object.position.x,object.position.y,object.position.z,...object.rotation.toArray().slice(0,3)].every(Number.isFinite),type+' transform');
   vertices+=positions.count;
  });
  assert.ok(vertices>100,type+' should render a complete model');
 }
});
