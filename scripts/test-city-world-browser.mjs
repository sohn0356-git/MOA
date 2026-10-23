import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4174'],{stdio:'ignore'})
let browser
try{
 for(let n=0;n<60;n++){try{if((await fetch('http://127.0.0.1:4174/MOA/')).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({headless:true,channel:'chrome'})
 await mkdir('city-browser-artifacts',{recursive:true})
 for(const width of [1440,768,360]){
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:4174/MOA/',{waitUntil:'domcontentloaded'})
  const city=page.locator('.city-social');await city.waitFor()
  await page.getByRole('navigation',{name:'Ai city 메뉴'}).waitFor()
  await page.waitForTimeout(750)
  assert.equal(await page.getByRole('navigation',{name:'Ai city 메뉴'}).getByRole('button').count(),12)
  const checkWidth=async label=>{
   const metrics=await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth,city:document.querySelector('.city-social').getBoundingClientRect().width,overflow:[...document.querySelectorAll('.city-social *')].filter(e=>e.getBoundingClientRect().right>innerWidth+3&&!e.closest('.city-stories')&&!e.closest('svg')).slice(0,5).map(e=>({tag:e.tagName,cls:e.className?.toString(),right:e.getBoundingClientRect().right}))}))
   console.log('CITY_BROWSER '+width+' '+label+' '+JSON.stringify(metrics))
   assert.ok(metrics.body<=metrics.viewport+3,label+' has page horizontal overflow: '+JSON.stringify(metrics))
  }
  await checkWidth('feed');await page.screenshot({path:'city-browser-artifacts/feed-'+width+'.png',fullPage:true})
  await page.getByRole('button',{name:'도시 지도',exact:true}).click()
  const map=page.getByRole('group',{name:'AI City 가상 도시 지도'});await map.waitFor()
  assert.equal(await map.locator('.city-world-building').count(),6)
  const person=map.locator('.city-world-character').first(),position=await person.getAttribute('transform')
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
  assert.deepEqual(errors,[],'uncaught browser errors')
  console.log('CITY_BROWSER_PASS '+width+' feed/world/suggestions; 12 menus; 6 buildings; observation/follow/pause/zoom; no runtime errors')
  await page.close()
 }
}finally{await browser?.close();server.kill()}
