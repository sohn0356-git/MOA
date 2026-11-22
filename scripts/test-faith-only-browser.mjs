import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium} from 'playwright'
await mkdir('test-results/faith-boot',{recursive:true})
const server=await preview({preview:{host:'127.0.0.1',port:4183,strictPort:true}})
const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})})
try{
 const staticContext=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false})
 const staticPage=await staticContext.newPage();await staticPage.goto('http://127.0.0.1:4183/MOA/');assert.equal(await staticPage.locator('.moa-boot').isVisible(),true,'chapel artwork is visible before JavaScript loads');await staticPage.screenshot({path:'test-results/faith-boot/static-chapel-boot.png'});await staticContext.close()
 const returning=await browser.newContext({viewport:{width:390,height:850}})
 const returningPage=await returning.newPage()
 await returningPage.addInitScript(()=>sessionStorage.setItem('moa.launch.seen.v1','1'))
 await returningPage.route('**/*.js',route=>route.fulfill({contentType:'text/javascript',body:''}))
 await returningPage.goto('http://127.0.0.1:4183/MOA/')
 assert.equal(await returningPage.locator('.moa-boot').isVisible(),false,'returning users must not see static boot art before React loads')
 await returning.close()
 const context=await browser.newContext({viewport:{width:390,height:950},hasTouch:true,isMobile:true})
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Production page error:',e.message)})
 const times=[]
 for(const route of ['', '#/ai-city','#/apps','#/suggestions','#/mini-room','#/home/legacy','#/timer','#/login']){
  const start=Date.now();await page.goto('http://127.0.0.1:4183/MOA/'+route)
  await page.waitForFunction(()=>!document.querySelector('.moa-boot'))
  await page.waitForFunction(()=>!document.querySelector('.moa-launch')||document.querySelector('.moa-launch-skip'))
  if(await page.locator('.moa-launch-skip').count())await page.getByRole('button',{name:'먼저 둘러보기'}).click()
  await page.getByRole('main',{name:'MOA 메인'}).waitFor()
  await page.waitForURL('**/#/meditation')
  await page.locator('.faith-bottom-nav button').first().waitFor()
  times.push({route,milliseconds:Date.now()-start})
  assert.equal(await page.title(),'MOA','browser and installed branding use the new chapel name')
  assert.equal(new URL(page.url()).hash,'#/meditation','all retired routes resolve to Faith')
  assert.equal(await page.locator('.faith-bottom-nav button').count(),5)
  assert.equal(await page.getByRole('button',{name:'예배당',exact:true}).getAttribute('aria-current'),'page','sanctuary is the launch tab')
  assert.equal(await page.locator('.app-grid,.city-main-app,.app-tile').count(),0)
 }
 await page.getByRole('button',{name:'예배당',exact:true}).click()
 await page.getByRole('button',{name:'로그인하고 예배당 입장'}).waitFor()
 assert.equal(await page.getByRole('textbox',{name:'예배당 개인 기도 메모'}).count(),0)
 assert.equal(await page.getByText('MOA 홈으로 돌아가기',{exact:true}).count(),0)
 await page.screenshot({path:'test-results/faith-boot/faith-only-mobile.png',fullPage:true})
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/faith-boot/faith-only-desktop.png',fullPage:true})
 assert.deepEqual(errors,[])
 await writeFile('test-results/faith-boot/local-load-times.json',JSON.stringify(times,null,2))
 console.log('Production Faith-only startup passed: root, seven retired routes, five tabs, sanctuary gate and no other app UI.',JSON.stringify(times))
 await context.close()
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
