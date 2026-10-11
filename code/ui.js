import { PLANETS, planetById } from './story.js';
import { canVisit } from './state.js';
const $=id=>document.getElementById(id);
const names={rose:'הוורד',king:'המלך',conceited:'האיש הגאה',drunkard:'השיכור',businessman:'איש העסקים',lamplighter:'מדליק הפנסים',geographer:'הגאוגרף',fox:'השועל',pilot:'הטייס',snake:'הנחש'};
export function createUI(state,actions) {
 const cleanup=[],mapButtons=[];let timer,last='',resetArmed=false;
 function bind(id,fn) {
  const el=$(id);const handler=e=>{fn(e);if(e.detail>0&&el.tagName==='BUTTON')el.blur();};el.addEventListener('click',handler);cleanup.push(()=>el.removeEventListener('click',handler));
 }
 function announce(text){$('announcer').textContent=text;}
 function toast(text){clearTimeout(timer);$('toast').textContent=text;$('toast').hidden=false;timer=setTimeout(()=>$('toast').hidden=true,3200);announce(text);}
 bind('start-story',()=>actions.start('story'));bind('start-free',()=>actions.start('free'));
 bind('mode-button',()=>{const next=state.mode==='free'?'story':'free';actions.setMode(next);toast(next==='free'?'כל הכוכבים פתוחים. פשוט לבחור ולטייל.':'חוזרים למסע שלך. ההתקדמות נשמרה.');});
 bind('previous-planet',()=>actions.navigate(-1));bind('next-planet',()=>actions.navigate(1));bind('interact',actions.interact);bind('next-line',actions.nextLine);bind('close-dialogue',actions.closeDialogue);
 bind('restart',actions.restart);bind('continue-free',actions.continueFree);
 bind('sound-button',()=>actions.setMuted(!state.settings.muted));
 bind('settings-button',()=>{const hidden=!$('settings').hidden;$('settings').hidden=hidden;$('settings-button').setAttribute('aria-expanded',String(!hidden));});
 const quality=()=>actions.setQuality($('quality').value);$('quality').addEventListener('change',quality);cleanup.push(()=>$('quality').removeEventListener('change',quality));
 const reduced=()=>actions.setReduced($('reduced-motion').checked);$('reduced-motion').addEventListener('change',reduced);cleanup.push(()=>$('reduced-motion').removeEventListener('change',reduced));
 bind('reset-progress',()=>{if(!resetArmed){resetArmed=true;$('reset-progress').textContent='לחצו שוב כדי לאפס';return;}actions.resetProgress();resetArmed=false;$('reset-progress').textContent='איפוס המסע הסיפורי';toast('המסע מתחיל מחדש.');});
 for(const p of PLANETS){
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','מעבר אל '+p.name);button.title=p.name;button.style.setProperty('--planet-color',p.color);button.dataset.planet=p.id;
  const handler=e=>{actions.travel(p.id);if(e.detail>0)button.blur();};button.addEventListener('click',handler);cleanup.push(()=>button.removeEventListener('click',handler));$('planet-map').append(button);mapButtons.push(button);
 }
 const pointer=e=>{if(!$('settings').hidden&&!e.target.closest('#settings,#settings-button')){$('settings').hidden=true;$('settings-button').setAttribute('aria-expanded','false');}};
 window.addEventListener('pointerdown',pointer);cleanup.push(()=>window.removeEventListener('pointerdown',pointer));
 function update() {
  const stamp=[state.phase,state.mode,state.targetId,state.completed.size,state.dialogue?.lineIndex,state.settings.muted,state.settings.quality,state.settings.reducedMotion].join('|');
  if(stamp===last)return;last=stamp;
  const p=planetById(state.targetId),index=PLANETS.indexOf(p),phase=state.phase;
  document.body.dataset.phase=phase;
  $('loading').hidden=true;$('opening').hidden=phase!=='opening';$('hud').hidden=phase==='opening';$('dialogue').hidden=phase!=='dialogue';$('flight-caption').hidden=phase!=='return';$('ending').hidden=phase!=='ending';
  $('mode-button').hidden=phase==='opening';$('mode-button').innerHTML=(state.mode==='free'?'חקירה חופשית':'מסע סיפורי')+' <span class="mode-dot"></span>';
  $('mode-button').dataset.mode=state.mode;$('mode-button').disabled=['transit','return','dialogue'].includes(phase);
  $('planet-name').textContent=p.name;$('planet-index').textContent=String(index+1).padStart(2,'0')+' / 10';$('planet-subtitle').textContent=phase==='transit'?'בדרך אל '+p.name:p.subtitle;
  $('mode-caption').textContent=state.mode==='free'?'לגלות, בלי למהר':'המסע שלך';$('progress-caption').textContent=state.mode==='free'?'כל הכוכבים פתוחים':`${state.completed.size} מתוך 9 מפגשים`;
  $('keyboard-hint').textContent=state.mode==='free'?'WASD לתנועה · חיצים לטיול':'חיצים או WASD לתנועה';
  $('interact-label').textContent=canVisit(state,p.id)?'לדבר עם '+names[p.character]:'עוד מפגשים בדרך הביתה';$('interact').disabled=phase!=='explore';
  for(const id of ['previous-planet','next-planet'])$(id).disabled=phase!=='explore';
  for(let i=0;i<mapButtons.length;i++){
   const button=mapButtons[i];button.setAttribute('aria-current',String(PLANETS[i].id===p.id));button.dataset.completed=String(state.completed.has(PLANETS[i].id));button.disabled=phase!=='explore'||!canVisit(state,PLANETS[i].id);
  }
  if(state.dialogue){const dp=planetById(state.dialogue.planetId),line=dp.lines[state.dialogue.lineIndex];$('speaker').textContent=line.name;$('dialogue-text').textContent=line.text;$('line-count').textContent=`${state.dialogue.lineIndex+1} / ${dp.lines.length}`;$('next-line').childNodes[0].textContent=state.dialogue.lineIndex===dp.lines.length-1?(dp.id==='snake'?'בחזרה הביתה ':'עד שניפגש שוב '):'להמשיך ';announce(line.name+': '+line.text);}
  $('sound-button').setAttribute('aria-pressed',String(!state.settings.muted));$('sound-button').setAttribute('aria-label',state.settings.muted?'הפעלת צליל':'השתקת צליל');$('quality').value=state.settings.quality;$('reduced-motion').checked=state.settings.reducedMotion;
 }
 function showError(message){$('loading').hidden=true;$('opening').hidden=true;$('hud').hidden=true;$('error-message').textContent=message;$('error').hidden=false;}
 return {update,announce,toast,showError,dispose(){cleanup.forEach(f=>f());clearTimeout(timer);}};
}
