import assert from 'node:assert/strict'
import {preview} from 'vite'
import {chromium} from 'playwright'
const server=await preview({preview:{host:'127.0.0.1',port:4184,strictPort:true}})
const browser=await chromium.launch({headless:true,executablePath:process.env.MOA_BROWSER_PATH||'/usr/bin/chromium'})
try{
 for(const cached of [true,false]){
  const context=await browser.newContext({viewport:{width:390,height:850},isMobile:true,hasTouch:true})
  await context.routeWebSocket(/firebaseio|firebasedatabase/,socket=>socket.close())
  await context.route(/firebaseio|firebasedatabase/,route=>route.abort())
  await context.addInitScript(({cached})=>{
   localStorage.setItem('moa.notification-intro.v1','1')
   if(cached)localStorage.setItem('moa.public-feed.v1',JSON.stringify({savedAt:Date.now(),photos:[{id:'cached-public',imageUrl:'/MOA/icons/chapel-v1-192.png',caption:'저장된 공개 묵상',authorName:'이웃',audience:'public',createdAt:new Date().toISOString(),selectedDate:'2026-11-28'}]}))
  },{cached})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const start=Date.now()
  await page.goto('http://127.0.0.1:4184/MOA/')
  await page.getByRole('button',{name:'로그인하고 예배당 입장',exact:true}).waitFor()
  assert.equal(await page.locator('.moa-launch').count(),0,'unavailable scripture/feed must not block the chapel')
  const elapsed=Date.now()-start
  await page.getByRole('button',{name:'피드',exact:true}).click()
  if(cached)await page.getByRole('button',{name:/저장된 공개 묵상/}).waitFor()
  else await page.getByRole('status',{name:'피드를 불러오는 중'}).waitFor()
  assert.equal(await page.getByText(/아직 공개 글이 없어요/).count(),0,'pending feeds must not flash empty')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({cached,chapelReadyMs:elapsed,network:'Firebase blocked',feed:cached?'cached photo':'skeleton'}))
  await context.close()
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
