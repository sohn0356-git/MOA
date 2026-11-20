import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.sanctuary-audio-test'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-sanctuary',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/main.tsx',`
import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import '../src/index.css'
import '../src/apps/meditation/SanctuaryCompact.css'
import {SanctuaryMusic} from '../src/apps/meditation/SanctuaryMusic'
function App(){const [entered,setEntered]=useState(false);return <main style={{padding:20,maxWidth:420,margin:'auto',background:'#f6f4ee',minHeight:'100vh'}}>{entered?<><button onClick={()=>setEntered(false)}>로비로</button><SanctuaryMusic/></>:<button onClick={()=>setEntered(true)}>입장하기</button>}</main>}
createRoot(document.getElementById('root')!).render(<App/>)
`)
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],server:{host:'127.0.0.1',port:4184,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const page=await browser.newPage({viewport:{width:390,height:800},hasTouch:true,isMobile:true}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 let streamed=false
 page.on('response',r=>{if(r.url().includes('/o/videoplayback')&&[200,206].includes(r.status()))streamed=true})
 await page.goto('http://127.0.0.1:4184/'+folder+'/index.html')
 assert.equal(await page.locator('audio').count(),0,'lobby never fetches the recording')
 await page.getByRole('button',{name:'입장하기'}).click()
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&a.currentTime>0&&!a.paused},null,{timeout:45000})
 assert.equal(streamed,true,'real Firebase Storage stream responded')
 assert.equal(await page.locator('audio').evaluate(a=>a.loop),true)
 assert.equal(await page.locator('audio').evaluate(a=>a.volume),.2)
 assert.equal(await page.locator('iframe').count(),0,'no video player in the chapel')
 const volume=page.getByRole('slider',{name:'찬양 음량'})
 await volume.focus();await volume.press('Home');await volume.press('ArrowRight')
 assert.equal(await page.locator('audio').evaluate(a=>a.volume),.01)
 await page.getByRole('button',{name:'찬양 일시정지'}).click()
 await page.waitForFunction(()=>document.querySelector('audio')?.paused===true)
 await page.getByRole('button',{name:'찬양 재생'}).click()
 await page.waitForFunction(()=>document.querySelector('audio')?.paused===false)
 await page.screenshot({path:'test-results/faith-sanctuary/firebase-m4a-player.png',fullPage:true})
 await page.evaluate(()=>{window.oldAudio=document.querySelector('audio')})
 await page.getByRole('button',{name:'로비로'}).click()
 assert.equal(await page.locator('audio').count(),0)
 assert.equal(await page.evaluate(()=>window.oldAudio.paused&&!window.oldAudio.hasAttribute('src')),true,'exit releases the stream')
 assert.deepEqual(errors,[])
 console.log('Firebase M4A playback, quiet volume, looping, pause/resume and exit stream cleanup passed.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
