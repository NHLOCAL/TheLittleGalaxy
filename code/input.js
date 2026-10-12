export function createInput(actions) {
 const keys=new Set(),touch=new Map();
 const editable=e=>e.target?.closest?.('button,input,select,textarea,[contenteditable=true]');
 function down(e) {
  if(e.code==='Escape'){actions.closeDialogue();return;}
  if(editable(e))return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
  if(e.code==='Space'||e.code==='KeyE'){if(!e.repeat)actions.interact();return;}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))keys.add(e.code);
 }
 const up=e=>keys.delete(e.code);
 function clear(){keys.clear();touch.clear();}
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
 const listeners=[];
 for(const button of document.querySelectorAll('#touch-pad button')) {
  const press=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touch.set(e.pointerId,button.dataset.direction);};
  const release=e=>touch.delete(e.pointerId);
  button.addEventListener('pointerdown',press);button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  listeners.push(()=>{button.removeEventListener('pointerdown',press);for(const event of ['pointerup','pointercancel','lostpointercapture'])button.removeEventListener(event,release);});
 }
 function direction() {
  const touched=new Set(touch.values());
  let x=Number(keys.has('ArrowRight')||touched.has('right'))-Number(keys.has('ArrowLeft')||touched.has('left'));
  let z=Number(keys.has('ArrowDown')||touched.has('down'))-Number(keys.has('ArrowUp')||touched.has('up'));
  const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}return {x,z};
 }
 return {direction,clear,dispose(){window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);listeners.forEach(f=>f());}};
}
