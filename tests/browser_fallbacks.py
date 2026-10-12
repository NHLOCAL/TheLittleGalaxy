"""Verify GitHub Pages subpath deployment and actual error surfaces."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import os, json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
 def do_GET(self):
  if self.path.startswith('/TheLittleGalaxy/'):
   self.path=self.path[len('/TheLittleGalaxy'):]
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/TheLittleGalaxy/'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('GALAXY_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=b.new_page(viewport={'width':800,'height':600});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);page.get_by_role('button',name='לטייל בחופשיות',exact=True).click()
  assert page.locator('body').get_attribute('data-phase')=='explore'
  assert not errors,errors
  page.close()
  page=b.new_page();page.route('**/code/scene.js',lambda route:route.abort())
  page.goto(base);page.locator('#error').wait_for(state='visible');assert 'לא הצלחנו לטעון' in page.locator('#error-message').inner_text()
  assert page.locator('#loading').is_hidden();page.close()
  page=b.new_page();page.add_init_script("const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return context.call(this,type,...args)}")
  page.goto(base);page.locator('#error').wait_for(state='visible');assert 'WebGL' in page.locator('#error-message').inner_text()
  assert page.locator('#loading').is_hidden();page.close();b.close()
 print(json.dumps({'status':'passed','checks':['GitHub Pages subpath loads real 3D game','failed module shows retry surface','missing WebGL shows readable error']}))
finally:server.shutdown();server.server_close()
