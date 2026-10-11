import * as THREE from '../assets/vendor/three.module.js';
import { createCharacter, createProp, material, mesh, batchShapes } from './characters.js';
import { landingPosition, planetById } from './story.js';

const UP=new THREE.Vector3(0,1,0);
const focus=new THREE.Vector3();
const targetCamera=new THREE.Vector3();
function random(seed) { return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}; }
function terrainTexture() {
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#d3c4a0';ctx.fillRect(0,0,512,256);
 const r=random(902);
 for(let i=0;i<25000;i++){
  const light=r()>.5;ctx.fillStyle=light?`rgba(255,246,218,${r()*.17})`:`rgba(72,63,45,${r()*.13})`;
  ctx.fillRect(r()*512,r()*256,.3+r()*2,.3+r()*1.4);
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;return tex;
}
function planetGeometry(radius,seed) {
 const g=new THREE.SphereGeometry(radius,64,48),p=g.attributes.position;
 const rng=random(seed),craters=Array.from({length:9},()=>new THREE.Vector3(rng()-.5,rng()-.5,rng()-.5).normalize());
 const v=new THREE.Vector3();
 for(let i=0;i<p.count;i++) {
  v.fromBufferAttribute(p,i).normalize();
  let rough=.014*Math.sin(v.x*19+seed)*Math.sin(v.y*17)*Math.sin(v.z*21)+.012*Math.sin(v.x*39+v.z*24);
  for(const c of craters){const d=1-v.dot(c);rough-=.065*Math.exp(-d*100);rough+=.016*Math.exp(-(((d-.022)/.014)**2));}
  const top=Math.max(0,Math.min(1,(.97-v.y)*8)); // Keep the characters' landing surface smooth.
  v.multiplyScalar(radius*(1+rough*top));p.setXYZ(i,v.x,v.y,v.z);
 }
 g.computeVertexNormals();return g;
}
function surfaceGroup(parent,radius,x,z) {
 const y=Math.sqrt(Math.max(0,radius*radius-x*x-z*z));
 const group=new THREE.Group();group.position.set(x,y,z);group.quaternion.setFromUnitVectors(UP,new THREE.Vector3(x,y,z).normalize());parent.add(group);return group;
}
function tree(parent,radius,x,z,scale=1) {
 const g=surfaceGroup(parent,radius,x,z);g.scale.setScalar(scale);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.06,.6,.06),new THREE.Vector3(-.12,1.2,0),new THREE.Vector3(.12,1.9,0)]);
 mesh(g,new THREE.TubeGeometry(curve,12,.09,6,false),'#79674c');
 for(let i=0;i<14;i++){
  const a=i*2.4;mesh(g,new THREE.SphereGeometry(1,12,8),i%3?'#677b4b':'#879455',[Math.cos(a)*.42,1.65+(i%4)*.13,Math.sin(a)*.39],[.44,.34,.43]);
 }
}
function flowers(parent,radius,x,z,color) {
 const g=surfaceGroup(parent,radius,x,z);
 mesh(g,new THREE.CylinderGeometry(.013,.02,.37,6),'#778956',[0,.18,0]);
 mesh(g,new THREE.SphereGeometry(.045,8,6),'#d3ae4e',[0,.4,0]);
 for(let i=0;i<5;i++) {
  const a=i/5*Math.PI*2;
  const petal=mesh(g,new THREE.SphereGeometry(1,8,6),color,[Math.cos(a)*.062,.4,Math.sin(a)*.062],[.07,.025,.04]);petal.rotation.y=-a;
 }
}
function starField() {
 const r=random(288),count=650,g=new THREE.BufferGeometry();
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++) {
  const a=r()*Math.PI*2,b=Math.acos(r()*2-1),rad=100+r()*50;
  positions.set([Math.sin(b)*Math.cos(a)*rad,Math.cos(b)*rad,Math.sin(b)*Math.sin(a)*rad],i*3);
  const c=new THREE.Color(i%6?'#bfd1f0':'#efd9a2');colors.set([c.r,c.g,c.b],i*3);
 }
 g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));
 return new THREE.Points(g,new THREE.PointsMaterial({size:.13,transparent:true,opacity:.75,vertexColors:true,sizeAttenuation:true,depthWrite:false}));
}
export function createScene(canvas,planets,settings) {
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setClearColor('#080d22',0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#131a30',.0027);
 const camera=new THREE.PerspectiveCamera(38,1,.1,300);
 const ambient=new THREE.HemisphereLight('#dbe6ff','#70543d',2.0);scene.add(ambient);
 const key=new THREE.DirectionalLight('#ffdfab',3.5);key.position.set(-10,22,15);scene.add(key);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=14;key.shadow.camera.bottom=-12;key.shadow.camera.near=.1;key.shadow.camera.far=65;key.shadow.normalBias=.025;key.shadow.bias=-.0003;
 scene.add(key.target);
 const rim=new THREE.DirectionalLight('#8bafdf',1.8);rim.position.set(12,6,-16);scene.add(rim);
 scene.add(starField());
 const texture=terrainTexture(),characters=[],planetGroups=new Map();
 for(let i=0;i<planets.length;i++) {
  const p=planets[i],g=new THREE.Group();g.position.set(p.position.x,0,p.position.z);scene.add(g);planetGroups.set(p.id,g);
  const mat=new THREE.MeshStandardMaterial({color:p.color,map:texture,bumpMap:texture,bumpScale:.17,roughness:.93});
  const ground=mesh(g,planetGeometry(p.radius,20+i),mat);ground.userData.lodBase=true;
  const rng=random(40+i),rockGeo=new THREE.DodecahedronGeometry(1,1),rockMat=material(i===0?'#a3926c':'#8c8880');
  const rocks=new THREE.InstancedMesh(rockGeo,rockMat,18),dummy=new THREE.Object3D();
  for(let j=0;j<18;j++) {
   const a=rng()*Math.PI*2,vertical=rng()*1.8-1,r=Math.sqrt(1-Math.min(.98,vertical*vertical));
   const v=new THREE.Vector3(Math.cos(a)*r,vertical,Math.sin(a)*r).normalize();
   dummy.position.copy(v.multiplyScalar(p.radius*.994));dummy.scale.setScalar(.12+rng()*.24);dummy.rotation.set(rng()*3,rng()*3,rng()*3);dummy.updateMatrix();rocks.setMatrixAt(j,dummy.matrix);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;rocks.userData.lodBase=true;g.add(rocks);
  const npc=createCharacter(p.character);
  const npcSurface=surfaceGroup(g,p.radius,-1.1,-.2);npcSurface.add(npc.root);npc.root.rotation.y=.36;
  if(p.character==='rose')npc.root.scale.setScalar(.93);
  else if(p.character==='snake'||p.character==='fox')npc.root.scale.setScalar(1.18);
  npc.planetId=p.id;npc.surface=npcSurface;characters.push(npc);
  if(p.id==='home') {
   const sh=createCharacter('sheep'),sg=surfaceGroup(g,p.radius,-.6,1.65);sg.add(sh.root);sh.root.rotation.y=.55;characters.push(sh);
   tree(g,p.radius,-2.7,-1.6,.8);tree(g,p.radius,2.15,-1.9,.5);
  }else if(p.id==='fox'){tree(g,p.radius,-2.1,-1.1,.8);tree(g,p.radius,1.6,-1.9,.6);}
  else if(['king','conceited','lamplighter','geographer'].includes(p.id))tree(g,p.radius,1.65,-1.65,.5);
  const prop=createProp(p.character);
  if(prop.children.length){const pg=surfaceGroup(g,p.radius,-1.5,1.25);pg.add(prop);prop.rotation.y=.4;if(p.character==='pilot')prop.scale.setScalar(.65);}
  if(!['snake','earth','drunkard'].includes(p.id))for(let j=0;j<6;j++){
   const a=j/6*Math.PI*2+.1;flowers(g,p.radius,Math.cos(a)*2.3,Math.sin(a)*2.3,j%3?'#efdec1':'#e1ba77');
  }
  if(p.id==='king') {
   const throne=surfaceGroup(g,p.radius,-1.1,-.65);mesh(throne,new THREE.BoxGeometry(1,1,1),'#96764b',[0,.8,-.1],[1.1,1.5,.2]);
  }
  for(const child of g.children)if(child.isGroup)batchShapes(child);
 }
 const prince=createCharacter('prince');scene.add(prince.root);
 const glowGeo=new THREE.BufferGeometry(),trailPositions=new Float32Array(50*3);glowGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
 const trail=new THREE.Points(glowGeo,new THREE.PointsMaterial({color:'#ffe4a1',size:.14,transparent:true,opacity:.65,depthWrite:false}));scene.add(trail);trail.visible=false;
 const trailHistory=[];let elapsed=0,first=true,previous=new THREE.Vector3();
 let frames=0,lastPhase='opening';
 function resize(width,height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 function setQuality(quality){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='low'?1:1.5));renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;resize(innerWidth,innerHeight);}
 setQuality(settings.quality);
 function update(state,dt) {
  elapsed+=dt;frames++;
  const p=planetById(state.targetId)||planets[0];
  const pos=new THREE.Vector3(state.position.x,state.position.y,state.position.z);
  const delta=pos.clone().sub(previous);const speed=dt>0?Math.min(1,delta.length()/dt/6):0;
  const flying=['transit','return'].includes(state.phase);
  const tr=state.travel,flightT=tr?tr.elapsed/tr.duration:0;
  const airborne=flying&&(state.phase!=='return'||tr.elapsed>(settings.reducedMotion?.2:.75));
  prince.root.position.copy(pos);prince.root.position.y+=(!flying&&state.phase!=='opening')?Math.sin(elapsed*2)*.006:0;
  if(airborne && delta.length()>.002) {
   const heading=Math.atan2(delta.x,delta.z);
   prince.root.rotation.y+=Math.atan2(Math.sin(heading-prince.root.rotation.y),Math.cos(heading-prince.root.rotation.y))*Math.min(1,dt*5);
  }else if(speed>.15&&state.phase==='explore'){
   const heading=Math.atan2(delta.x,delta.z);
   prince.root.rotation.y+=Math.atan2(Math.sin(heading-prince.root.rotation.y),Math.cos(heading-prince.root.rotation.y))*Math.min(1,dt*10);
  } else if(!flying)prince.root.rotation.y=THREE.MathUtils.lerp(prince.root.rotation.y,.35,1-Math.exp(-dt*3));
  const lean=airborne&&!settings.reducedMotion?-Math.sin(Math.PI*flightT)*.6:0;
  prince.root.rotation.x=THREE.MathUtils.lerp(prince.root.rotation.x,lean,1-Math.exp(-dt*7));
  const animationTime=settings.reducedMotion?0:elapsed;
  prince.animate({elapsed:animationTime,speed:flying?0:speed,flight:airborne?Math.sin(Math.PI*flightT):0});
  characters.forEach(c=>{
   const biting=c.planetId==='snake'&&state.phase==='return'&&tr.elapsed<.75;
   if(c.planetId==='snake') {
    const biteProgress=biting?Math.sin(Math.PI*Math.min(1,tr.elapsed/.75))**2:0;
    const aim=c.surface.worldToLocal(pos.clone().add(new THREE.Vector3(0,.55,0)));
    c.root.position.set((aim.x-.05)*biteProgress,(aim.y-1.04)*biteProgress,(aim.z-.18)*biteProgress);
   }
   c.animate({elapsed:animationTime,speed:0,flight:0,bite:0});
  });
  trail.visible=airborne&&!settings.reducedMotion;
  if(trail.visible){trailHistory.unshift(pos.clone().add(new THREE.Vector3(0,1.15,0)));if(trailHistory.length>50)trailHistory.pop();for(let i=0;i<50;i++){const pt=trailHistory[Math.min(i,trailHistory.length-1)];trailPositions.set([pt.x,pt.y,pt.z],i*3);}glowGeo.attributes.position.needsUpdate=true;}else trailHistory.length=0;
  const narrow=camera.aspect<.75;
  const baseFocus=new THREE.Vector3(p.position.x,1.6,p.position.z);
  if(flying)baseFocus.copy(pos).add(new THREE.Vector3(0,-2,0));
  else if(state.phase==='explore'||state.phase==='dialogue') {
   const distance=pos.distanceTo(new THREE.Vector3(p.position.x,p.radius,p.position.z));
   if(distance>4)baseFocus.lerp(pos.clone().add(new THREE.Vector3(0,-2,0)),Math.min(1,(distance-4)/4));
  }
  if(state.phase==='opening')baseFocus.set(narrow?0:-5.8,narrow?3.2:2.5,0);
  const zoom=narrow?1.45:1;
  targetCamera.copy(baseFocus).add(new THREE.Vector3(10*zoom,8.7*zoom,17*zoom));
  if(state.phase==='opening')targetCamera.x+=Math.sin(elapsed*.12)*1.15;
  if(first){camera.position.copy(targetCamera);focus.copy(baseFocus);previous.copy(pos);first=false;}
  const ease=1-Math.exp(-dt*(settings.reducedMotion?10:3.3));
  camera.position.lerp(targetCamera,ease);focus.lerp(baseFocus,ease);camera.lookAt(focus);
  key.position.set(pos.x-10,22+pos.y*.4,pos.z+15);key.target.position.set(pos.x,1,pos.z);key.target.updateMatrixWorld();
  for(const pp of planets) {
   const group=planetGroups.get(pp.id),distance=Math.hypot(pp.position.x-pos.x,pp.position.z-pos.z);
   const near=distance<19;
   const scale=.32+.68*THREE.MathUtils.smoothstep(25-distance,0,13);
   group.scale.setScalar(scale);
   for(const child of group.children){child.visible=near||!!child.userData.lodBase;if(child.isMesh)child.castShadow=near;}
  }
  previous.copy(pos);lastPhase=state.phase;renderer.render(scene,camera);
 }
 function dispose(){
  const geometries=new Set(),materials=new Set();
  scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();key.shadow.dispose();renderer.dispose();
 }
 return {update,resize,setQuality,dispose,renderer,scene,camera,get frames(){return frames;},get phase(){return lastPhase;}};
}
