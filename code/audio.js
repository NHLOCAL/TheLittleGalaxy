export function createAudio() {
 let ctx=null,muted=true;
 function unlock(){try{ctx??=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume().catch(()=>{});}catch{ctx=null;}}
 function play(event) {
  if(muted||!ctx||ctx.state!=='running')return;
  const notes=event==='arrival'?[392,493.88,587.33]:event==='ending'?[293.66,392,493.88,587.33]:[523.25];
  notes.forEach((frequency,i)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=frequency;
   const t=ctx.currentTime+i*.11;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.045,t+.02);gain.gain.exponentialRampToValueAtTime(.001,t+.65);
   osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.7);
  });
 }
 return {unlock,play,setMuted(value){muted=value;},dispose(){ctx?.close();}};
}
