import * as THREE from '../assets/vendor/three.module.js';
import { createPrince } from './prince.js';

const mats=new Map();
const sphere=new THREE.SphereGeometry(1,24,16);
const smallSphere=new THREE.SphereGeometry(1,16,12);
const detailSphere=new THREE.SphereGeometry(1,12,8);
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
const ball=(g,c,p,s,extra)=>mesh(g,smallSphere,c,p,s,extra);
const bead=(g,c,p,s,extra)=>mesh(g,detailSphere,c,p,s,extra);
const cube=(g,c,p,s)=>mesh(g,box,c,p,s);
function tube(parent,points,radius,color) {
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return mesh(parent,new THREE.TubeGeometry(path,18,radius,6,false),color);
}
function lathe(parent,pts,color,p=[0,0,0]) {
 return mesh(parent,new THREE.LatheGeometry(pts.map(v=>new THREE.Vector2(...v)),32),color,p);
}
// Soft tapered locks and cloth edges give the supporting cast a clear silhouette.
function lock(parent,points,radius,color) {
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const geometry=new THREE.TubeGeometry(path,18,radius,8,false),pos=geometry.attributes.position;
 const v=new THREE.Vector3();
 for(let i=0;i<pos.count;i++) {
  const t=Math.floor(i/9)/18,center=path.getPointAt(t);
  v.fromBufferAttribute(pos,i).sub(center).multiplyScalar(.2+.8*Math.sin(Math.PI*(.07+t*.93))**.5).add(center);
  pos.setXYZ(i,v.x,v.y,v.z);
 }
 geometry.computeVertexNormals();return mesh(parent,geometry,color);
}
function panel(parent,points,color,z) {
 const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();
 return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,steps:1}),color,[0,0,z]);
}
function adultFace(root,y,skin,type) {
 const head=new THREE.Group();head.name=`${type}-head`;head.position.y=y;root.add(head);
 mesh(head,sphere,skin,[0,0,0],[type==='businessman'?.4:.38,.49,.335],{roughness:.79});
 ball(head,skin,[0,-.22,.09],[.28,.265,.26]);
 const hairColor={king:'#e7dfd0',geographer:'#563b29',businessman:'#565557',conceited:'#66527d',pilot:'#593f2e',lamplighter:'#604331',drunkard:'#6b6257'}[type];
 const weary=type==='drunkard',stern=type==='businessman',proud=type==='conceited';
 for(const s of [-1,1]) {
  bead(head,skin,[s*.373,-.045,-.005],[.08,.125,.068]);
  bead(head,weary?'#c58778':'#dfac91',[s*.388,-.045,.045],[.038,.067,.019]);
  bead(head,'#f7eddf',[s*.146,.045,.296],[.083,.065,.027],{roughness:.38});
  bead(head,type==='pilot'?'#765440':'#51432f',[s*.146,.038,.319],[.042,.048,.02],{roughness:.24});
  bead(head,'#22212b',[s*.145,.039,.335],[.026,.035,.011],{roughness:.17});
  bead(head,'#ffffff',[s*.145-.012,.059,.345],[.01,.012,.005]);
  tube(head,[[s*.225,.065,.3],[s*.146,.107,.308],[s*.075,.068,.315]],.014,skin);
  if(weary||stern||proud) {
   const lid=ball(head,skin,[s*.15,.09,.304],[.096,.055,.033]);lid.rotation.z=s*(weary?.16:stern?-.13:.08);
  }
  const innerY=stern?.155:weary?.22:.185,outerY=weary?.15:.185;
  tube(head,[[s*.25,outerY,.265],[s*.16,.205,.292],[s*.073,innerY,.308]],type==='king'?.023:.019,hairColor);
  if(weary)tube(head,[[s*.225,-.01,.31],[s*.15,-.035,.332],[s*.09,-.015,.332]],.011,'#bc8c7c');
 }
 ball(head,skin,[0,-.008,.318],[.046,.094,.054]);
 bead(head,weary?'#c77f70':skin,[0,-.06,.357],[.068,.063,.074]);
 const mouthY=proud?-.227:weary?-.255:-.23;
 tube(head,[[-.094,mouthY,.302],[0,mouthY+(weary?.032:stern?.007:-.01),.319],[.094,mouthY+(proud?.037:0),.302]],.01,'#945d50');
 ball(head,skin,[0,-.33,.19],[.14,.087,.093]);
 if(stern)for(let i=0;i<2;i++)tube(head,[[-.115,.3+i*.044,.26],[0,.285+i*.043,.31],[.115,.3+i*.044,.26]],.008,'#c19982');
 return {head,hairColor};
}
function sweptHair(head,color,type) {
 const royal=type==='king',receding=type==='businessman',messy=type==='drunkard';
 ball(head,color,[0,.24,-.08],[.405,.29,.335]);
 if(receding)ball(head,'#d5b19b',[0,.32,.18],[.29,.145,.195]);
 const n=royal?14:receding?7:12;
 for(let i=0;i<n;i++) {
  const x=-.34+i*.68/(n-1),s=x<0?-1:1;
  const startY=.32+Math.sqrt(Math.max(0,1-(x/.4)**2))*.14;
  const color2=i%3===0?(royal?'#f5eee4':receding?'#94908a':type==='geographer'?'#796047':'#806c53'):color;
  const endY=royal?-.26:messy?.16+Math.sin(i*2)*.07:.25;
  lock(head,[[x*.8,startY,-.11],[x*.95,startY+.07,.14],[x+s*.075,startY-.02,.26],[royal?s*.51:x+.12,endY,royal?-.02:.28]],royal?.069:.052,color2);
 }
 for(const s of [-1,1]) {
  const sideColor=receding?'#a3a098':color;
  ball(head,sideColor,[s*.344,.075,-.11],[.093,.19,.17]);
  if(royal)for(let i=0;i<4;i++)lock(head,[[s*.29,.28,-.09],[s*.48,.04,-.12],[s*.49,-.16,-.08],[s*(.47+i*.035),-.22+i*.033,.03]],.053,i%2?'#f4ebdd':color);
 }
 if(royal||messy) {
  const beard=royal?'#eee8dc':'#6c655c';
  ball(head,beard,[0,-.33,.18],[.285,royal?.32:.215,.195]);
  for(let i=0;i<11;i++) {
   const x=-.255+i*.051,tip=royal?-.77+Math.abs(x)*.8:-.54+Math.abs(x)*.3;
   lock(head,[[x,-.21,.27],[x*1.03,-.37,.337],[x*.77,-.48,.32],[x*.36,tip,.23]],royal?.041:.03,i%3?(royal?'#ded7ca':'#7d7467'):beard);
  }
  for(const s of [-1,1])lock(head,[[0,-.128,.382],[s*.13,-.178,.404],[s*.225,-.16,.348],[s*.275,-.113,.319]],.047,beard);
 }
}
function glasses(head,color='#b29457',radius=.101) {
 for(const s of [-1,1]) {
  mesh(head,new THREE.TorusGeometry(radius,.011,6,28),color,[s*.145,.044,.356],undefined,{metalness:.65,roughness:.28});
  tube(head,[[s*.243,.056,.348],[s*.333,.073,.21],[s*.365,.045,.025]],.009,color);
 }
 tube(head,[[-.045,.055,.358],[0,.071,.375],[.045,.055,.358]],.01,color);
}
function hand(parent,skin,y=-.48) {
 ball(parent,skin,[0,y,.018],[.085,.115,.065]);
 bead(parent,skin,[-.066,y+.023,.057],[.035,.056,.032]);
 for(let i=0;i<3;i++)bead(parent,skin,[-.044+i*.04,y-.087,.036],[.022,.05,.027]);
}
function torsoDetails(root,type,cloth) {
 const gold=material('#d5ae59',{metalness:.62,roughness:.3});
 const shirt=type==='pilot'?'#ece2c7':type==='lamplighter'?'#e1d4b4':type==='drunkard'?'#a6b28a':'#f2ead8';
 panel(root,[[-.15,1.93],[.15,1.93],[.2,1.26],[0,1.08],[-.2,1.26]],shirt,.277);
 const lapel=type==='conceited'?'#bb7834':type==='pilot'?'#d9c7a4':type==='drunkard'?'#675642':cloth;
 for(const s of [-1,1]) {
  panel(root,[[s*.11,1.98],[s*.35,1.82],[s*.24,1.67],[s*.29,1.48],[s*.02,1.12]],lapel,.294);
  tube(root,[[s*.11,1.97,.332],[s*.35,1.81,.325],[s*.24,1.66,.332],[s*.055,1.26,.331]],type==='conceited'?.014:.007,type==='conceited'?gold:type==='pilot'?'#f5e6c7':'#9a8a71');
 }
 if(['businessman','geographer'].includes(type)) {
  const vest=type==='businessman'?'#313847':'#605949';
  panel(root,[[-.165,1.69],[0,1.81],[.165,1.69],[.14,1.14],[0,1.05],[-.14,1.14]],vest,.327);
  const tie=mesh(root,cone,type==='geographer'?'#365265':'#3d2835',[0,1.71,.365],[.057,.24,.028]);tie.rotation.z=Math.PI;
  bead(root,type==='geographer'?'#365265':'#3d2835',[0,1.87,.324],[.051,.05,.03]);
 }
 if(type==='pilot') {
  for(const s of [-1,1]) {
   const pocket=cube(root,'#5f4230',[s*.22,1.25,.282],[.18,.18,.054]);pocket.rotation.z=s*.05;
   panel(root,[[s*.135,1.36],[s*.31,1.36],[s*.285,1.28],[s*.18,1.27]],'#795338',.32);
   bead(root,gold,[s*.22,1.3,.359],[.022,.021,.011]);
  }
  tube(root,[[0,1.65,.35],[0,1.35,.365],[0,1.09,.325]],.011,'#bfa37d');
 }
 if(type==='lamplighter') {
  cube(root,'#28454d',[.21,1.56,.289],[.16,.16,.035]);
  cube(root,'#bd9961',[0,1.16,.034],[.7,.075,.565]);cube(root,gold,[0,1.16,.334],[.15,.095,.027]);
  const watch=mesh(root,new THREE.TorusGeometry(.067,.011,6,24),gold,[-.21,1.41,.314]);
  bead(root,'#f4dfac',[-.21,1.41,.31],[.055,.055,.011]);
  tube(root,[[-.2,1.34,.322],[-.11,1.26,.347],[.02,1.38,.349]],.008,gold);
  tube(root,[[-.25,1.94,.34],[.06,1.5,.374],[.33,1.12,.3]],.042,'#a78254');
  cube(root,'#866243',[.39,1.04,.016],[.23,.29,.15]);
 }
 const buttons=type==='conceited'?5:type==='king'?3:3;
 for(let i=0;i<buttons;i++) {
  if(type==='conceited')for(const s of [-1,1])bead(root,gold,[s*.255,1.8-i*.135,.31],[.029,.031,.018]);
  else bead(root,['businessman','drunkard'].includes(type)?'#665949':gold,[-.02,1.58-i*.15,.361],[.019,.019,.012]);
 }
}
function throne(root) {
 const wood='#503d34',gold=material('#caa35e',{metalness:.48,roughness:.37}),velvet='#633548';
 cube(root,wood,[0,1.62,-.37],[1.08,1.9,.15]);
 ball(root,wood,[0,2.56,-.37],[.53,.25,.095]);
 cube(root,velvet,[0,1.75,-.265],[.88,1.5,.085]);
 ball(root,velvet,[0,2.45,-.27],[.43,.2,.06]);
 tube(root,[[-.52,.82,-.23],[-.53,2.47,-.23],[0,2.73,-.23],[.53,2.47,-.23],[.52,.82,-.23]],.045,gold);
 cube(root,wood,[0,.87,0],[1.12,.12,.85]);ball(root,velvet,[0,.97,.01],[.53,.11,.37]);
 for(const s of [-1,1]) {
  for(const z of [-.3,.3]){mesh(root,cyl,wood,[s*.46,.43,z],[.057,.82,.057]);bead(root,gold,[s*.46,.075,z],[.085,.047,.085]);}
  cube(root,wood,[s*.53,1.21,.02],[.12,.1,.88]);tube(root,[[s*.5,.91,.3],[s*.57,1.16,.3],[s*.54,1.22,-.27]],.043,gold);
  bead(root,gold,[s*.52,1.22,.43],[.089,.075,.094]);
 }
 for(const x of [-.24,0,.24])for(const y of [1.3,1.65,2.0,2.35])bead(root,gold,[x,y,-.211],[.017,.017,.015]);
}
function humanoid(type) {
 const root=new THREE.Group();root.name=type;root.userData.archetype=type;
 const skin={king:'#e9c29f',geographer:'#e1b99b',businessman:'#d7b29b',drunkard:'#d3ab94',pilot:'#e4bf9c',conceited:'#edc4a4',lamplighter:'#ddb793'}[type]||'#e4be9a';
 const cloth={king:'#653549',geographer:'#9a977b',businessman:'#2c3443',drunkard:'#76624d',pilot:'#79513a',conceited:'#a93843',lamplighter:'#4b6670'}[type]||'#687786';
 const seated=type==='king'||type==='drunkard',headY=type==='king'?2.4:type==='drunkard'?1.73:2.39;
 const body=new THREE.Group();body.name=`${type}-body`;root.add(body);
 if(type==='drunkard')body.position.y=-.64;
 lathe(body,[[.29,0],[.34,.1],[.36,.38],[.33,.72],[.26,.89],[.145,.96]],cloth,[0,1.0,0]);
 ball(body,skin,[0,2.03,0],[.125,.15,.12]);
 const {head,hairColor}=adultFace(root,headY,skin,type);sweptHair(head,hairColor,type);
 torsoDetails(body,type,cloth);
 const arms=[],base=[];
 for(const s of [-1,1]) {
  const arm=new THREE.Group();arm.name=`${type}-${s<0?'left':'right'}-arm`;arm.position.set(s*.31,1.85,0);body.add(arm);arms.push(arm);
  ball(arm,cloth,[s*.017,-.22,0],[.13,.25,.135]);
  const forearm=new THREE.Group();forearm.position.set(s*.025,-.41,0);arm.add(forearm);
  ball(forearm,cloth,[0,-.17,0],[.112,.195,.119]);
  const cuffColor=type==='conceited'?'#665081':type==='pilot'?'#d3bd9a':type==='king'?'#e8d3a8':cloth;
  mesh(forearm,cyl,cuffColor,[0,-.335,0],[.119,.09,.12]);hand(forearm,skin);
  if(type==='conceited') {
   for(const x of [-.063,.063])bead(forearm,'#dbb45e',[x,-.325,.115],[.018,.021,.01],{metalness:.5});
   arm.rotation.set(-.2,0,s*.6);forearm.rotation.set(-.8,0,-s*.73);
  }else if(type==='king'){arm.rotation.set(-.42,0,s*.34);forearm.rotation.x=-.82;}
  else if(type==='geographer'){
   arm.rotation.set(s<0?-.45:-.85,0,s*.17);forearm.rotation.x=s<0?-.55:-1.17;
  }else if(type==='businessman'){arm.rotation.set(-.62,0,s*.13);forearm.rotation.x=-.85;}
  else if(type==='drunkard'){arm.rotation.set(-.77,0,s*.24);forearm.rotation.x=-.35;}
  else {arm.rotation.set(-.04,0,s*.13);forearm.rotation.x=-.06;}
  base.push(arm.rotation.clone());
  const leg=new THREE.Group();leg.position.set(s*.175,seated?.99:1.06,0);root.add(leg);
  const trouser=type==='pilot'?'#a8a080':type==='conceited'?'#655080':type==='king'?'#eee0b9':type==='drunkard'?'#7f8263':cloth;
  if(seated) {
   ball(leg,trouser,[0,-.08,.245],[.16,.15,.31]);ball(leg,trouser,[0,-.45,.48],[.142,.35,.15]);
   ball(leg,'#604a36',[0,-.83,.56],[.15,.11,.25]);cube(leg,'#3f352e',[0,-.92,.59],[.27,.045,.4]);
   if(type==='drunkard')leg.rotation.z=s*-.18;
  }else {
   ball(leg,trouser,[0,-.39,0],[.146,.43,.15]);ball(leg,'#584535',[0,-.88,.06],[.151,.13,.225]);cube(leg,'#352e2a',[0,-.985,.08],[.28,.05,.36]);
   if(type==='pilot') {
    ball(leg,'#6b4d37',[0,-.69,.003],[.15,.24,.16]);mesh(leg,cyl,'#b49770',[0,-.51,0],[.161,.075,.16]);
    for(let i=0;i<4;i++)tube(leg,[[-.07,-.57-i*.065,.146],[.065,-.605-i*.065,.153]],.008,'#c8b18b');
   }
   if(type==='conceited')tube(leg,[[0,-.07,.15],[0,-.4,.15],[0,-.78,.12]],.022,'#d3ad54');
  }
 }
 if(type==='king') {
  throne(root);
  const cloak=new THREE.Group();body.add(cloak);
  for(const s of [-1,1]) {
   panel(cloak,[[s*.2,1.97],[s*.48,1.76],[s*.8,.24],[s*.69,.13],[s*.37,.32],[s*.28,1.63]],'#75354e',-.05);
   const edge=[[s*.23,1.98,.285],[s*.4,1.64,.305],[s*.57,.96,.345],[s*.77,.24,.26]];
   tube(cloak,edge,.075,'#ece2cc');
   for(let i=0;i<7;i++)bead(cloak,'#554338',[s*(.3+i*.073),1.82-i*.255,.334],[.019,.034,.015]);
   for(let i=0;i<4;i++)tube(root,[[s*(.09+i*.043),.95,.27],[s*(.09+i*.043),.61,.618],[s*(.09+i*.043),.24,.615]],.012,'#b59b6b');
  }
  mesh(head,new THREE.CylinderGeometry(.365,.39,.165,32),'#d5ab4f',[0,.55,0],undefined,{metalness:.6,roughness:.27});
  for(let i=0;i<8;i++) {
   const a=i/8*Math.PI*2;
   mesh(head,cone,'#e6bf62',[Math.cos(a)*.36,.73,Math.sin(a)*.36],[.07,.31,.065],{metalness:.55,roughness:.28});
   bead(head,'#eed6a2',[Math.cos(a)*.36,.884,Math.sin(a)*.36],[.039,.039,.039],{metalness:.5,roughness:.25});
   bead(head,i%2?'#376d69':'#922d42',[Math.cos(a)*.394,.54,Math.sin(a)*.394],[.026,.033,.025],{metalness:.2,roughness:.2});
  }
  tube(root,[[-.67,.15,.1],[-.67,1.3,.1],[-.67,2.06,.1]],.035,'#c6a055');bead(root,'#ecd295',[-.67,2.15,.1],[.095,.12,.095],{metalness:.5});
 }else if(type==='conceited') {
  for(const s of [-1,1]) {
   panel(body,[[s*.05,1.25],[s*.36,1.26],[s*.63,.55],[s*.93,.65],[s*.71,.34],[s*.28,.39]],'#a83a45',-.04);
   tube(body,[[s*.08,1.24,.025],[s*.34,.76,.02],[s*.69,.42,.02],[s*.88,.62,.02]],.015,'#dfb961');
   for(let i=0;i<3;i++)ball(body,'#f4e8d5',[s*(.045+i*.078),1.84-i*.045,.365],[.05,.105,.033]);
   lock(head,[[s*.015,-.14,.406],[s*.16,-.2,.404],[s*.26,-.16,.346],[s*.23,-.085,.328]],.019,'#3d3344');
  }
  const brim=mesh(head,cyl,'#4b3165',[0,.46,-.015],[.57,.07,.48]);brim.rotation.z=-.1;
  ball(head,'#6d477c',[0,.61,-.025],[.435,.25,.36]);
  tube(head,[[-.39,.5,.03],[-.2,.43,.326],[.24,.46,.3],[.42,.55,.04]],.034,'#c89b4d');
  const feather=new THREE.Group();feather.position.set(.39,.59,-.09);head.add(feather);feather.rotation.z=-.38;
  lock(feather,[[0,0,0],[.22,.4,0],[.11,.77,-.02],[-.16,.99,0]],.085,'#efc35e');
  tube(feather,[[0,0,.026],[.13,.48,.065],[-.1,.91,.03]],.011,'#fff0b5');
 }else if(type==='geographer'||type==='businessman') {
  glasses(head,type==='geographer'?'#b18b43':'#9a9485');
  if(type==='geographer') {
   const book=new THREE.Group();book.position.set(-.37,1.34,.62);book.rotation.set(-.22,.1,-.12);body.add(book);
   cube(book,'#4b655f',[0,0,0],[.24,.32,.055]);cube(book,'#e6d6aa',[0,0,.025],[.21,.28,.026]);
   cube(book,'#c1a16a',[-.095,0,.04],[.012,.29,.01]);
  }else {
   tube(body,[[.05,1.48,.373],[.16,1.3,.362],[.26,1.48,.338]],.008,'#b8a46d');
  }
 }else if(type==='pilot') {
  ball(head,'#654b38',[0,.345,-.065],[.418,.22,.348]);
  for(const s of [-1,1]) {
   ball(head,'#755540',[s*.363,.06,-.07],[.081,.22,.17]);
   mesh(head,new THREE.TorusGeometry(.098,.023,8,28),'#c8b997',[s*.132,.345,.278],undefined,{metalness:.65,roughness:.3});
   bead(head,'#52717b',[s*.132,.345,.271],[.083,.074,.022],{metalness:.18,roughness:.13});
  }
  tube(head,[[-.25,.365,.227],[0,.39,.269],[.25,.365,.227]],.024,'#aa8c63');
  const scarf=mesh(body,new THREE.TorusGeometry(.16,.057,8,28),'#ede3c6',[0,2.03,0]);scarf.rotation.x=Math.PI/2;
  cube(body,'#e3d7b9',[-.12,1.73,.361],[.15,.52,.055]);
  for(let i=0;i<6;i++)tube(body,[[-.18+i*.021,1.5,.372],[-.18+i*.021,1.41,.371]],.007,'#d7c9a9');
 }else if(type==='lamplighter') {
  ball(head,'#53636a',[0,.395,-.04],[.415,.16,.34]);
  const visor=ball(head,'#31474e',[0,.315,.28],[.36,.035,.17]);visor.rotation.x=.16;
  const scarf=mesh(body,new THREE.TorusGeometry(.151,.035,8,24),'#926348',[0,2.022,0]);scarf.rotation.x=Math.PI/2;
 }else if(type==='drunkard') {
  head.rotation.z=.1;head.rotation.x=.11;
  ball(head,'#665541',[-.075,.389,-.045],[.39,.12,.335]).rotation.z=.23;
  for(const s of [-1,1])tube(body,[[s*.19,1.61,.302],[s*.29,1.52,.259],[s*.19,1.45,.31]],.008,'#ab9574');
  const bottle=new THREE.Group();bottle.position.set(.41,.17,.68);bottle.rotation.z=-.12;root.add(bottle);bottleProp(bottle);
 }
 const headBase=head.rotation.clone();
 return {root,animate({elapsed=0}={}){
  const sway=Math.sin(elapsed*(type==='drunkard'?.63:1.2));
  body.rotation.z=sway*(type==='drunkard'?.018:.007);
  head.rotation.x=headBase.x+Math.sin(elapsed*.75)*(type==='geographer'?.025:.013);
  head.rotation.z=headBase.z+Math.sin(elapsed*.6)*.009;
  arms.forEach((arm,i)=>{
   arm.rotation.copy(base[i]);arm.rotation.x+=Math.sin(elapsed*(type==='businessman'?2.1:.9)+i)*.012*(elapsed===0?0:1);
  });
 }};
}
function fox() {
 const root=new THREE.Group();root.name='fox';root.userData.archetype='fox';
 ball(root,'#c67a3b',[0,.6,-.15],[.36,.43,.67]);
 ball(root,'#eedbb7',[0,.66,.34],[.285,.41,.22]);
 const head=new THREE.Group();head.name='fox-head';head.position.set(0,1.18,.4);root.add(head);
 ball(head,'#db8d43',[0,.035,0],[.365,.34,.32]);
 ball(head,'#eab36e',[0,.16,.18],[.13,.2,.14]);
 for(const s of [-1,1]) {
  const cheek=ball(head,'#f0dfc3',[s*.225,-.13,.165],[.18,.16,.19]);cheek.rotation.z=-s*.25;
  ball(head,'#eddbbc',[s*.085,-.11,.32],[.12,.105,.2]);
  const eye=ball(head,'#342922',[s*.156,.09,.276],[.069,.085,.025],{roughness:.18});eye.rotation.z=s*-.14;
  bead(head,'#b97835',[s*.153,.081,.295],[.041,.055,.012],{roughness:.22});
  bead(head,'#251f1b',[s*.152,.085,.308],[.022,.038,.008],{roughness:.1});
  bead(head,'#fff0d4',[s*.155-.018,.113,.313],[.012,.015,.004]);
  tube(head,[[s*.224,.147,.236],[s*.16,.184,.257],[s*.109,.139,.3]],.012,'#965a2e');
  const ear=mesh(head,cone,'#cb7e3d',[s*.26,.445,-.075],[.168,.47,.105]);ear.rotation.z=s*-.22;
  const inner=mesh(head,cone,'#ddbf94',[s*.268,.447,-.002],[.1,.3,.03]);inner.rotation.z=s*-.22;
  lock(head,[[s*.28,-.04,.1],[s*.35,-.09,.11],[s*.43,-.038,.05]],.035,'#d9914b');
  for(const z of [-.47,.3]) {
   ball(root,'#b96f36',[s*.23,.29,z],[.102,.29,.115]);
   ball(root,'#554031',[s*.24,.065,z+.035],[.105,.068,.145]);
   for(let i=0;i<2;i++)tube(root,[[s*.24-.032+i*.05,.088,z+.133],[s*.24-.032+i*.05,.054,z+.16]],.005,'#936b43');
  }
 }
 ball(head,'#392b23',[0,-.066,.502],[.067,.051,.042],{roughness:.27});
 tube(head,[[-.135,-.169,.356],[0,-.188,.42],[.135,-.169,.356]],.008,'#795244');
 const tail=new THREE.Group();root.add(tail);tail.position.set(0,.57,-.63);
 lock(tail,[[0,0,0],[.19,.02,-.26],[.61,.16,-.49],[.94,.43,-.51]],.31,'#ce8341');
 lock(tail,[[.76,.3,-.51],[1.0,.5,-.5],[1.06,.78,-.42],[.96,.97,-.35]],.23,'#eee0c4');
 for(let i=0;i<4;i++)lock(root,[[(-.13+i*.085),.82,.51],[(-.13+i*.085),.63,.552],[(-.13+i*.085)*.68,.43,.52]],.022,'#f3e4ca');
 return {root,animate({elapsed=0}={}){tail.rotation.y=Math.sin(elapsed*1.35)*.105;head.rotation.z=Math.sin(elapsed*.87)*.023;}};
}
function sheep() {
 const root=new THREE.Group();ball(root,'#e5dbc8',[0,.73,0],[.49,.45,.65]);
 for(let i=0;i<44;i++) {
  const y=1-2*(i+.5)/44,a=i*2.39996,r=Math.sqrt(1-y*y);
  bead(root,i%3?'#f3e8d4':'#d9d0bc',[r*Math.cos(a)*.44,.73+y*.4,r*Math.sin(a)*.61],[.145,.15,.15]);
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
 return {root,animate({elapsed=0}={}){root.rotation.z=Math.sin(elapsed*1.6)*.012;}};
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
 return {root,animate({elapsed=0}={}){bloom.rotation.y=Math.sin(elapsed*.75)*.08;}};
}
function snake() {
 const root=new THREE.Group();
 tube(root,[[.48,.08,-.27],[-.35,.08,-.44],[-.59,.12,.17],[.12,.16,.45],[.49,.2,.14],[.18,.53,.09],[.05,.91,.11]],.14,'#b8a264');
 ball(root,'#c7b574',[.05,1.04,.18],[.2,.17,.22]);
 for(const s of [-1,1]) {
  ball(root,'#3b4140',[.05+s*.14,1.07,.31],[.037,.048,.023]);
  ball(root,'#f2cc6e',[.05+s*.14,1.085,.325],[.01,.016,.006]);
 }
 return {root,animate({elapsed=0,bite=0}={}){root.rotation.y=Math.sin(elapsed)*.07;root.rotation.x=bite*Math.sin(elapsed*15)*.22;}};
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
 const c=type==='prince'?createPrince():type==='fox'?fox():type==='rose'?rose():type==='sheep'?sheep():type==='snake'?snake():humanoid(type);
 batchShapes(c.root);return c;
}

function bottleProp(root) {
 lathe(root,[[.075,0],[.11,.055],[.11,.3],[.09,.35],[.041,.41],[.041,.55]],'#526e5d');
 mesh(root,cyl,'#ccb78f',[0,.17,0],[.112,.14,.112]);
 mesh(root,cyl,'#c7c0a4',[0,.5,0],[.049,.025,.049],{metalness:.4,roughness:.4});
 mesh(root,cyl,'#7f6041',[0,.56,0],[.037,.033,.037]);
}
function bookProp(root,color,x,y,z,width=.34,depth=.26) {
 cube(root,color,[x,y,z],[width,.025,depth]);cube(root,'#d5c6a0',[x,y+.047,z],[width-.035,.075,depth-.022]);
 cube(root,color,[x,y+.09,z],[width,.023,depth]);cube(root,color,[x-width*.47,y+.045,z],[.035,.09,depth]);
 for(let i=0;i<3;i++)cube(root,'#b5a584',[x,y+.025+i*.022,z+depth*.49],[width*.86,.003,.003]);
 cube(root,'#caa563',[x-width*.49,y+.047,z],[.008,.046,depth*.62]);
}
function desk(root,color) {
 cube(root,color,[0,1.04,0],[1.68,.115,.79]);cube(root,'#b69362',[0,1.101,0],[1.76,.018,.83]);
 cube(root,'#614633',[0,.88,.25],[1.4,.19,.07]);
 for(const x of [-.6,.6])for(const z of [-.25,.25]) {
  lathe(root,[[.076,0],[.085,.045],[.063,.12],[.045,.17],[.045,.62],[.075,.66],[.058,.78],[.073,.86]],color,[x,.06,z]);
  mesh(root,cyl,'#a37c4b',[x,.12,z],[.089,.035,.089]);mesh(root,cyl,'#a37c4b',[x,.74,z],[.079,.041,.079]);
 }
 for(const x of [-.4,.4]) {
  cube(root,'#503b30',[x,.89,.294],[.63,.15,.025]);cube(root,color,[x,.893,.311],[.6,.115,.025]);
  bead(root,'#d1ac66',[x,.897,.333],[.025,.02,.021],{metalness:.5,roughness:.32});
 }
}

export function createProp(type) {
 const root=new THREE.Group();
 if(type==='lamplighter') {
  const iron=material('#3c494b',{metalness:.58,roughness:.4}),brass=material('#b49352',{metalness:.62,roughness:.35});
  cube(root,'#aaa087',[0,.05,0],[.48,.1,.48]);
  lathe(root,[[.19,0],[.22,.04],[.18,.14],[.12,.2],[.1,.4],[.071,.5],[.058,1.96],[.105,2.04],[.15,2.1]],iron,[0,.1,0]);
  for(let i=0;i<7;i++) {const a=i/7*Math.PI*2; tube(root,[[Math.cos(a)*.074,.57,Math.sin(a)*.074],[Math.cos(a)*.058,1.83,Math.sin(a)*.058]],.006,brass);}
  mesh(root,new THREE.CylinderGeometry(.25,.2,.61,8),'#f8dfaa',[0,2.52,0],undefined,{emissive:'#f8c876',emissiveIntensity:.72,roughness:.29});
  for(let i=0;i<8;i++) {
   const a=i/8*Math.PI*2;
   tube(root,[[Math.cos(a)*.205,2.21,Math.sin(a)*.205],[Math.cos(a)*.25,2.83,Math.sin(a)*.25]],.018,iron);
  }
  lathe(root,[[.19,0],[.23,.025],[.23,.09],[.3,.105],[.3,.15],[.25,.2],[.12,.36],[0,.39]],iron,[0,2.8,0]);
  mesh(root,cyl,brass,[0,2.195,0],[.255,.047,.255]);bead(root,brass,[0,3.23,0],[.063,.08,.063]);
  for(const s of [-1,1])tube(root,[[s*.07,1.95,0],[s*.22,2.04,0],[s*.18,2.17,0],[s*.09,2.09,0]],.018,iron);
 }else if(['businessman','geographer'].includes(type)) {
  desk(root,type==='geographer'?'#806044':'#635040');
  const ledger=new THREE.Group();ledger.position.set(-.07,1.12,.05);ledger.rotation.y=-.14;root.add(ledger);
  cube(ledger,'#5f6248',[0,0,0],[.68,.025,.43]);
  for(const s of [-1,1]) {
   const page=cube(ledger,'#ece1c0',[s*.162,.024,0],[.318,.019,.41]);page.rotation.z=s*-.022;
   for(let i=0;i<6;i++)cube(ledger,type==='geographer'?'#8c8c6d':'#9c987c',[s*.17,.035,-.14+i*.053],[.237,.002,.003]);
  }
  tube(root,[[.21,1.18,.11],[.22,1.2,-.035],[.25,1.225,-.19]],.009,'#474536');
  bead(root,'#434d4b',[-.56,1.163,-.19],[.055,.055,.055]);mesh(root,cyl,'#b29a60',[-.56,1.195,-.19],[.028,.035,.028]);
  if(type==='geographer') {
   const globe=new THREE.Group();globe.position.set(.58,1.16,-.075);root.add(globe);
   const brass=material('#bc9959',{metalness:.47,roughness:.36});
   lathe(globe,[[.12,0],[.13,.025],[.09,.055],[.035,.1],[.035,.15]],brass);
   ball(globe,'#d4c28e',[0,.38,0],[.23,.23,.23]);
   const ring=mesh(globe,new THREE.TorusGeometry(.255,.013,7,48),brass,[0,.38,0]);ring.rotation.z=.29;
   for(let i=-1;i<=1;i++) {
    const y=i*.09,r=Math.sqrt(.23*.23-y*y),line=mesh(globe,new THREE.TorusGeometry(r,.0035,4,36),'#7c8b7f',[0,.38+y,0]);line.rotation.x=Math.PI/2;
   }
   for(let i=0;i<3;i++){const line=mesh(globe,new THREE.TorusGeometry(.232,.0035,4,36),'#7c8b7f',[0,.38,0]);line.rotation.y=i*Math.PI/3;}
   for(let i=0;i<3;i++)bookProp(root,['#526d69','#856344','#6a6b48'][i],-.58,1.13+i*.12,.045,.32,.32);
   const chart=new THREE.Group();chart.position.set(.15,1.135,.17);root.add(chart);
   cube(chart,'#dacb9f',[0,0,.2],[.59,.013,.44]);cube(chart,'#dacb9f',[0,-.255,.427],[.59,.51,.013]);
   for(let i=0;i<4;i++) {
    cube(chart,'#9f9675',[-.24+i*.16,-.23,.436],[.004,.43,.004]);
    cube(chart,'#9f9675',[0,-.07-i*.12,.436],[.5,.004,.004]);
   }
   const compass=mesh(chart,new THREE.TorusGeometry(.072,.005,5,28),'#847e5f',[-.14,-.34,.438]);
   tube(chart,[[-.14,-.25,.438],[-.14,-.42,.438]],.004,'#847e5f');
   tube(chart,[[-.22,-.34,.438],[-.06,-.34,.438]],.004,'#847e5f');
  }else {
   const gold=material('#d3b268',{metalness:.66,roughness:.29});
   for(let k=0;k<4;k++)for(let i=0;i<4+k*2;i++) {
    mesh(root,cyl,k%2?'#a7aba5':gold,[-.62+k*.15,1.14+i*.024,.06],[.052,.021,.052]);
   }
   for(let i=0;i<3;i++)bookProp(root,'#3f555a',.51,1.135+i*.103,.03,.29,.32);
   for(let i=0;i<3;i++) {
    const star=mesh(root,new THREE.OctahedronGeometry(.038),gold,[-.16+i*.105,1.18,-.18]);star.scale.y=.3;
   }
   const abacus=new THREE.Group();root.add(abacus);abacus.position.set(.47,1.145,-.25);
   cube(abacus,'#68533e',[0,.06,0],[.35,.12,.026]);
   for(let row=0;row<3;row++) {
    tube(abacus,[[-.17,.022+row*.033,.023],[.17,.022+row*.033,.023]],.005,'#c4aa6e');
    for(let i=0;i<5;i++)bead(abacus,row%2?'#c39b5e':'#4a5653',[-.13+i*.05,.022+row*.033,.027],[.014,.014,.012]);
   }
  }
 }else if(type==='drunkard') {
  cube(root,'#806545',[0,.21,0],[.83,.42,.53]);
  for(let i=0;i<4;i++) {
   cube(root,'#9e8056',[-.32+i*.215,.21,.276],[.193,.365,.024]);
   for(const y of [.058,.356])bead(root,'#5b5949',[-.32+i*.215,y,.294],[.012,.012,.006]);
  }
  for(const x of [-.35,.35])cube(root,'#574b37',[x,.23,.3],[.043,.44,.035]);
  const bottle=new THREE.Group();bottle.position.set(.59,0,.2);root.add(bottle);bottleProp(bottle);
  const fallen=new THREE.Group();fallen.position.set(-.58,.11,.14);fallen.rotation.z=1.31;root.add(fallen);bottleProp(fallen);
  mesh(root,cyl,'#b8ab8e',[.72,.105,-.16],[.086,.21,.086]);
 }else if(type==='pilot') {
  const body=lathe(root,[[.04,-1.18],[.1,-.9],[.19,-.2],[.255,.43],[.23,.85],[.16,1.01]],'#b1b1a4');body.rotation.x=Math.PI/2;body.position.y=.69;
  const paint=material('#ccc4a8',{metalness:.22,roughness:.55});
  for(const y of [.55,1.07]) {
   cube(root,paint,[0,y,.14],[2.87,.065,.56]);
   for(const s of [-1,1])ball(root,paint,[s*1.42,y,.14],[.11,.035,.279]);
   for(let i=-6;i<=6;i++)cube(root,'#a9a187',[i*.205,y+.037,.14],[.007,.003,.47]);
  }
  for(const s of [-1,1]) {
   for(const z of [-.055,.35])tube(root,[[s*1.1,.57,z],[s*.92,1.06,z]],.02,'#6e6250');
   tube(root,[[s*.49,.39,.44],[s*.32,.61,.33]],.034,'#665d4f');
   const wheel=mesh(root,cyl,'#3c3e38',[s*.47,.29,.43],[.135,.067,.135]);wheel.rotation.z=Math.PI/2;
   const hub=mesh(root,cyl,'#bda579',[s*.507,.29,.43],[.061,.071,.061]);hub.rotation.z=Math.PI/2;
  }
  ball(root,'#453f31',[0,.82,.055],[.16,.065,.2]);
  cube(root,paint,[0,.75,-.95],[.82,.04,.34]);ball(root,paint,[0,.92,-1.02],[.042,.25,.2]);
  mesh(root,new THREE.CylinderGeometry(.17,.2,.16,24),'#7a786a',[0,.69,1.04]).rotation.x=Math.PI/2;
  const propeller=new THREE.Group();propeller.position.set(0,.69,1.155);root.add(propeller);propeller.rotation.z=.25;
  for(const s of [-1,1]){const blade=ball(propeller,'#786249',[s*.25,0,0],[.3,.058,.026]);blade.rotation.z=s*.06;}
  bead(propeller,'#d1bc89',[0,0,.035],[.065,.065,.057],{metalness:.5,roughness:.3});
 }
 root.name=`${type}-prop`;
 return root;
}
