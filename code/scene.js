import * as THREE from '../assets/vendor/three.module.js';
import { createCharacter, createProp, material, mesh, batchShapes } from './characters.js';
import { landingPosition, planetById } from './story.js';

const UP=new THREE.Vector3(0,1,0);
const focus=new THREE.Vector3();
const targetCamera=new THREE.Vector3();
function random(seed) { return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}; }
function terrainProfile(p,seed) {
 const rng=random(seed),kind=p.id==='fox'?'meadow':p.id==='earth'?'desert':p.id==='home'?'garden':p.id==='snake'?'mineral':'rock';
 const craters=Array.from({length:8},()=>{
  const a=rng()*Math.PI*2,y=rng()*1.55-.95,r=Math.sqrt(1-y*y);
  return {x:Math.cos(a)*r,y,z:Math.sin(a)*r,width:.012+rng()*.029,depth:.034+rng()*.038};
 });
 // The larger front-facing basins remain legible from the gameplay camera.
 if(kind==='rock')craters.push({x:.45,y:.1,z:Math.sqrt(1-.45*.45-.1*.1),width:.055,depth:.07});
 if(kind==='garden')craters.push(
  {x:-.48,y:.36,z:Math.sqrt(1-.48*.48-.36*.36),width:.025,depth:.046},
  {x:.65,y:.43,z:Math.sqrt(1-.65*.65-.43*.43),width:.023,depth:.04}
 );
 const color=new THREE.Color(p.color).getRGB({},THREE.SRGBColorSpace),rgb=[color.r,color.g,color.b];
 const sand=kind==='desert'?[.83,.68,.43]:[.75,.66,.46];
 function sample(x,y,z,out={}) {
  const broad=Math.sin(x*5.1+seed*.7)*Math.sin(z*4.7-y*3.3)+.35*Math.sin(y*11+z*3+seed);
  const strata=.5+.5*Math.sin(y*14+x*5+z*4+seed);
  let height=broad*.009,pit=0,rim=0,path=0;
  if(kind==='desert'||kind==='mineral') {
   const dunes=Math.sin(x*11+z*5+Math.sin(y*5+seed)*1.25);
   height+=dunes*.027+Math.sin(z*18-x*7)*.004;
  } else if(kind==='rock'||kind==='garden') {
   for(const c of craters) {
    const d=1-(x*c.x+y*c.y+z*c.z),basin=Math.exp(-d/c.width*2.8);
    const edge=Math.exp(-(((d-c.width)/(c.width*.28))**2));
    height-=c.depth*basin;height+=c.depth*.26*edge;pit+=basin;rim+=edge;
   }
  } else height+=Math.sin(x*6-z*3+y*4)*.011;
  if(kind==='meadow')path=1-THREE.MathUtils.smoothstep(Math.abs(Math.sin(x*5.4+z*2.8+Math.sin(y*5)*.55)),.2,.46);
  if(kind==='garden')path=THREE.MathUtils.smoothstep(broad,.15,.85)*.8;
  // The original landing heights also anchor the story and the return flight.
  height*=1-THREE.MathUtils.smoothstep(y,.82,.92);
  out.height=height;out.path=path;out.strata=strata;out.pit=pit;out.rim=rim;return out;
 }
 return {kind,rgb,sand,sample};
}
function terrainTextures(profile,seed) {
 const width=512,height=256,colorCanvas=document.createElement('canvas'),bumpCanvas=document.createElement('canvas');
 colorCanvas.width=bumpCanvas.width=width;colorCanvas.height=bumpCanvas.height=height;
 const colorContext=colorCanvas.getContext('2d'),bumpContext=bumpCanvas.getContext('2d');
 const colors=colorContext.createImageData(width,height),bumps=bumpContext.createImageData(width,height);
 const rng=random(seed),sample={},channels=[0,0,0];
 for(let row=0;row<height;row++)for(let col=0;col<width;col++) {
  const u=col/(width-1)*Math.PI*2,v=row/(height-1)*Math.PI,x=-Math.cos(u)*Math.sin(v),y=Math.cos(v),z=Math.sin(u)*Math.sin(v);
  profile.sample(x,y,z,sample);
  const grain=(rng()-.5)*.032,tone=.96+sample.strata*.065-Math.min(1,sample.pit)*.15+sample.rim*.035+grain;
  for(let c=0;c<3;c++)channels[c]=profile.rgb[c]*tone;
  if(profile.kind==='meadow')for(let c=0;c<3;c++)channels[c]=THREE.MathUtils.lerp(channels[c],profile.sand[c],sample.path*.92);
  else if(profile.kind==='garden') {
   const moss=[.37,.46,.25];for(let c=0;c<3;c++)channels[c]=THREE.MathUtils.lerp(channels[c],moss[c],sample.path*.7);
  }
  const offset=(row*width+col)*4;
  for(let c=0;c<3;c++)colors.data[offset+c]=THREE.MathUtils.clamp(channels[c]*255,0,255);
  colors.data[offset+3]=255;
  const ripple=profile.kind==='desert'||profile.kind==='mineral'?Math.sin(x*150+z*69+Math.sin(y*17)*3)*9:0;
  const bump=THREE.MathUtils.clamp(126+sample.height*850+ripple+grain*350,0,255);
  bumps.data[offset]=bumps.data[offset+1]=bumps.data[offset+2]=bump;bumps.data[offset+3]=255;
 }
 // Matching meridians and uniform poles avoid seams and pinched bump highlights.
 for(const data of [colors.data,bumps.data]) {
  for(let row=0;row<height;row++)for(let c=0;c<4;c++)data[(row*width+width-1)*4+c]=data[row*width*4+c];
  for(const row of [0,height-1])for(let col=1;col<width;col++)for(let c=0;c<4;c++)data[(row*width+col)*4+c]=data[row*width*4+c];
 }
 colorContext.putImageData(colors,0,0);bumpContext.putImageData(bumps,0,0);
 const map=new THREE.CanvasTexture(colorCanvas),bumpMap=new THREE.CanvasTexture(bumpCanvas);map.colorSpace=THREE.SRGBColorSpace;
 for(const texture of [map,bumpMap]){texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=4;}
 return {map,bumpMap};
}
function planetGeometry(radius,profile) {
 const g=new THREE.SphereGeometry(radius,96,64),p=g.attributes.position,v=new THREE.Vector3(),sample={};
 for(let i=0;i<p.count;i++) {
  v.fromBufferAttribute(p,i).normalize();profile.sample(v.x,v.y,v.z,sample);
  v.multiplyScalar(radius*(1+sample.height));p.setXYZ(i,v.x,v.y,v.z);
 }
 g.computeVertexNormals();return g;
}
function surfaceGroup(parent,radius,x,z) {
 const y=Math.sqrt(Math.max(0,radius*radius-x*x-z*z));
 const direction=new THREE.Vector3(x,y,z).normalize(),terrain=parent.userData.terrain;
 const height=terrain?terrain.sample(direction.x,direction.y,direction.z).height:0;
 const group=new THREE.Group();group.position.copy(direction).multiplyScalar(radius*(1+height));group.quaternion.setFromUnitVectors(UP,direction);parent.add(group);return group;
}
function tree(parent,radius,x,z,scale=1) {
 const g=surfaceGroup(parent,radius,x,z);g.scale.setScalar(scale);
 const trunk=new THREE.LatheGeometry([[.25,0],[.2,.15],[.15,.65],[.13,1.2],[.09,1.75],[.065,1.9]].map(p=>new THREE.Vector2(...p)),12);
 mesh(g,trunk,'#776047');
 for(let i=0;i<5;i++) {
  const a=i/5*Math.PI*2,points=[[Math.cos(a)*.44,.01,Math.sin(a)*.44],[Math.cos(a)*.19,.13,Math.sin(a)*.19],[Math.cos(a)*.12,.48,Math.sin(a)*.12]];
  mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),7,.04,5,false),'#776047');
 }
 const leaf=new THREE.SphereGeometry(1,16,12);
 for(let i=0;i<9;i++) {
  const a=i*2.4,px=Math.cos(a)*.47,pz=Math.sin(a)*.43,py=1.65+(i%3)*.22;
  if(i<5)mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,1.1,0),new THREE.Vector3(px*.5,1.55,pz*.5),new THREE.Vector3(px,py,pz)]),8,.05,6,false),'#776047');
  mesh(g,leaf,i%3?'#667c49':'#829350',[px,py,pz],[.48,.37,.44]);
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
 const leaf=mesh(g,new THREE.SphereGeometry(1,8,6),'#778956',[.06,.22,0],[.095,.018,.035]);leaf.rotation.z=.5;
 g.scale.setScalar(1.22);
}
function grass(parent,radius,profile,seed,count) {
 const rng=random(seed),bladeGeometry=new THREE.BufferGeometry(),palette=['#6d864a','#8a9c58','#b2b976'];
 // Curved, tapered leaves retain a clear silhouette at the normal camera distance.
 bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.052,0,0,.052,0,0,-.041,.46,.05,.041,.46,.05,0,1,.22],3));
 bladeGeometry.setIndex([0,2,1,1,2,3,2,4,3]);bladeGeometry.computeVertexNormals();
 const blades=palette.map(color=>new THREE.InstancedMesh(bladeGeometry,material(color,{roughness:1,side:THREE.DoubleSide,emissive:color,emissiveIntensity:.1}),count));
 const dummy=new THREE.Object3D(),direction=new THREE.Vector3(),sample={},clusters=[];
 for(let i=0;i<Math.ceil(count/7);i++) {
  let x,z,y;
  for(let attempt=0;attempt<15;attempt++) {
   const a=i/Math.ceil(count/7)*Math.PI*2+(rng()-.5)*.7,spread=profile.kind==='garden'?.51+rng()*.29:.42+rng()*.41;
   x=Math.cos(a)*spread;z=Math.sin(a)*spread;y=Math.sqrt(1-spread*spread);
   profile.sample(x,y,z,sample);
   if(profile.kind==='meadow'?sample.path<.35:sample.path>.25)break;
  }
  clusters.push({x,y,z});
 }
 for(let i=0;i<count;i++) {
  const cluster=clusters[Math.floor(i/7)],angle=i%7/7*Math.PI*2,spread=.06+rng()*.14;
  for(let j=0;j<blades.length;j++) {
   const a=angle+j*2.1,length=.32+rng()*.29;
   direction.set(cluster.x+Math.cos(a)*spread/radius,cluster.y,cluster.z+Math.sin(a)*spread/radius).normalize();
   profile.sample(direction.x,direction.y,direction.z,sample);
   dummy.position.copy(direction).multiplyScalar(radius*(1+sample.height)+.008);
   dummy.quaternion.setFromUnitVectors(UP,direction);dummy.rotateY(a);dummy.rotateZ((j-1)*.14);
   dummy.scale.set(.75+rng()*.6,length,length);dummy.updateMatrix();blades[j].setMatrixAt(i,dummy.matrix);
  }
 }
 // Keep these in a group so the planet's mesh LOD cannot re-enable tiny blade shadows.
 const tufts=new THREE.Group();tufts.name='grassTufts';parent.add(tufts);
 for(const blade of blades){blade.receiveShadow=false;blade.castShadow=false;tufts.add(blade);}
}
function volcano(parent,radius,x,z,scale,active=false) {
 const g=surfaceGroup(parent,radius,x,z);g.scale.setScalar(scale);
 const profile=[[.73,0],[.58,.12],[.39,.47],[.26,.76],[.21,.8],[.16,.73],[.13,.58]].map(p=>new THREE.Vector2(...p));
 const rock=mesh(g,new THREE.LatheGeometry(profile,24),'#8d7c63');rock.material=material('#8d7c63',{roughness:1});
 const core=mesh(g,new THREE.CircleGeometry(.14,20),active?'#d47b37':'#594d43',[0,.58,0]);core.rotation.x=-Math.PI/2;
 if(active)core.material=material('#d47b37',{emissive:'#ba501a',emissiveIntensity:.4,roughness:1});
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
function flightSparkle() {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
 const ctx=canvas.getContext('2d'),glow=ctx.createRadialGradient(16,16,0,16,16,16);
 glow.addColorStop(0,'rgba(255,244,209,1)');glow.addColorStop(.2,'rgba(255,227,166,.9)');glow.addColorStop(.55,'rgba(244,199,114,.35)');glow.addColorStop(1,'rgba(244,199,114,0)');
 ctx.fillStyle=glow;ctx.fillRect(0,0,32,32);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createScene(canvas,planets,settings) {
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setClearColor('#080d22',0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#131a30',.0027);
 const camera=new THREE.PerspectiveCamera(38,1,.1,300);
 const ambient=new THREE.HemisphereLight('#dbe6ff','#70543d',1.65);scene.add(ambient);
 const key=new THREE.DirectionalLight('#ffdfab',3.1);key.position.set(-10,22,15);scene.add(key);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=14;key.shadow.camera.bottom=-12;key.shadow.camera.near=.1;key.shadow.camera.far=65;key.shadow.normalBias=.025;key.shadow.bias=-.0003;
 scene.add(key.target);
 const rim=new THREE.DirectionalLight('#8bafdf',1.8);rim.position.set(12,6,-16);scene.add(rim);
 scene.add(starField());
 const textures=[],characters=[],planetGroups=new Map();
 for(let i=0;i<planets.length;i++) {
  const p=planets[i],g=new THREE.Group();g.position.set(p.position.x,0,p.position.z);scene.add(g);planetGroups.set(p.id,g);
  const terrain=terrainProfile(p,20+i),maps=terrainTextures(terrain,902+i);g.userData.terrain=terrain;textures.push(maps.map,maps.bumpMap);
  const mat=new THREE.MeshStandardMaterial({map:maps.map,bumpMap:maps.bumpMap,bumpScale:terrain.kind==='desert'?.075:.055,roughness:.94});
  const ground=mesh(g,planetGeometry(p.radius,terrain),mat);ground.userData.lodBase=true;
  const rng=random(40+i),rockGeo=new THREE.DodecahedronGeometry(1,1),rockMat=material(terrain.kind==='desert'?'#bca77e':i===0?'#a08e69':'#898b83',{roughness:1});
  const rocks=new THREE.InstancedMesh(rockGeo,rockMat,26),dummy=new THREE.Object3D();
  for(let j=0;j<26;j++) {
   const a=rng()*Math.PI*2,vertical=rng()*1.8-1,r=Math.sqrt(1-Math.min(.98,vertical*vertical));
   const v=new THREE.Vector3(Math.cos(a)*r,vertical,Math.sin(a)*r).normalize();
   const height=terrain.sample(v.x,v.y,v.z).height,s=.11+rng()*.25;
   dummy.position.copy(v.multiplyScalar(p.radius*(1+height)-s*.12));dummy.scale.set(s,s*(.62+rng()*.55),s*(.85+rng()*.6));dummy.rotation.set(rng()*3,rng()*3,rng()*3);dummy.updateMatrix();rocks.setMatrixAt(j,dummy.matrix);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;rocks.userData.lodBase=true;g.add(rocks);
  const npc=createCharacter(p.character);
  const npcSurface=surfaceGroup(g,p.radius,-1.1,-.2);npcSurface.add(npc.root);npc.root.rotation.y=.36;
  if(p.character==='rose')npc.root.scale.setScalar(.93);
  else if(p.character==='snake'||p.character==='fox')npc.root.scale.setScalar(1.18);
  npc.planetId=p.id;npc.surface=npcSurface;characters.push(npc);
  if(p.id==='home') {
   const sh=createCharacter('sheep'),sg=surfaceGroup(g,p.radius,-.6,1.65);sg.add(sh.root);sh.root.rotation.y=.55;characters.push(sh);
   tree(g,p.radius,-2.7,-1.6,.85);tree(g,p.radius,2.15,-1.9,.58);
   volcano(g,p.radius,2.65,-.8,.75,true);volcano(g,p.radius,.2,-2.6,.6);volcano(g,p.radius,-1.95,2.35,.42);
   grass(g,p.radius,terrain,72,130);
  }else if(p.id==='fox'){
   tree(g,p.radius,-2.1,-1.1,.82);tree(g,p.radius,1.6,-1.9,.64);grass(g,p.radius,terrain,83,230);
  }
  else if(['king','conceited','lamplighter','geographer'].includes(p.id))tree(g,p.radius,1.65,-1.65,.5);
  const prop=createProp(p.character);
  if(prop.children.length){const pg=surfaceGroup(g,p.radius,-1.5,1.25);pg.add(prop);prop.rotation.y=.4;if(p.character==='pilot')prop.scale.setScalar(.65);}
  if(!['snake','earth','drunkard'].includes(p.id))for(let j=0;j<(p.id==='fox'?11:6);j++){
   const a=j/(p.id==='fox'?11:6)*Math.PI*2+.1;
   const color=p.id==='fox'?(j%3?'#eddfb6':'#bccbe2'):j%3?'#efdec1':'#e1ba77';
   flowers(g,p.radius,Math.cos(a)*2.3,Math.sin(a)*2.3,color);
  }
  for(const child of g.children)if(child.isGroup)batchShapes(child);
 }
 const prince=createCharacter('prince');prince.root.rotation.order='YXZ';scene.add(prince.root);
 const glowGeo=new THREE.BufferGeometry(),trailPositions=new Float32Array(50*3);glowGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
 const sparkle=flightSparkle();textures.push(sparkle);
 const trail=new THREE.Points(glowGeo,new THREE.PointsMaterial({color:'#ffe4a1',map:sparkle,size:.2,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(trail);trail.visible=false;
 const trailHistory=[];let elapsed=0,first=true,previous=new THREE.Vector3(),flightBlend=0;
 let frames=0,lastPhase='opening';
 function resize(width,height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 function setQuality(quality){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='low'?1:1.5));renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;resize(innerWidth,innerHeight);}
 setQuality(settings.quality);
 function update(state,dt) {
  elapsed+=dt;frames++;
  const p=planetById(state.targetId)||planets[0];
  const pos=new THREE.Vector3(state.position.x,state.position.y,state.position.z);
  const delta=pos.clone().sub(previous),horizontal=Math.hypot(delta.x,delta.z);
  const speed=!first&&dt>0?Math.min(1,horizontal/dt/6):0;
  const flying=['transit','return'].includes(state.phase);
  const tr=state.travel,flightT=tr?tr.elapsed/tr.duration:0;
  const airborne=flying&&(state.phase!=='return'||tr.elapsed>(settings.reducedMotion?.2:.75));
  const manual=state.phase==='explore'?(state.motion?.flight||0):0;
  const targetFlight=Math.max(manual,airborne?Math.sin(Math.PI*flightT)**.65:0);
  flightBlend=THREE.MathUtils.lerp(flightBlend,targetFlight,1-Math.exp(-dt*9));
  prince.root.position.copy(pos);
  const moving=airborne||state.phase==='explore'&&(state.motion?.speed??speed)>.02;
  let turn=0;
  if(moving&&horizontal>.0001&&!first){
   const heading=Math.atan2(delta.x,delta.z);
   turn=Math.atan2(Math.sin(heading-prince.root.rotation.y),Math.cos(heading-prince.root.rotation.y));
   prince.root.rotation.y+=turn*(1-Math.exp(-dt*7));
  }else if(!flying&&flightBlend<.15){
   const turnHome=Math.atan2(Math.sin(.35-prince.root.rotation.y),Math.cos(.35-prince.root.rotation.y));
   prince.root.rotation.y+=turnHome*(1-Math.exp(-dt*3));
  }
  // Lean into travel, with the head leading and the boots trailing behind.
  const lean=flightBlend*(moving?.87:.22)*(settings.reducedMotion?.65:1);
  prince.root.rotation.x=THREE.MathUtils.lerp(prince.root.rotation.x,lean,1-Math.exp(-dt*7));
  const bank=settings.reducedMotion?0:THREE.MathUtils.clamp(turn,-1,1)*flightBlend;
  prince.root.rotation.z=THREE.MathUtils.lerp(prince.root.rotation.z,-bank*.16,1-Math.exp(-dt*6));
  const animationTime=settings.reducedMotion?0:elapsed;
  prince.animate({elapsed:animationTime,speed:0,flight:flightBlend,bank});
  characters.forEach(c=>{
   const biting=c.planetId==='snake'&&state.phase==='return'&&tr.elapsed<.75;
   if(c.planetId==='snake') {
    const biteProgress=biting?Math.sin(Math.PI*Math.min(1,tr.elapsed/.75))**2:0;
    const aim=c.surface.worldToLocal(pos.clone().add(new THREE.Vector3(0,.55,0)));
    c.root.position.set((aim.x-.05)*biteProgress,(aim.y-1.04)*biteProgress,(aim.z-.18)*biteProgress);
   }
   c.animate({elapsed:animationTime,speed:0,flight:0,bite:0});
  });
  trail.visible=(airborne||manual>.55&&(state.motion?.speed||0)>.15)&&!settings.reducedMotion;
  if(trail.visible){trailHistory.unshift(pos.clone().add(new THREE.Vector3(0,1.15,0)));if(trailHistory.length>50)trailHistory.pop();for(let i=0;i<50;i++){const pt=trailHistory[Math.min(i,trailHistory.length-1)];trailPositions.set([pt.x,pt.y,pt.z],i*3);}glowGeo.attributes.position.needsUpdate=true;}else trailHistory.length=0;
  const narrow=camera.aspect<.75;
  const baseFocus=new THREE.Vector3(p.position.x,1.6,p.position.z);
  if(flying)baseFocus.copy(pos).add(new THREE.Vector3(0,-2,0));
  else if(state.phase==='explore'||state.phase==='dialogue') {
   const distance=pos.distanceTo(new THREE.Vector3(p.position.x,p.radius,p.position.z));
   if(distance>4)baseFocus.lerp(pos.clone().add(new THREE.Vector3(0,-2,0)),Math.min(1,(distance-4)/4));
   if(manual>.05)baseFocus.lerp(pos.clone().add(new THREE.Vector3(0,narrow?.2:-1.3,0)),manual*(narrow?1:.7));
  }
  // Reserve the mobile map's band above the prince, including his swept hair.
  if(narrow&&state.phase!=='opening')baseFocus.y+=1.2;
  if(state.phase==='opening')baseFocus.set(narrow?0:-5.8,narrow?3.2:2.5,0);
  const zoom=narrow?1.45:1;
  targetCamera.copy(baseFocus).add(new THREE.Vector3(10*zoom,8.7*zoom,17*zoom));
  if(state.phase==='opening')targetCamera.x+=Math.sin(elapsed*.12)*1.15;
  if(first){camera.position.copy(targetCamera);focus.copy(baseFocus);previous.copy(pos);first=false;}
  const followSpeed=narrow&&manual>.05?7.5:3.3;
  const ease=1-Math.exp(-dt*(settings.reducedMotion?10:followSpeed));
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
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(texture=>texture.dispose());key.shadow.dispose();renderer.dispose();
 }
 return {update,resize,setQuality,dispose,renderer,scene,camera,get frames(){return frames;},get phase(){return lastPhase;}};
}
