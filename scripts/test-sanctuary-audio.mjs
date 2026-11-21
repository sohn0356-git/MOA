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
const server=await createServer({configFile:false,root:process.cwd(),base:'/MOA/',plugins:[react()],server:{host:'127.0.0.1',port:4184,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const page=await browser.newPage({viewport:{width:390,height:800},hasTouch:true,isMobile:true}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 let streamed=false
 const firebaseRequests=[]
 page.on('request',r=>{if(new URL(r.url()).hostname==='firebasestorage.googleapis.com')firebaseRequests.push(r.url())})
 page.on('response',r=>{if(new URL(r.url()).pathname==='/MOA/audio/sanctuary-ccm.m4a'&&[200,206].includes(r.status()))streamed=true})
 await page.goto('http://127.0.0.1:4184/MOA/'+folder+'/index.html')
 assert.equal(await page.locator('audio').count(),0,'lobby never fetches the recording')
 assert.equal(streamed,false,'no audio transfer before entry')
 await page.getByRole('button',{name:'입장하기'}).click()
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&a.currentTime>0&&!a.paused},null,{timeout:45000})
 assert.equal(new URL(await page.locator('audio').evaluate(a=>a.src)).origin,new URL(page.url()).origin)
 assert.deepEqual(firebaseRequests,[],'no Firebase Storage requests')
 assert.equal(streamed,true,'same-origin Pages audio stream responded')
 assert.equal(await page.locator('audio').evaluate(a=>a.loop),true)
 assert.equal(await page.locator('audio').evaluate(a=>a.volume),.2)
 assert.equal(await page.locator('iframe').count(),0,'no video player in the chapel')
 assert.equal(await page.locator('.sanctuary-music,.sanctuary-music-heading').count(),0,'there is no music card')
 await page.getByRole('button',{name:'노래 정지'}).click()
 await page.waitForFunction(()=>document.querySelector('audio')?.paused===true)
 assert.equal(await page.locator('audio').evaluate(a=>a.currentTime),0,'stop returns to the beginning')
 await page.getByRole('button',{name:'노래 재생'}).click()
 await page.waitForFunction(()=>document.querySelector('audio')?.paused===false)
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&Number.isFinite(a.duration)&&a.duration>5})
 await page.locator('audio').evaluate(a=>{a.currentTime=a.duration-1})
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&a.currentTime<5&&!a.paused&&!a.seeking},null,{timeout:15000})
 assert.deepEqual(firebaseRequests,[],'seeking and looping never fall back to Firebase')
 await page.screenshot({path:'test-results/faith-sanctuary/pages-m4a-player.png',fullPage:true})
 await page.evaluate(()=>{window.oldAudio=document.querySelector('audio')})
 await page.getByRole('button',{name:'로비로'}).click()
 assert.equal(await page.locator('audio').count(),0)
 assert.equal(await page.evaluate(()=>window.oldAudio.paused&&!window.oldAudio.hasAttribute('src')),true,'exit releases the stream')
 assert.deepEqual(errors,[])
 console.log('GitHub Pages M4A playback without Firebase requests, quiet volume, looping, pause/resume and exit stream cleanup passed.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
