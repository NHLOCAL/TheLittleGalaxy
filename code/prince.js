import * as THREE from '../assets/vendor/three.module.js';
import {material,fabric,mesh,ball,cube,tube,lathe,lock,panel} from './sculpt.js';

const gold=material('#d8ad50',{metalness:.68,roughness:.29});
const leather=material('#755138',{roughness:.57});
const skin=material('#efc49e',{roughness:.59,clearcoat:.025});
const green=fabric('#4c986f');
const greenDark=fabric('#367959');
const greenLight=fabric('#75aa79');
const yellow=fabric('#f2c85e',{side:THREE.DoubleSide,sheen:.5});
const ivory=fabric('#e9dbb8');

function sculptFace(head) {
 const eyes=[];
 const geometry=new THREE.SphereGeometry(1,48,36),positions=geometry.attributes.position,colors=[];
 const base=new THREE.Color('#f4d0ab'),blush=new THREE.Color('#e5aa90');
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const jaw=y<-.1?1-(Math.max(0,-y-.1))*.14:1;
  const cheek=1+.045*Math.exp(-(((y+.22)/.3)**2));
  positions.setXYZ(i,x*.49*jaw*cheek,y*.565,z*.433);
  const blushAmount=z>0?Math.exp(-(((Math.abs(x)-.64)/.22)**2)-((y+.15)/.22)**2)*.55:0;
  const color=base.clone().lerp(blush,blushAmount);colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 mesh(head,geometry,material('#ffffff',{vertexColors:true,roughness:.58,clearcoat:.025}));
 for(const side of [-1,1]){
  const ear=ball(head,skin,[side*.475,-.04,-.025],[.115,.157,.095]);ear.rotation.z=side*.13;
  ball(head,'#dfae8b',[side*.502,-.047,.054],[.06,.099,.027]);
  tube(head,[[side*.509,.052,.064],[side*.54,-.011,.068],[side*.504,-.099,.063]],.012,'#f1c9a4',12);
  // Convex eyes, warm irises, a small wet lower rim and paired catchlights.
  const eye=new THREE.Group();eye.name=side<0?'left-eye':'right-eye';head.add(eye);eyes.push(eye);
  ball(eye,'#fbf4e8',[side*.182,.076,.393],[.128,.149,.066],{roughness:.29});
  ball(eye,'#355e57',[side*.175,.069,.453],[.091,.109,.03],{roughness:.24,clearcoat:.5});
  ball(eye,'#162f32',[side*.173,.072,.474],[.07,.086,.019],{roughness:.18,clearcoat:.7});
  ball(eye,'#fff8e9',[side*.173-.028,.105,.493],[.026,.03,.009],{roughness:.14});
  ball(eye,'#9ebbb6',[side*.173+.029,.027,.494],[.009,.011,.005],{roughness:.2});
  tube(head,[[side*.32,.093,.417],[side*.281,.203,.411],[side*.166,.239,.397],[side*.063,.149,.435]],.016,'#d0a184',18);
  tube(head,[[side*.306,.006,.428],[side*.19,-.073,.451],[side*.086,-.005,.451]],.008,'#e8bfa1',16);
  tube(head,[[side*.307,.275,.333],[side*.199,.302,.387],[side*.096,.27,.37]],.017,'#a77638',18);
 }
 ball(head,skin,[0,-.075,.45],[.074,.082,.072]);
 ball(head,'#edbb9a',[0,-.11,.475],[.062,.042,.048]);
 tube(head,[[-.142,-.235,.367],[-.072,-.258,.414],[.028,-.262,.424],[.124,-.232,.38]],.011,'#a56e5f',20);
 tube(head,[[-.069,-.278,.395],[.007,-.284,.414],[.067,-.273,.398]],.009,'#edbd9d',16);
 return eyes;
}

