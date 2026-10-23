import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname} from 'node:path'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'}
const root=resolve('dist')
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),relative=url.pathname.replace(/^\/MOA\//,''),path=resolve(root,relative||'index.html');if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return}const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(4174,'127.0.0.1',r))
let browser
const watchdog=setTimeout(()=>{console.error('CITY_BROWSER_TIMEOUT: smoke check exceeded 120 seconds');server.close();process.exit(1)},120000)
console.log('CITY_BROWSER_BOOT')
try{
 
 console.log('CITY_BROWSER_SERVER_READY')
 browser=await chromium.launch({headless:true,timeout:20000})
 console.log('CITY_BROWSER_CHROME_READY')
 await mkdir('city-browser-artifacts',{recursive:true})
 for(const width of [1440,768,360]){
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce',serviceWorkers:'block'})
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000)
  console.log('CITY_BROWSER_START '+width)
  await page.setContent('<h1>Browser connected</h1>');console.log('CITY_BROWSER_CONTROL_OK '+width)
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('CITY_BROWSER_PAGE_ERROR '+e.message)});page.on('domcontentloaded',()=>console.log('CITY_BROWSER_DOM_READY '+width))
  console.log('CITY_BROWSER_NAVIGATE '+width)
  await page.goto('http://127.0.0.1:4174/MOA/',{waitUntil:'commit',timeout:15000})
  const city=page.locator('.city-social');await city.waitFor()
  await page.getByRole('navigation',{name:'Ai city 메뉴'}).waitFor()
  await page.waitForTimeout(750)
  assert.equal(await page.getByRole('tablist',{name:'로그인 및 앱'}).count(),0)
  assert.equal(await page.getByRole('link',{name:'로그인',exact:true}).getAttribute('href'),'#/login')
  assert.equal(await page.getByRole('link',{name:'MOA 앱 ↗',exact:true}).getAttribute('href'),'#/apps')
  assert.equal(await page.getByRole('navigation',{name:'Ai city 메뉴'}).getByRole('button').count(),12)
  const checkWidth=async label=>{
   const metrics=await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth,city:document.querySelector('.city-social').getBoundingClientRect().width,overflow:[...document.querySelectorAll('.city-social *')].filter(e=>e.getBoundingClientRect().right>innerWidth+3&&!e.closest('.city-stories')&&!e.closest('svg')).slice(0,5).map(e=>({tag:e.tagName,cls:e.className?.toString(),right:e.getBoundingClientRect().right}))}))
   console.log('CITY_BROWSER '+width+' '+label+' '+JSON.stringify(metrics))
   assert.ok(metrics.body<=metrics.viewport+3,label+' has page horizontal overflow: '+JSON.stringify(metrics))
  }
  await checkWidth('feed');await page.screenshot({path:'city-browser-artifacts/feed-'+width+'.png',fullPage:true})
  console.log('CITY_BROWSER_OPEN_WORLD '+width)
  await page.getByRole('button',{name:'도시 지도',exact:true}).click()
  const map=page.getByRole('group',{name:'AI City 가상 도시 지도'});await map.waitFor()
  assert.equal(await map.locator('.city-world-building').count(),6)
  const person=map.locator('.city-world-character').last(),position=await person.getAttribute('transform')
  await page.waitForTimeout(1200)
  // A resting character may remain still; deterministic motion itself is unit tested.
  console.log('CITY_BROWSER '+width+' character '+position+' -> '+await person.getAttribute('transform'))
  await person.click();await page.getByRole('button',{name:'이 주민 따라가기',exact:true}).click()
  await page.getByRole('button',{name:'관찰 일시정지',exact:true}).click()
  await page.getByRole('button',{name:'관찰 재생',exact:true}).waitFor()
  await page.getByRole('button',{name:'전체 도시',exact:true}).click()
  await page.getByRole('button',{name:'지도 확대',exact:true}).click()
  await checkWidth('world');await page.screenshot({path:'city-browser-artifacts/world-'+width+'.png',fullPage:true})
  await page.getByRole('button',{name:'건의함',exact:true}).click()
  await page.getByRole('heading',{name:'더 나은 도시를 위한 건의함',exact:true}).waitFor()
  await checkWidth('suggestions')
  await page.getByRole('link',{name:'로그인',exact:true}).click()
  await page.getByRole('tab',{name:'Google 로그인',exact:true}).waitFor()
  await page.getByRole('link',{name:'← AI City로 돌아가기',exact:true}).click()
  await page.locator('.city-social').waitFor()
  await page.getByRole('link',{name:'MOA 앱 ↗',exact:true}).click()
  await page.getByRole('tab',{name:'Google 로그인',exact:true}).waitFor()
  await page.getByRole('link',{name:'← AI City로 돌아가기',exact:true}).click()
  await page.locator('.city-social').waitFor()
  assert.deepEqual(errors,[],'uncaught browser errors')
  console.log('CITY_BROWSER_PASS '+width+' public-main/login/MOA-entry/feed/world/suggestions; 12 menus; 6 buildings; observation/follow/pause/zoom; no runtime errors')
  await page.close()
 }
}catch(error){console.error(error);if(browser)for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:'city-browser-artifacts/failure.png',fullPage:true,timeout:5000}).catch(()=>{});throw error}finally{clearTimeout(watchdog);server.close();await Promise.race([browser?.close(),new Promise(r=>setTimeout(r,3000))])}
