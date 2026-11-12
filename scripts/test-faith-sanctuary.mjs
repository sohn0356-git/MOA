import assert from 'node:assert/strict'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright'
const folder='.faith-sanctuary-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-sanctuary',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/main.tsx',`
import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import '../src/index.css'
import '../src/apps/meditation/FaithSocial.css'
import {SanctuaryTab} from '../src/apps/meditation/SanctuaryTab'
function App(){
 const [member,setMember]=useState<{uid:string;displayName:string}|null>(null)
 const [destination,setDestination]=useState('')
 return <main className="faith-screen faith-social" data-church-active="true" style={{minHeight:'100vh',paddingBottom:24}}>
  <header className="faith-header"><h2>예배당</h2>{member&&<button onClick={()=>setMember(null)}>로그아웃 검사</button>}</header>
  <div className="faith-content" style={{padding:'20px'}}>
   <SanctuaryTab member={member} onSignIn={async()=>setMember({uid:'visual-member',displayName:'하늘'})}
    scripture={{reference:'요한복음 14:27',text:'평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라'}}
    onRead={()=>setDestination('말씀')} onPrayer={()=>setDestination('기도 작성')}/>
   {destination&&<output>{destination}</output>}
  </div>
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>)
`)
const server=await createServer({configFile:false,root:process.cwd(),base:'/MOA/',plugins:[react()],server:{host:'127.0.0.1',port:4180,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.clock.install({time:new Date('2026-11-12T03:00:00Z')})
 for(const width of [360,768,1440]){
  await page.setViewportSize({width,height:950})
  await page.goto('http://127.0.0.1:4180/MOA/'+folder+'/index.html')
  await page.getByRole('button',{name:'로그인하고 예배당 입장'}).waitFor()
  await page.evaluate(()=>localStorage.clear())
  assert.equal(await page.getByRole('textbox',{name:'예배당 개인 기도 메모'}).count(),0,'no personal sanctuary before login')
  await page.screenshot({path:'test-results/faith-sanctuary/gate-'+width+'.png',fullPage:true})
  await page.getByRole('button',{name:'로그인하고 예배당 입장'}).click()
  await page.getByRole('textbox',{name:'예배당 개인 기도 메모'}).waitFor()
  const avatar=page.locator('.sanctuary-avatar-anchor')
  await avatar.waitFor()
  const before=Number(await avatar.getAttribute('data-avatar-z'))
  await page.getByRole('group',{name:'아바타 이동이 가능한 예배당',exact:true}).focus()
  await page.keyboard.down('w');await page.clock.runFor(500);await page.keyboard.up('w')
  assert.ok(Number(await avatar.getAttribute('data-avatar-z'))<before-.1,'keyboard walks forward')
  const x=Number(await avatar.getAttribute('data-avatar-x'))
  const right=page.getByRole('button',{name:'아바타 오른쪽 이동'})
  const control=await right.boundingBox();assert.ok(control)
  await page.mouse.move(control.x+control.width/2,control.y+control.height/2);await page.mouse.down()
  await page.clock.runFor(200)
  await page.mouse.up()
  assert.ok(Number(await avatar.getAttribute('data-avatar-x'))>x,'touch controls move avatar')
  const art=await page.locator('.sanctuary-room-art').boundingBox();assert.ok(art)
  await page.mouse.click(art.x+art.width/2,art.y+art.height*(346/480))
  await page.clock.runFor(1800)
  assert.ok(Math.abs(Number(await avatar.getAttribute('data-avatar-x')))<.06,'floor tap follows aisle')
  assert.ok(Number(await avatar.getAttribute('data-avatar-z'))<.45,'floor tap walks to chosen depth')
  await page.getByRole('button',{name:'뒤쪽 오른편 자리 선택'}).click()
  assert.equal(await page.getByRole('button',{name:'뒤쪽 오른편 자리 선택'}).getAttribute('aria-pressed'),'true')
  await page.getByRole('button',{name:'저녁',exact:true}).click()
  assert.equal(await page.locator('[aria-label="나의 예배당"]').getAttribute('data-light'),'evening')
  await page.getByRole('button',{name:'촛불 켜기'}).click()
  await page.getByRole('textbox',{name:'예배당 개인 기도 메모'}).fill('이 계정에 남기는 조용한 기도')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow')
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:'test-results/faith-sanctuary/evening-'+width+'.png',fullPage:true})
  await page.getByRole('button',{name:'새벽',exact:true}).click()
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:'test-results/faith-sanctuary/sanctuary-'+width+'.png',fullPage:true})
 }
 await page.getByRole('button',{name:'기도 시작'}).click()
 await page.clock.fastForward(10000)
 assert.equal(await page.getByRole('timer').innerText(),'04:50')
 await page.getByRole('button',{name:'잠시 멈춤'}).click()
 await page.clock.fastForward(10000)
 assert.equal(await page.getByRole('timer').innerText(),'04:50')
 await page.getByRole('button',{name:'예배당 종소리 듣기'}).click()
 await page.getByText('작은 종소리를 울렸습니다.').waitFor()
 await page.reload()
 await page.getByRole('button',{name:'로그인하고 예배당 입장'}).click()
 assert.equal(await page.getByRole('textbox',{name:'예배당 개인 기도 메모'}).inputValue(),'이 계정에 남기는 조용한 기도')
 await page.getByRole('button',{name:'로그아웃 검사'}).click()
 assert.equal(await page.getByRole('textbox',{name:'예배당 개인 기도 메모'}).count(),0,'logout removes private notes immediately')
 assert.deepEqual(errors,[])
 console.log('Sanctuary passed at 360/768/1440px: authentication gate, seating, lighting, candle, note restoration, timer pause and bell playback.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
