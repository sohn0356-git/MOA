import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.moa-launch-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-boot',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/main.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import {AppShell} from '../src/app/AppShell';createRoot(document.getElementById('root')!).render(<AppShell/>);`)
await writeFile(folder+'/session.ts',`export const auth={currentUser:null as any};export const getFirebaseConfigError=()=>'';export const getFirebaseAuth=()=>auth;export const getFaithAuth=getFirebaseAuth;export const getRealtimeDb=()=>({});export const getFaithDb=getRealtimeDb;export const getFirebaseStorage=()=>({});export const getFaithStorage=getFirebaseStorage;`)
await writeFile(folder+'/hooks.ts',`
import {useEffect,useState} from 'react';import {auth} from './session';
export function useAuth(){const [user,setUser]=useState<any>(null),[loading,setLoading]=useState(true),[mutating,setMutating]=useState(false),[error,setError]=useState('');useEffect(()=>{if(location.search.includes('slow'))return;const t=setTimeout(()=>setLoading(false),1400);return()=>clearTimeout(t)},[]);return {user,isAuthLoading:loading,isAuthMutating:mutating,authError:error,signOutUser:async()=>{auth.currentUser=null;setUser(null)},signInWithGoogle:async()=>{setMutating(true);try{await new Promise(r=>setTimeout(r,(window as any).cancelLogin?600:2200));if((window as any).cancelLogin)throw Error('로그인이 취소되었습니다.');auth.currentUser={uid:'member',displayName:'하늘',email:'hello@example.com',photoURL:null};setUser(auth.currentUser)}catch(e){setError((e as Error).message);throw e}finally{setMutating(false)}}}}
export function useFaithActivity(){const [loading,setLoading]=useState(true);useEffect(()=>{const t=setTimeout(()=>setLoading(false),650);return()=>clearTimeout(t)},[]);return {activityId:'',isLoading:loading,isSwitching:false,error:'',selectActivity:async()=>{},clearActivity:async()=>{}}}
export const useAppUpdate=()=>({hasUpdate:false,isUpdating:false,applyUpdate:async()=>{},updateError:''});
`)
await writeFile(folder+'/db.ts',`export const ref=(_db,path='')=>path;export const get=async path=>{if(location.search.includes('slow'))return new Promise(()=>{});await new Promise(r=>setTimeout(r,2200));return{val:()=>path.startsWith('verse/')?[['고린도후서',1,1,3]]:null}};export const onValue=(node,fn)=>{const t=setTimeout(()=>fn({val:()=>null,size:0}),node==='crossPhotos'?2900:node.endsWith('/meditationEntries')?1800:10);return()=>clearTimeout(t)};export const query=node=>node;export const orderByValue=()=>null;export const startAt=()=>null;export const endAt=()=>null;export const equalTo=()=>null;export const orderByChild=()=>null;export const limitToLast=()=>null;export const onDisconnect=()=>({remove:async()=>{}});export const push=()=>({key:'new'});export const set=async()=>{};export const remove=async()=>{};export const update=async()=>{};export const serverTimestamp=()=>0;export const runTransaction=async()=>{};`)
const server=await createServer({configFile:false,root:process.cwd(),base:'/MOA/',plugins:[react()],resolve:{alias:[...['useAuth','useFaithActivity','useAppUpdate'].map(name=>({find:'../hooks/'+name,replacement:path.resolve(folder+'/hooks.ts')})),...['../../services/faithSession','../../services/firebase'].map(find=>({find,replacement:path.resolve(folder+'/session.ts')})),{find:'firebase/database',replacement:path.resolve(folder+'/db.ts')}]},server:{host:'127.0.0.1',port:4186,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),errors=[]
const url='http://127.0.0.1:4186/MOA/'+folder+'/index.html'
function observe(page){page.on('pageerror',e=>{errors.push(e.message);console.error('Launch page error:',e.message)})}
try{
 for(const width of [360,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:width===768?'reduce':'no-preference'}),page=await context.newPage();observe(page)
  await page.goto(url);await page.getByLabel('MOA 시작 준비').waitFor();await page.waitForFunction(()=>document.querySelector('.moa-launch-art img')?.complete)
  const p=Number(await page.getByRole('progressbar',{name:'앱 준비 진행률'}).getAttribute('value'));assert.ok(p<100)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'launch fits mobile and desktop')
  if(width===768)assert.equal(await page.locator('.moa-launch-art img').evaluate(el=>getComputedStyle(el).animationName),'none')
  await page.screenshot({path:'test-results/faith-boot/launch-'+width+'.png'})
  if(width===360){
   await page.getByLabel('MOA 시작 준비').waitFor({state:'detached'})
   await page.getByRole('button',{name:'구글 로그인'}).click();await page.getByLabel('구글 로그인 준비').waitFor()
   await page.screenshot({path:'test-results/faith-boot/google-signin-launch.png'})
   await page.getByLabel('구글 로그인 준비').waitFor({state:'detached'});await page.getByRole('navigation',{name:'MOA',exact:true}).getByRole('button',{name:'내 기록',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).waitFor()
   assert.equal(await page.locator('main[aria-label="MOA 메인"]').getAttribute('inert'),null)
  }else{await page.getByRole('button',{name:'먼저 둘러보기'}).click();await page.getByLabel('MOA 시작 준비').waitFor({state:'detached'})}
  await page.reload()
  await page.locator('main[aria-label="MOA 메인"]').waitFor()
  assert.equal(await page.locator('.moa-launch').count(),0,'refresh must not replay the welcome loading screen')
  assert.equal(await page.locator('main[aria-label="MOA 메인"]').getAttribute('inert'),null,'account restoration may not cover a refreshed app')
  await context.close()
 }
 const slow=await browser.newContext({viewport:{width:390,height:800}}),page=await slow.newPage();observe(page)
 await page.goto(url+'?slow');await page.getByLabel('MOA 시작 준비').waitFor();assert.notEqual(await page.getByRole('progressbar').getAttribute('value'),'100')
 await page.getByLabel('MOA 시작 준비').waitFor({state:'detached',timeout:12000});await page.getByText(/연결을 기다리는 동안 먼저 둘러볼/).waitFor()
 await page.getByRole('navigation',{name:'MOA',exact:true}).getByRole('button',{name:'내 기록'}).click();await slow.close()
 const cancelled=await browser.newContext({viewport:{width:390,height:800}}),cancel=await cancelled.newPage();observe(cancel)
 await cancel.goto(url);await cancel.getByLabel('MOA 시작 준비').waitFor({state:'detached'});await cancel.evaluate(()=>{window.cancelLogin=true})
 await cancel.getByRole('button',{name:'구글 로그인'}).click();await cancel.getByLabel('구글 로그인 준비').waitFor();await cancel.getByLabel('구글 로그인 준비').waitFor({state:'detached'})
 await cancel.getByRole('alert').filter({hasText:'로그인이 취소되었습니다.'}).waitFor();await cancelled.close()
 assert.deepEqual(errors,[]);console.log('Chapel launch passed: real shell milestones, initial render, Google success/cancel, responsive/reduced-motion, manual skip and slow-connection escape.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
