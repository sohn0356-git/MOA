import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.notification-intro-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-notifications',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/main.tsx',`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import {NotificationPermissionIntro} from '../src/components/NotificationPermissionIntro';function App(){const [ready,setReady]=useState(false);return <><button onClick={()=>setReady(true)}>앱 준비 완료</button><NotificationPermissionIntro ready={ready}/></>}createRoot(document.getElementById('root')).render(<App/>);`)
const server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],server:{host:'127.0.0.1',port:4194,strictPort:true}});await server.listen()
const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),errors=[]
try{
 for(const width of [360,768,1440]){
  const context=await browser.newContext({viewport:{width,height:850}})
  await context.addInitScript(({denied})=>{window.permissionRequests=0;Object.defineProperty(window,'Notification',{configurable:true,value:{permission:denied?'denied':'default',requestPermission:async()=>{window.permissionRequests++;return 'granted'}}})},{denied:width===1440})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4194/'+folder+'/index.html')
  assert.equal(await page.getByRole('dialog').count(),0,'no prompt during startup');assert.equal(await page.evaluate(()=>window.permissionRequests),0)
  await page.getByRole('button',{name:'앱 준비 완료',exact:true}).click()
  if(width===1440){assert.equal(await page.getByRole('dialog').count(),0,'denied permission must not be requested again');await context.close();continue}
  await page.getByRole('dialog',{name:'모아 알림을 허용할까요?',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.permissionRequests),0,'requires an explicit gesture before requesting native permission');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`test-results/faith-notifications/permission-intro-${width}.png`})
  await page.getByRole('button',{name:width===360?'나중에':'알림 허용',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.permissionRequests),width===360?0:1);assert.equal(await page.evaluate(()=>localStorage.getItem('moa.notification-intro.v1')),'1')
  await page.reload();await page.getByRole('button',{name:'앱 준비 완료',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0,'does not repeat on refresh');assert.equal(await page.evaluate(()=>window.permissionRequests),0);await context.close()
 }
 assert.deepEqual(errors,[]);console.log('Permission introduction: startup gating, gesture-only native request, later/grant persistence, no repeated refresh prompt and denied-state handling passed.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
