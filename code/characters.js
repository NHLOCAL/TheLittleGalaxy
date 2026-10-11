import * as THREE from '../assets/vendor/three.module.js';

const mats=new Map();
const sphere=new THREE.SphereGeometry(1,24,16);
const smallSphere=new THREE.SphereGeometry(1,16,12);
const cyl=new THREE.CylinderGeometry(1,1,1,24);
const cone=new THREE.ConeGeometry(1,1,24);
const box=new THREE.BoxGeometry(1,1,1);
export function material(color,extra={}) {
 const key=color+JSON.stringify(extra);
 if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.68,...extra}));
 return mats.get(key);
}
export function mesh(parent,geometry,color,position=[0,0,0],scale=[1,1,1],extra={}) {
 const m=new THREE.Mesh(geometry,typeof color==='string'?material(color,extra):color);
 m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const ball=(g,c,p,s,extra)=>mesh(g,sphere,c,p,s,extra);
const cube=(g,c,p,s)=>mesh(g,box,c,p,s);
function tube(parent,points,radius,color) {
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return mesh(parent,new THREE.TubeGeometry(path,24,radius,8,false),color);
}
function lathe(parent,pts,color,p=[0,0,0]) {
 return mesh(parent,new THREE.LatheGeometry(pts.map(v=>new THREE.Vector2(...v)),32),color,p);
}
function face(root,headY,skin,{beard=false,old=false}={}) {
 ball(root,skin,[0,headY,0],[.46,.53,.415]);
 for(const side of [-1,1]) {
  ball(root,skin,[side*.465,headY-.02,-.005],[.105,.155,.075]);
  ball(root,'#df9578',[side*.465,headY-.02,.045],[.057,.086,.027]);
  ball(root,'#fff6e5',[side*.175,headY+.055,.36],[.12,.135,.049]);
  ball(root,'#6b5947',[side*.172,headY+.045,.407],[.073,.087,.023],{roughness:.22});
  ball(root,'#1b2029',[side*.167,headY+.052,.424],[.042,.056,.013],{roughness:.1});
  ball(root,'#ffffff',[side*.16-.018,headY+.082,.433],[.017,.02,.008]);
  ball(root,'#f1a08e',[side*.295,headY-.095,.347],[.091,.044,.016]);
  const brow=tube(root,[[side*.28,headY+.225,.35],[side*.18,headY+.25,.397],[side*.095,headY+.223,.39]],.018,old?'#b2ada2':'#82633f');
  brow.rotation.z=side*.025;
 }
 ball(root,skin,[0,headY-.04,.43],[.076,.09,.078]);
 tube(root,[[-.105,headY-.23,.37],[0,headY-.255,.407],[.105,headY-.23,.37]],.014,'#8e554b');
 if(beard) {
  for(let i=0;i<9;i++) {
   const a=i/8*Math.PI;
   ball(root,'#ede5d4',[(i-4)*.055,headY-.3-Math.sin(a)*.21,.32],[.115,.17,.115]);
  }
  ball(root,'#e8ddcc',[-.13,headY-.135,.445],[.17,.065,.06]);
  ball(root,'#e8ddcc',[.13,headY-.135,.445],[.17,.065,.06]);
 }
}
function hair(root,y,color,style='prince') {
 const count=style==='prince'?24:13;
 for(let i=0;i<count;i++) {
  const a=i*2.39996;
  const h=.13+(i/count)*.37;
  const r=Math.sqrt(Math.max(.03,.46*.46-h*h));
  const b=ball(root,color,[Math.cos(a)*r,y+h,Math.sin(a)*r],style==='prince'?[.13,.155,.125]:[.17,.19,.145]);
  b.rotation.set(Math.sin(a)*.6,0,Math.cos(a)*.5);
 }
 if(style==='prince') {
  const shades=['#efbd52','#f4ce70','#df9c35'];
  for(let i=0;i<12;i++) {
   const x=-.42+i*.076;
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,y+.28,.23),new THREE.Vector3(x+.04,y+.52,.31),new THREE.Vector3(x+.15,y+.62,.28),new THREE.Vector3(x+.28,y+.51,.25)]);
   const g=new THREE.TubeGeometry(curve,18,.068,8,false),pos=g.attributes.position,v=new THREE.Vector3();
   for(let j=0;j<pos.count;j++) {
    const t=Math.floor(j/9)/18,center=curve.getPointAt(t);
    v.fromBufferAttribute(pos,j).sub(center).multiplyScalar(.35+.8*Math.sin(Math.PI*t*.85)).add(center);pos.setXYZ(j,v.x,v.y,v.z);
   }
   g.computeVertexNormals();mesh(root,g,shades[i%3]);
  }
  for(const s of [-1,1]) {
   ball(root,'#e4ad40',[s*.4,y+.05,-.04],[.14,.22,.15]);
   tube(root,[[s*.38,y+.17,.1],[s*.52,y+.13,.08],[s*.54,y+.24,.025]],.038,'#f2c05e');
  }
 }
}
function humanoid(type) {
 const root=new THREE.Group();
 const skins={prince:'#f3cfa3',king:'#ebc49e',geographer:'#dbb69a',businessman:'#d7af96',drunkard:'#deb5a0',pilot:'#ddb791',conceited:'#f0c5a6',lamplighter:'#dbb798'};
 const clothes={prince:'#4c947b',king:'#7c384f',geographer:'#788c7c',businessman:'#3c4c60',drunkard:'#817776',pilot:'#8b6249',conceited:'#566b92',lamplighter:'#344f65'};
 const skin=skins[type],cloth=clothes[type];
 const headY=type==='king'?2.52:2.32;
 const torso=lathe(root,[[.29,0],[.37,.08],[.39,.34],[.36,.72],[.3,.88],[.16,.97]],cloth,[0,1.0,0]);
 ball(root,skin,[0,2.01,0],[.13,.2,.13]);
 face(root,headY,skin,{beard:['king','geographer'].includes(type),old:type!=='prince'});
 if(!['king','businessman','geographer'].includes(type)) hair(root,headY,type==='prince'?'#efbe54':'#51473d',type==='prince'?'prince':'short');
 else {
  for(const s of [-1,1])ball(root,'#d5cdbc',[s*.37,headY+.04,-.15],[.12,.23,.2]);
 }
 const legs=[],arms=[];
 for(const side of [-1,1]) {
  const leg=new THREE.Group();leg.position.set(side*.18,1.04,0);root.add(leg);legs.push(leg);
  ball(leg,type==='prince'?'#e9d8ad':cloth,[0,-.4,0],[.14,.43,.155]);
  ball(leg,'#65503d',[0,-.85,.055],[.155,.16,.25]);
  cube(leg,'#3e3832',[0,-.97,.08],[.28,.06,.39]);
  if(type==='prince')ball(leg,'#94713e',[0,-.73,0],[.15,.22,.16]);
  const arm=new THREE.Group();arm.position.set(side*.345,1.8,0);arm.rotation.z=side*.16;root.add(arm);arms.push(arm);
  ball(arm,cloth,[side*.03,-.25,0],[.145,.29,.155]);
  ball(arm,cloth,[side*.04,-.59,.028],[.13,.2,.14]);
  ball(arm,type==='prince'?'#dfc79e':'#b5a58a',[side*.04,-.73,.028],[.133,.065,.142]);
  ball(arm,skin,[side*.04,-.855,.045],[.103,.15,.095]);
  ball(arm,skin,[side*-.032,-.83,.105],[.045,.073,.055]);
 }
 if(type==='prince') {
  const coat=lathe(root,[[.43,0],[.47,.04],[.4,.2],[.36,.58]],'#4a8c72',[0,.68,0]);
  for(const s of [-1,1]){
   const panel=cube(root,'#b6c89b',[s*.155,1.74,.305],[.105,.35,.045]);panel.rotation.z=s*.3;
  }
  for(let i=0;i<4;i++)ball(root,'#e4c478',[-.09,1.53-i*.175,.37],[.027,.027,.02],{metalness:.4,roughness:.3});
  cube(root,'#85643c',[0,1.13,.05],[.74,.07,.69]);
  cube(root,'#dfb650',[0,1.13,.405],[.135,.115,.025]);
  const scarfRing=mesh(root,new THREE.TorusGeometry(.18,.085,10,32),'#edbf51',[0,1.98,0]);scarfRing.rotation.x=Math.PI/2;
 } else if(type==='king') {
  lathe(root,[[.8,0],[.74,.1],[.65,.7],[.4,1.6]],'#82374e',[0,.2,-.08]);
  for(let i=0;i<16;i++) {
   const a=i/16*Math.PI*2;
   ball(root,'#f6e2bd',[Math.cos(a)*.49,1.77,Math.sin(a)*.49],[.14,.14,.14]);
  }
  const crown=mesh(root,new THREE.CylinderGeometry(.41,.44,.21,32),'#e7b554',[0,headY+.52,0]);
  for(let i=0;i<7;i++) {
   const a=i/7*Math.PI*2;
   mesh(root,cone,'#ebc267',[Math.cos(a)*.38,headY+.71,Math.sin(a)*.38],[.095,.29,.095]);
   ball(root,i%2?'#e3e8d5':'#a23040',[Math.cos(a)*.43,headY+.51,Math.sin(a)*.43],[.048,.05,.025]);
  }
  cube(root,'#b4945e',[-.7,1.07,-.6],[.13,2.2,.12]);
  ball(root,'#ecce7b',[-.7,2.25,-.6],[.17,.17,.17],{metalness:.5});
 } else if(['conceited','lamplighter','pilot'].includes(type)) {
  const hatColor=type==='pilot'?'#684e3c':type==='conceited'?'#3b516e':'#263c4f';
  ball(root,hatColor,[0,headY+.41,-.05],[.5,.2,.45]);
  if(type!=='pilot') {
   mesh(root,cyl,hatColor,[0,headY+.61,0],[.4,.32,.37]);
   mesh(root,cyl,'#ba974f',[0,headY+.51,0],[.405,.065,.375]);
  }else {
   for(const s of [-1,1]) {
    const goggles=mesh(root,new THREE.TorusGeometry(.105,.025,8,20),'#bdb49c',[s*.15,headY+.3,.385]);
    ball(root,'#5a7485',[s*.15,headY+.3,.383],[.089,.081,.022],{metalness:.4});
   }
  }
 } else if(type==='businessman') {
  const tie=mesh(root,cone,'#a76962',[0,1.66,.35],[.085,.39,.04]);tie.rotation.z=Math.PI;
  for(const s of [-1,1]) {
   const lens=mesh(root,new THREE.TorusGeometry(.133,.018,8,24),'#8a7761',[s*.175,headY+.055,.413]);
  }
  cube(root,'#9a8767',[0,headY+.09,.43],[.085,.018,.025]);
 }
 const scarf=new THREE.Group();root.add(scarf);scarf.position.set(-.13,1.96,-.06);
 const scarfParts=[];
 if(type==='prince') for(let i=0;i<7;i++) {
  const part=ball(scarf,i%2?'#efc664':'#e6b447',[-.14-i*.19,0,-.025-i*.04],[.145,.025,.115]);part.userData.dynamic=true;scarfParts.push(part);
 }
 return {root,animate({elapsed=0,speed=0,flight=0}){
  const walk=Math.sin(elapsed*9)*Math.min(speed,1)*.5;
  legs.forEach((leg,i)=>leg.rotation.x=flight?-.35:walk*(i?1:-1));
  arms.forEach((arm,i)=>{arm.rotation.x=flight?-.25:-walk*(i?1:-1)*.65;arm.rotation.z=(i?1:-1)*(.16+flight*.85)+Math.sin(elapsed*1.7+i)*.022;});
  torso.rotation.z=Math.sin(elapsed*1.5)*.009;
  scarfParts.forEach((part,i)=>{part.position.y=Math.sin(elapsed*3-i*.6)*(.04+flight*.045);part.position.z=-.025-i*.04+Math.sin(elapsed*2.5-i*.4)*.035;});
 }};
}
function fox() {
 const root=new THREE.Group();
 ball(root,'#c87939',[0,.59,-.13],[.4,.43,.72]);
 ball(root,'#e59b50',[0,1.17,.47],[.39,.38,.36]);
 for(const s of [-1,1]) {
  ball(root,'#e7ccaa',[s*.16,.98,.63],[.21,.16,.25]);
  ball(root,'#dfd0b5',[s*.1,1.04,.8],[.115,.085,.19]);
  ball(root,'#252b2e',[s*.185,1.22,.745],[.065,.071,.035]);
  ball(root,'#f9e5c3',[s*.197,1.24,.77],[.015,.018,.008]);
  const ear=mesh(root,cone,'#c3793d',[s*.28,1.62,.39],[.205,.5,.17]);ear.rotation.z=s*-.19;
  const inner=mesh(root,cone,'#624735',[s*.28,1.65,.435],[.095,.28,.09]);inner.rotation.z=s*-.19;
  for(const z of [-.47,.3]) {
   ball(root,'#b66b34',[s*.23,.29,z],[.115,.3,.125]);
   ball(root,'#42352f',[s*.24,.065,z+.03],[.115,.065,.16]);
  }
 }
 ball(root,'#272b2b',[0,1.07,.98],[.08,.065,.052]);
 const tail=new THREE.Group();root.add(tail);tail.position.set(0,.57,-.63);
 tube(tail,[[0,0,0],[.24,.12,-.4],[.55,.32,-.7],[.87,.57,-.76]],.22,'#c77b3d');
 ball(tail,'#ead4b4',[.85,.52,-.76],[.23,.28,.24]);
 return {root,animate({elapsed}){tail.rotation.y=Math.sin(elapsed*1.8)*.11;root.rotation.z=Math.sin(elapsed*1.3)*.01;}};
}
function sheep() {
 const root=new THREE.Group();ball(root,'#e5dbc8',[0,.73,0],[.49,.45,.65]);
 for(let i=0;i<44;i++) {
  const y=1-2*(i+.5)/44,a=i*2.39996,r=Math.sqrt(1-y*y);
  ball(root,i%3?'#f3e8d4':'#d9d0bc',[r*Math.cos(a)*.44,.73+y*.4,r*Math.sin(a)*.61],[.145,.15,.15]);
 }
 ball(root,'#d4bda0',[0,1.02,.62],[.24,.28,.21]);
 ball(root,'#e0c8ac',[0,.92,.79],[.21,.14,.13]);
 for(const s of [-1,1]) {
  ball(root,'#bfa17d',[s*.255,1.03,.64],[.16,.085,.08]);
  ball(root,'#202a2b',[s*.12,1.075,.801],[.038,.043,.022]);
  ball(root,'#faf5e6',[s*.12-.009,1.091,.82],[.009,.011,.007]);
  for(const z of [-.36,.33]){
   ball(root,'#baa58d',[s*.27,.3,z],[.085,.29,.086]);ball(root,'#615648',[s*.27,.055,z],[.095,.07,.125]);
  }
 }
 return {root,animate({elapsed}){root.rotation.z=Math.sin(elapsed*1.6)*.012;}};
}
function rose() {
 const root=new THREE.Group();
 mesh(root,cyl,'#538b62',[0,.73,0],[.03,1.4,.03]);
 for(const s of [-1,1]) {
  const l=ball(root,'#548c57',[s*.17,.65+s*.14,0],[.23,.075,.1]);l.rotation.z=s*.55;
 }
 const bloom=new THREE.Group();bloom.position.y=1.4;root.add(bloom);
 for(let layer=0;layer<4;layer++) {
  const n=7-layer,width=.22-layer*.043,height=.39-layer*.045;
  const g=new THREE.BufferGeometry(),positions=[],uv=[],indices=[];
  for(let row=0;row<=10;row++)for(let col=0;col<=8;col++){
   const u=col/4-1,v=row/10;
   positions.push(u*width*Math.sin(Math.PI*v)**.65,v*height,.12*v*v+.055*u*u*v);uv.push(col/8,v);
   if(row<10&&col<8){const k=row*9+col;indices.push(k,k+9,k+1,k+1,k+9,k+10);}
  }
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  for(let i=0;i<n;i++) {
   const a=i/n*Math.PI*2+layer*.7,radius=.11-layer*.025;
   const petal=mesh(bloom,g,['#b3344e','#ce4254','#b93550','#a12642'][layer],[Math.sin(a)*radius,-.07+layer*.047,Math.cos(a)*radius],[1,1,1],{side:THREE.DoubleSide});
   petal.rotation.y=a;petal.rotation.x=-(.15+(.05*(3-layer)));
  }
 }
 ball(bloom,'#a42842',[0,.22,0],[.04,.08,.04]);
 const glass=new THREE.MeshPhysicalMaterial({color:'#d1e2ed',clearcoat:1,roughness:.06,transparent:true,opacity:.12,side:THREE.FrontSide,depthWrite:false});
 const bell=lathe(root,[[.63,0],[.65,.03],[.65,.15],[.61,1.63],[.54,1.81],[.38,1.99],[.15,2.08],[0,2.1]],glass);
 ball(root,'#d6b777',[0,2.17,0],[.09,.09,.09],{metalness:.6,roughness:.28});
 mesh(root,cyl,'#ad9061',[0,.025,0],[.73,.07,.73]);
 return {root,animate({elapsed}){bloom.rotation.y=Math.sin(elapsed*.75)*.08;}};
}
function snake() {
 const root=new THREE.Group();
 tube(root,[[.48,.08,-.27],[-.35,.08,-.44],[-.59,.12,.17],[.12,.16,.45],[.49,.2,.14],[.18,.53,.09],[.05,.91,.11]],.14,'#b8a264');
 ball(root,'#c7b574',[.05,1.04,.18],[.2,.17,.22]);
 for(const s of [-1,1]) {
  ball(root,'#3b4140',[.05+s*.14,1.07,.31],[.037,.048,.023]);
  ball(root,'#f2cc6e',[.05+s*.14,1.085,.325],[.01,.016,.006]);
 }
 return {root,animate({elapsed,bite=0}){root.rotation.y=Math.sin(elapsed)*.07;root.rotation.x=bite*Math.sin(elapsed*15)*.22;}};
}
export function batchShapes(group) {
 // Merge fixed shapes sharing a material; articulated groups and animated ribbons keep their pivots.
 for(const child of [...group.children])if(child.isGroup)batchShapes(child);
 const batches=new Map();
 for(const child of group.children)if(child.isMesh&&!child.userData.dynamic&&!(Array.isArray(child.material))){
  const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);
 }
 for(const [mat,list] of batches) {
  if(list.length<3)continue;
  const parts=list.map(m=>{m.updateMatrix();return (m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);});
  const geo=new THREE.BufferGeometry();
  for(const attr of ['position','normal','uv']) {
   if(!parts.every(g=>g.attributes[attr]))continue;
   const arrays=parts.map(g=>g.attributes[attr].array);const merged=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));
   let offset=0;for(const a of arrays){merged.set(a,offset);offset+=a.length;}
   geo.setAttribute(attr,new THREE.BufferAttribute(merged,parts[0].attributes[attr].itemSize));
  }
  const merged=new THREE.Mesh(geo,mat);merged.castShadow=true;merged.receiveShadow=true;group.add(merged);list.forEach(m=>group.remove(m));parts.forEach(g=>g.dispose());
 }
}
export function createCharacter(type) {
 const c=type==='fox'?fox():type==='rose'?rose():type==='sheep'?sheep():type==='snake'?snake():humanoid(type);
 batchShapes(c.root);return c;
}

