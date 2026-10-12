import * as THREE from '../assets/vendor/three.module.js';

const materials=new Map();
const sphere=new THREE.SphereGeometry(1,40,28);
const box=new THREE.BoxGeometry(1,1,1);
let weave;

export function material(color,options={}) {
 const key=color+JSON.stringify(options);
 if(!materials.has(key))materials.set(key,new THREE.MeshPhysicalMaterial({color,roughness:.64,...options}));
 return materials.get(key);
}

function fabricTexture() {
 if(weave)return weave;
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const grain=((x*73+y*139+x*y*19)%31)-15;
  const thread=Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2)*28;
  const value=Math.round(145+thread+grain);
  const k=(y*size+x)*4;data.set([value,value,value,255],k);
 }
 weave=new THREE.DataTexture(data,size,size);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;
 weave.repeat.set(5,5);weave.magFilter=THREE.LinearFilter;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.needsUpdate=true;return weave;
}

export function fabric(color,{roughness=.9,...options}={}) {
 const key='fabric'+color+JSON.stringify(options);
 if(!materials.has(key))materials.set(key,new THREE.MeshPhysicalMaterial({color,roughness,sheen:.32,sheenColor:new THREE.Color(color),bumpMap:fabricTexture(),bumpScale:.013,...options}));
 return materials.get(key);
}

export function mesh(parent,geometry,color,position=[0,0,0],scale=[1,1,1],options={}) {
 const object=new THREE.Mesh(geometry,typeof color==='string'?material(color,options):color);
 object.position.set(...position);object.scale.set(...scale);object.castShadow=object.receiveShadow=true;parent.add(object);return object;
}
export const ball=(parent,color,position,scale,options)=>mesh(parent,sphere,color,position,scale,options);
export const cube=(parent,color,position,scale)=>mesh(parent,box,color,position,scale);
export function tube(parent,points,radius,color,segments=24) {
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return mesh(parent,new THREE.TubeGeometry(path,segments,radius,8,false),color);
}
export function lathe(parent,profile,color,position=[0,0,0]) {
 return mesh(parent,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),48),color,position);
}

// Swept, elliptical locks taper to a fine tip, unlike overlapping round beads.
export function lock(parent,points,width,depth,color) {
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const segments=24,sides=10,frames=curve.computeFrenetFrames(segments,false);
 const positions=[],uvs=[],indices=[];
 for(let i=0;i<=segments;i++){
  const t=i/segments,center=curve.getPointAt(t);
  const taper=.025+.975*Math.sin(Math.PI*(.11+.89*t))**.65;
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2;
   const point=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*width*taper).addScaledVector(frames.binormals[i],Math.sin(a)*depth*taper);
   positions.push(point.x,point.y,point.z);uvs.push(j/sides,t);
   if(i<segments&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 return mesh(parent,geometry,color);
}

export function panel(parent,points,color,depth=.028) {
 const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.015,bevelThickness:.012});
 return mesh(parent,geometry,color);
}