function goldenHair(head) {
 const cap=new THREE.SphereGeometry(1,48,28,0,Math.PI*2,0,Math.PI*.43);
 mesh(head,cap,material('#d9a442',{roughness:.48}),[0,.115,-.047],[.518,.555,.464]);
 const shades=['#e7b34b','#f2c65f','#d89b37','#edba51','#f5d078'];
 // A deliberately asymmetrical, windswept crown with sweeping locks and fine grooves.
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2;
  const x=Math.cos(a)*.425,z=Math.sin(a)*.365;
  const path=[[x,.245,z-.03],[x*.92-.055,.45,z*.86-.04],[x*.6+.065,.61,z*.64-.06],[x*.3+.205,.681-(i%3)*.035,z*.46-.08],[x*.12+.32,.624-(i%3)*.025,z*.25-.11]];
  lock(head,path,.137-(i%3)*.009,.072,material(shades[i%shades.length],{roughness:.48}));
 }
 const fringe=[
  [[-.36,.3,.285],[-.28,.465,.36],[-.06,.49,.414],[.18,.389,.444],[.32,.43,.35]],
  [[-.41,.32,.203],[-.46,.2,.321],[-.41,.029,.351],[-.3,-.07,.351]],
  [[-.14,.465,.29],[.055,.598,.289],[.26,.58,.3],[.44,.54,.24]],
  [[.36,.38,.185],[.44,.28,.186],[.445,.053,.125],[.415,-.07,.103]]
 ];
 fringe.forEach((path,i)=>{
  lock(head,path,i===0?.11:.08,.058,material(shades[(i+1)%5],{roughness:.48}));
 });
}

function hand(parent,side) {
 const palm=new THREE.Group();palm.position.set(0,-.235,.015);palm.rotation.z=side*-.06;parent.add(palm);
 ball(palm,skin,[0,-.063,0],[.094,.121,.056]);
 for(let finger=0;finger<4;finger++){
  const x=(finger-1.5)*.041;
  const length=[.118,.155,.145,.105][finger];
  const digit=ball(palm,skin,[x,-.153-length*.22,.018],[.022,length*.52,.026]);digit.rotation.z=(finger-1.5)*-.075;
 }
 const thumb=ball(palm,skin,[side*-.098,-.066,.03],[.038,.081,.038]);thumb.rotation.z=side*-.45;
 return palm;
}

function scarf(body) {
 const collar=mesh(body,new THREE.TorusGeometry(.183,.087,14,48),yellow,[0,2.055,0]);collar.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){
  const fold=mesh(body,new THREE.TorusGeometry(.202+i*.009,.009,8,48),'#dcb250',[0,2.027+i*.028,0]);fold.rotation.x=Math.PI/2;
 }
 const knot=ball(body,yellow,[-.145,2.01,.134],[.095,.122,.085]);knot.rotation.z=-.25;
 const rows=38,columns=6,positions=[],uvs=[],indices=[];
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  positions.push(0,0,0);uvs.push(col/columns,row/rows);
  if(row<rows&&col<columns){const k=row*(columns+1)+col;indices.push(k,k+1,k+columns+1,k+1,k+columns+2,k+columns+1);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
 const tail=mesh(body,geometry,yellow);tail.name='scarf-tail';tail.userData.dynamic=true;tail.frustumCulled=false;
 const edgeGeometry=new THREE.BufferGeometry();edgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((rows+1)*2*3),3));
 const edgeIndices=[];for(let row=0;row<rows;row++)edgeIndices.push(row*2,(row+1)*2,row*2+1,(row+1)*2+1);edgeGeometry.setIndex(edgeIndices);
 const hems=new THREE.LineSegments(edgeGeometry,new THREE.LineBasicMaterial({color:'#e0ac45'}));body.add(hems);
 return (elapsed,flight)=>{
  const p=geometry.attributes.position,edge=edgeGeometry.attributes.position;
  for(let row=0;row<=rows;row++){
   const t=row/rows;
   const x=-.15-t*(1.1-flight*.5)+Math.sin(elapsed*2.35-t*5.6)*t*.065;
   const y=2.03+Math.sin(t*3.3-elapsed*3.1)*t*(.11+flight*.115)+Math.sin(t*Math.PI)*.105;
   const z=-.09-t*(.44+flight*.95)+Math.sin(elapsed*2.4-t*4.6)*t*.09;
   const width=(.145+Math.sin(t*Math.PI)*.028)*(1-.13*t);
   for(let col=0;col<=columns;col++){
    const across=col/columns*2-1;
    const twist=elapsed*1.5-t*3.2;
    const k=row*(columns+1)+col;
    p.setXYZ(k,x+across*width*.24,y+across*width*Math.sin(twist)*.6,z+across*width*Math.cos(twist));
   }
   const a=row*(columns+1),b=a+columns;
   for(const [index,vertex] of [[row*2,a],[row*2+1,b]])edge.setXYZ(index,p.getX(vertex),p.getY(vertex),p.getZ(vertex));
  }
  p.needsUpdate=true;edge.needsUpdate=true;geometry.computeVertexNormals();
 };
}