export function createProp(type) {
 const root=new THREE.Group();
 if(type==='lamplighter') {
  mesh(root,cyl,'#574b3c',[0,1.4,0],[.055,2.8,.055]);
  const lamp=ball(root,'#ffe0a1',[0,2.65,0],[.19,.28,.19],{emissive:'#f7ba55',emissiveIntensity:2.5});
  for(const s of [-1,1])cube(root,'#6c5940',[s*.2,2.65,0],[.027,.55,.027]);
  mesh(root,cone,'#69543b',[0,3.02,0],[.32,.22,.32]);
  mesh(root,cyl,'#856846',[0,2.36,0],[.23,.045,.23]);
 }else if(['businessman','geographer'].includes(type)) {
  cube(root,'#87694d',[0,1.0,0],[1.45,.12,.7]);
  for(const x of [-.55,.55])for(const z of [-.25,.25])cube(root,'#645440',[x,.48,z],[.1,.93,.1]);
  const book=cube(root,'#e5d7af',[0,1.08,0],[.75,.035,.43]);book.rotation.y=.14;
  if(type==='geographer') {
   ball(root,'#7ca0a8',[.5,1.34,-.03],[.21,.21,.21]);
   mesh(root,cyl,'#c9b483',[.5,1.08,-.03],[.12,.07,.12]);
   const ring=mesh(root,new THREE.TorusGeometry(.23,.013,6,32),'#ba9b60',[.5,1.34,-.03]);ring.rotation.z=.4;
  }else for(let i=0;i<5;i++)mesh(root,cyl,'#d9b45f',[-.42+i*.09,1.1+i*.017,.1],[.046,.08,.046]);
 }else if(type==='drunkard') {
  lathe(root,[[.1,0],[.12,.1],[.12,.4],[.05,.47],[.05,.65]],'#708b77',[.52,0,.3]);
  mesh(root,cyl,'#b7a587',[.82,.12,.36],[.1,.23,.1]);
 }else if(type==='pilot') {
  ball(root,'#b6b1a0',[0,.6,0],[.23,.29,1.1]);
  cube(root,'#c1bba8',[0,.55,0],[2.9,.06,.65]);
  cube(root,'#94866d',[0,.77,-.81],[.8,.05,.37]);
  cube(root,'#8c785c',[0,.95,-.94],[.035,.38,.33]);
  const prop=cube(root,'#645644',[0,.62,1.14],[1.05,.08,.055]);prop.rotation.z=.3;
 }
 return root;
}
