"""Recovery, accessible keyboard controls, reduced motion and tablet touch QA."""
import os, json, sys
from playwright.sync_api import sync_playwright
case=sys.argv[1] if len(sys.argv)>1 else 'all'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('GALAXY_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=b.new_context(viewport={'width':1024,'height':768},has_touch=True,reduced_motion='reduce')
 context.add_init_script("localStorage.setItem('little-galaxy-v1',JSON.stringify({mode:'free',completed:[],settings:{quality:'low',muted:true,reducedMotion:true}}))")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('GALAXY_TEST_URL','http://127.0.0.1:8000/'))
 page.get_by_role('button',name='לטייל בחופשיות',exact=True).click()
 if case in ['all','escape']:
  page.locator('#interact').click();page.locator('#next-line').focus();page.keyboard.press('Escape')
  assert page.locator('#dialogue').is_hidden(),'Escape must close a dialogue with keyboard focus inside it'
 if case in ['all','bfcache']:
  page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
  before=page.evaluate("async()=>(await import('./code/game.js')).world.frames")
  page.wait_for_timeout(600)
  after=page.evaluate("async()=>(await import('./code/game.js')).world.frames")
  assert after>before,'Restored game must keep drawing after bfcache pageshow'
 if case in ['all','tablet']:
  pad=page.get_by_role('button',name='תנועה קדימה',exact=True)
  assert pad.is_visible(),'Tablet touch controls must remain available beyond 700px width'
  rect=pad.bounding_box();assert rect['width']>=40
  map_target=page.locator('#planet-map button').first.bounding_box()
  assert map_target['width']>=40,'Tablet planet selection needs comfortable touch targets'
  page.evaluate("async()=>{window.qaGame=await import('./code/game.js')}")
  before=page.evaluate('qaGame.state.position.z')
  page.mouse.move(rect['x']+rect['width']/2,rect['y']+rect['height']/2);page.mouse.down()
  page.wait_for_function('z=>qaGame.state.position.z<z-.1',arg=before)
  page.mouse.up()
 if case in ['all','mobile']:
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300)
  overflow=page.evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.id||e.className)})")
  assert overflow['scroll']<=overflow['width'],overflow
  if case=='all':page.set_viewport_size({'width':1024,'height':768})
 if case=='all':
  page.locator('#settings-button').click();page.locator('#reduced-motion').uncheck();page.locator('#settings-button').click()
  page.get_by_role('button',name='מעבר אל הנחש',exact=True).click()
  page.wait_for_function("document.body.dataset.phase==='explore'")
  page.locator('#interact').click()
  while page.locator('#dialogue').is_visible():page.locator('#next-line').click()
  page.locator('#ending').wait_for(state='visible',timeout=45000)
  page.locator('#restart').click()
  page.locator('#settings-button').click();page.locator('#reduced-motion').check();page.locator('#settings-button').click()
  assert page.evaluate("async()=>(await import('./code/game.js')).state.settings.reducedMotion")
  page.get_by_role('button',name='מעבר אל השועל',exact=True).click();page.wait_for_function("document.body.dataset.phase==='explore'")
  page.screenshot(path='/tmp/galaxy-3d-tablet.png')
 assert not errors,errors
 print(json.dumps({'status':'passed','case':case,'errors':errors}))
 context.close();b.close()
