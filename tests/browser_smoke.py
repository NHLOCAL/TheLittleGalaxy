"""Rendered gameplay checks. Run against npm run dev; artifacts stay outside the repo."""
import os, json, time, hashlib
from playwright.sync_api import sync_playwright

BASE = os.environ.get('GALAXY_TEST_URL', 'http://127.0.0.1:8000/')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('GALAXY_CHROMIUM','/usr/bin/chromium'), headless=True,
        args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1440,'height':900})
    errors, failed = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: failed.append((r.url,r.status)) if r.status >= 400 else None)
    page.goto(BASE)
    page.get_by_role('button',name='לצאת למסע',exact=True).wait_for(timeout=20000)
    assert page.locator('#world').is_visible()
    page.screenshot(path='/tmp/galaxy-3d-opening.png')
    page.get_by_role('button',name='לטייל בחופשיות',exact=True).click()
    # Software WebGL runs functional coverage at low quality; visual captures also verify high quality separately.
    page.locator('#settings-button').click();page.locator('#quality').select_option('low');page.locator('#settings-button').click()
    page.locator('#planet-name').filter(has_text='כוכב הבית').wait_for()
    def arrival(name):
        page.wait_for_function("name => document.body.dataset.phase === 'explore' && document.querySelector('#planet-name').textContent === name", arg=name,timeout=45000)
    def go(name):
        page.get_by_role('button',name='מעבר אל '+name,exact=True).click()
        arrival(name)
        print('Arrived:',name,flush=True)
    def state():
        return page.evaluate("async()=>{const {state,world}=await import('./code/game.js');return {phase:state.phase,mode:state.mode,completed:[...state.completed],position:state.position,frames:world.frames,calls:world.renderer.info.render.calls}}")
    def conversation():
        page.locator('#interact').click()
        page.locator('#dialogue').wait_for(state='visible')
        count=0
        while page.locator('#dialogue').is_visible():
            assert page.locator('#dialogue-text').inner_text().strip()
            page.locator('#next-line').click()
            count+=1
        return count
    page.get_by_role('button',name='הכוכב הבא',exact=True).click();arrival('המלך')
    page.wait_for_timeout(800);page.screenshot(path='/tmp/galaxy-3d-king.png')
    page.keyboard.press('ArrowRight',delay=80);arrival('האיש הגאה')
    page.keyboard.press('ArrowLeft',delay=80);arrival('המלך')
    assert state()['completed']==[]
    for name,key in [('השיכור','drunkard'),('איש העסקים','businessman'),('מדליק הפנסים','lamplighter'),('הגאוגרף','geographer'),('השועל','fox'),('כדור הארץ','earth'),('הנחש','snake')]:
        go(name);page.wait_for_timeout(500);page.screenshot(path='/tmp/galaxy-3d-'+key+'.png')
    assert state()['phase']=='explore' # Snake proximity must not bite.
    # State changes and actual rendered pixels must both progress throughout the flight.
    conversation()
    page.wait_for_function("document.body.dataset.phase==='return'")
    samples=[];frame_hashes=[]
    for label in ['takeoff','flight','approach']:
        samples.append(state());frame_hashes.append(hashlib.sha256(page.screenshot(path='/tmp/galaxy-3d-'+label+'.png')).hexdigest());page.wait_for_timeout(1100)
    page.locator('#ending').wait_for(state='visible',timeout=45000)
    ending=state();page.screenshot(path='/tmp/galaxy-3d-homecoming.png')
    assert ending['frames']>samples[0]['frames']+5
    assert ending['position']['x']==1.25 and ending['position']['z']==.65
    assert any(s['position']!=samples[0]['position'] for s in samples[1:])
    assert len(set(frame_hashes))==3
    page.get_by_role('button',name='לצאת למסע חדש',exact=True).click();arrival('כוכב הבית')
    page.locator('#mode-button').click() # Story mode is restored independently.
    assert page.get_by_role('button',name='מעבר אל הנחש',exact=True).is_disabled()
    total=0
    for name in ['כוכב הבית','המלך','האיש הגאה','השיכור','איש העסקים','מדליק הפנסים','הגאוגרף','השועל','כדור הארץ']:
        go(name);total+=conversation()
    assert len(state()['completed'])==9
    assert page.get_by_role('button',name='מעבר אל הנחש',exact=True).is_enabled()
    page.reload();page.get_by_role('button',name='לצאת למסע',exact=True).click()
    assert len(state()['completed'])==9
    # Held movement clears on blur; focused selects do not navigate.
    page.evaluate("async()=>{window.qaGame=await import('./code/game.js')}")
    before=state()['position'];page.keyboard.down('KeyD');page.wait_for_function('x=>qaGame.state.position.x>x+.1',arg=before['x']);page.keyboard.up('KeyD')
    assert state()['position']['x']>before['x']
    page.keyboard.down('KeyD');page.evaluate("window.dispatchEvent(new Event('blur'))");before=state()['position'];page.wait_for_timeout(300);page.keyboard.up('KeyD')
    assert abs(state()['position']['x']-before['x'])<.1
    page.locator('#settings-button').click();page.locator('#quality').select_option('low');page.locator('#quality').focus();before=state()
    page.keyboard.press('ArrowRight');assert state()['phase']=='explore'
    page.locator('#settings-button').click()
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(500);page.screenshot(path='/tmp/galaxy-3d-mobile.png')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    pad=page.get_by_role('button',name='תנועה קדימה',exact=True);box=pad.bounding_box();before=state()['position']
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down()
    page.wait_for_function('z=>qaGame.state.position.z<z-.1',arg=before['z']);page.mouse.up()
    assert state()['position']['z']<before['z']
    assert not errors, errors
    assert not failed, failed
    print(json.dumps({'status':'passed','story_dialogue_lines':total,'checks':['real WebGL entry','free arrows and map','all ten planets','no automatic snake bite','rendered return frames','exact home landing','restart','all story conversations','ending unlock','save reload','manual motion','blur cleanup','focused select','mobile layout','touch controls'],'flight_samples':samples,'ending':ending,'errors':errors,'failed_requests':failed},ensure_ascii=False))
    browser.close()
