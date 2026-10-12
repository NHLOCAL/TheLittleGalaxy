const MAX_SPEED=6;

export function createFlightMotion() {
 const motion={x:0,z:0,speed:0,flight:0};
 function reset(){motion.x=motion.z=motion.speed=motion.flight=0;}
 function step(direction,dt,right={x:1,z:0},hover=false) {
  if(!Number.isFinite(dt)||dt<0||dt>.25){reset();return {x:0,z:0};}
  if(dt===0)return {x:0,z:0};
  const steering=Math.hypot(direction.x,direction.z)>0;
  const length=Math.hypot(right.x,right.z)||1,rx=right.x/length,rz=right.z/length;
  const targetX=MAX_SPEED*(direction.x*rx-direction.z*rz),targetZ=MAX_SPEED*(direction.x*rz+direction.z*rx);
  const response=steering?8:10,decay=Math.exp(-response*dt),ease=1-decay;
  // Integrate the easing curve, so input feels the same at different frame rates.
  const displacement={x:targetX*dt+(motion.x-targetX)*ease/response,z:targetZ*dt+(motion.z-targetZ)*ease/response};
  motion.x=targetX+(motion.x-targetX)*decay;motion.z=targetZ+(motion.z-targetZ)*decay;
  if(!steering&&Math.hypot(motion.x,motion.z)<.001)motion.x=motion.z=0;
  motion.speed=Math.min(1,Math.hypot(motion.x,motion.z)/MAX_SPEED);
  const flight=steering||motion.speed>.025?1:hover?.35:0;
  motion.flight+=(flight-motion.flight)*(1-Math.exp(-dt*7));
  return displacement;
 }
 return {motion,step,reset};
}