export function createPrince() {
 const root=new THREE.Group();root.name='little-prince';
 const body=new THREE.Group();body.name='prince-body';root.add(body);
 const tunic=lathe(body,[[.438,0],[.444,.035],[.424,.2],[.385,.39],[.347,.56],[.368,.9],[.358,1.15],[.306,1.27],[.173,1.35]],green,[0,.67,0]);
 tunic.scale.z=.82;
 ball(body,skin,[0,2.095,0],[.133,.19,.121]);
 const shirt=panel(body,[[-.165,1.92],[0,1.73],[.163,1.92],[.098,2.005],[-.104,2.005]],ivory);shirt.position.z=.267;
 for(const side of [-1,1]){
  const lapel=panel(body,[[side*.105,2.02],[side*.32,1.91],[side*.205,1.61],[side*.085,1.83]],greenLight);lapel.position.z=.284;
  tube(body,[[side*.107,2.018,.314],[side*.315,1.91,.307],[side*.205,1.625,.313]],.006,'#a4bd82');
  const pocket=panel(body,[[side*.145,1.35],[side*.325,1.35],[side*.325,1.245],[side*.16,1.22]],greenDark,.01);pocket.position.z=.302;
  tube(body,[[side*.155,1.345,.329],[side*.32,1.345,.327]],.005,'#a8b991');
 }
 for(let i=0;i<4;i++)ball(body,gold,[-.061,1.695-i*.141,.338],[.026,.028,.013]);
 tube(body,[[.03,1.8,.3],[.03,1.55,.321],[.027,1.28,.334]],.007,'#3d7756');
 const coatTail=new THREE.Group();coatTail.name='coat-tail';coatTail.position.y=.94;body.add(coatTail);
 for(const side of [-1,1]){
  const flap=panel(coatTail,[[side*.035,.23],[side*.29,.22],[side*.315,-.245],[side*.04,-.26]],greenDark,.012);flap.position.z=-.29;
 }
 tube(body,[[-.29,.69,.259],[0,.681,.363],[.29,.69,.259]],.006,'#8eaf7c');
 const belt=lathe(body,[[.368,0],[.371,.082],[.368,.088]],leather,[0,1.16,0]);belt.scale.z=.86;
 for(const y of [1.17,1.229])tube(body,[[-.283,y,.228],[0,y,.327],[.283,y,.228]],.004,'#b78b50');
 const buckle=mesh(body,new THREE.TorusGeometry(.073,.015,10,32),gold,[0,1.202,.342]);buckle.scale.set(1.23,.8,.75);
 ball(body,gold,[0,1.202,.338],[.055,.036,.012]);
 const head=new THREE.Group();head.name='prince-head';head.position.y=2.51;body.add(head);const eyes=sculptFace(head);goldenHair(head);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.name=side<0?'left-shoulder':'right-shoulder';arm.position.set(side*.326,1.91,0);body.add(arm);
  const sleeve=lathe(arm,[[.145,0],[.153,.08],[.147,.29],[.13,.435]],green,[0,-.43,0]);sleeve.scale.z=.94;
  ball(arm,green,[0,-.05,0],[.148,.16,.143]);
  const elbow=new THREE.Group();elbow.position.y=-.409;arm.add(elbow);
  ball(elbow,green,[0,-.13,0],[.13,.217,.129]);
  lathe(elbow,[[.129,0],[.137,.018],[.136,.083],[.128,.096]],greenLight,[0,-.294,0]);
  tube(elbow,[[-.095,-.267,.101],[0,-.278,.136],[.095,-.267,.101]],.005,'#d9d4a2');
  ball(elbow,gold,[side*.103,-.254,.085],[.016,.018,.011]);hand(elbow,side);arms.push({arm,elbow});
  const thigh=new THREE.Group();thigh.name=side<0?'left-hip':'right-hip';thigh.position.set(side*.179,1.1,0);body.add(thigh);
  ball(thigh,green,[0,-.18,-.011],[.158,.263,.161]);
  tube(thigh,[[side*.126,-.07,.048],[side*.136,-.23,.059],[side*.108,-.39,.071]],.005,'#73996e');
  const knee=new THREE.Group();knee.name=side<0?'left-knee':'right-knee';knee.position.set(0,-.414,0);thigh.add(knee);
  ball(knee,green,[0,-.147,0],[.123,.212,.132]);
  lathe(knee,[[.144,0],[.148,.023],[.14,.13],[.121,.32]],leather,[0,-.465,0]);
  const boot=ball(knee,leather,[0,-.495,.08],[.143,.124,.249]);
  ball(knee,'#493929',[0,-.565,.083],[.147,.044,.25],{roughness:.82});
  tube(knee,[[-.089,-.45,.254],[0,-.475,.313],[.089,-.45,.254]],.006,'#ad7d46',14);
  cube(knee,gold,[side*.129,-.325,.015],[.025,.036,.077]);legs.push({thigh,knee});
 }
 const animateScarf=scarf(body);
 function animate({elapsed=0,flight=0,bank=0}={}) {
  const f=THREE.MathUtils.clamp(flight,0,1),wave=Math.sin(elapsed*2.1),breath=Math.sin(elapsed*1.7);
  arms.forEach(({arm,elbow},i)=>{
   const side=i?1:-1;
   arm.rotation.z=side*(.13+f*1.13)+wave*f*.035;
   arm.rotation.x=-.035-f*.33+Math.sin(elapsed*1.8+i)*.022;
   arm.rotation.y=side*f*.14;
   elbow.rotation.x=-.055-f*.19;
   elbow.rotation.z=side*f*.055;
  });
  legs.forEach(({thigh,knee},i)=>{
   const side=i?1:-1;
   thigh.rotation.x=-f*(.48+(i?.07:0)) + Math.sin(elapsed*1.7+i)*f*.025;
   thigh.rotation.z=side*f*.075;
   knee.rotation.x=.035+f*(.91+(i?.14:0))+Math.sin(elapsed*1.8+i)*f*.027;
  });
  body.rotation.z=-bank*.18+wave*f*.018;
  body.rotation.x=-f*.12;
  body.position.y=breath*(.012+f*.016);
  head.rotation.x=.015-f*.16+Math.sin(elapsed*1.23)*.012;
  head.rotation.y=Math.sin(elapsed*.72)*.04*(1-f);
  head.rotation.z=Math.sin(elapsed*.93)*.018;
  const blinkPhase=(elapsed+1.2)%5.7;
  const blink=blinkPhase<.17?Math.sin(blinkPhase/.17*Math.PI):0;
  eyes.forEach(eye=>eye.scale.y=1-blink*.94);
  coatTail.rotation.x=f*.13+Math.sin(elapsed*2.3)*f*.025;
  animateScarf(elapsed,f);
 }
 animate();return {root,animate};
}
