import assert from 'node:assert/strict'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const folder='.faith-author-smoke'
await mkdir(folder,{recursive:true});await mkdir('test-results/faith-gallery',{recursive:true})
await writeFile(folder+'/index.html','<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script></html>')
await writeFile(folder+'/main.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import {MeditationApp} from '../src/apps/meditation/MeditationApp';createRoot(document.getElementById('root')!).render(<MeditationApp/>);`)
await writeFile(folder+'/session.ts',`const uid=new URLSearchParams(location.search).get('uid')||'ai01';const auth={currentUser:{uid,displayName:'사진 작성자',email:uid+'@example.com',photoURL:''}};export const getFirebaseConfigError=()=>'';export const getFirebaseAuth=()=>auth;export const getFaithAuth=getFirebaseAuth;export const getRealtimeDb=()=>({});export const getFaithDb=getRealtimeDb;export const getFirebaseStorage=()=>({});export const getFaithStorage=getFirebaseStorage;`)
await writeFile(folder+'/storage.ts',`export const ref=(_s,path)=>path;export const deleteObject=async()=>{};export const getDownloadURL=async()=>window.__photo;export const uploadBytesResumable=()=>({snapshot:{ref:'photo'},on:(_event,progress,_error,complete)=>{progress({totalBytes:1,bytesTransferred:1});complete()},cancel:()=>true});`)
await writeFile(folder+'/db.ts',`const data={'sanctuary/avatars/ai01':{name:'사진 작성자',skin:0,hair:0,shirt:0},'sanctuary/prayers':{one:{uid:'ai01',name:'사진 작성자',title:'오늘의 공유 기도',body:'이웃을 위해 기도합니다',createdAt:123,answered:false}}};const listeners=new Map();export const ref=(_db,p='')=>p;export const get=async p=>({val:()=>data[p]||null});export const onValue=(p,fn)=>{if(!listeners.has(p))listeners.set(p,new Set());listeners.get(p).add(fn);fn({val:()=>data[p]||null});return()=>listeners.get(p)?.delete(fn)};export const query=p=>p;export const orderByValue=()=>null;export const startAt=()=>null;export const endAt=()=>null;export const equalTo=()=>null;export const orderByChild=()=>null;export const limitToLast=()=>null;export const onDisconnect=()=>({remove:async()=>{}});export const push=()=>({key:'photo-entry'});export const set=async()=>{};export const remove=async()=>{};export const serverTimestamp=()=>123;export const runTransaction=async()=>{};export const update=async(_ref,updates)=>{window.__writes=updates;for(const [p,v] of Object.entries(updates)){const segments=p.split('/');if(p.startsWith('users/')){const parent=segments.slice(0,-1).join('/');data[parent]={...data[parent],[segments.at(-1)]:v}}else if(p.startsWith('crossPhotos/')){data.crossPhotos||={};const id=segments[1];data.crossPhotos[id]||={};data.crossPhotos[id][segments[2]]=v}}for(const [p,fns] of listeners)for(const fn of fns)fn({val:()=>data[p]||null})};`)
const server=await createServer({configFile:false,root:process.cwd(),base:'/MOA/',plugins:[react()],resolve:{alias:[{find:'../../services/faithSession',replacement:path.resolve(folder+'/session.ts')},{find:'../../services/firebase',replacement:path.resolve(folder+'/session.ts')},{find:'firebase/database',replacement:path.resolve(folder+'/db.ts')},{find:'firebase/storage',replacement:path.resolve(folder+'/storage.ts')}]},server:{host:'127.0.0.1',port:4187,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,...(process.env.MOA_BROWSER_PATH?{executablePath:process.env.MOA_BROWSER_PATH}:{channel:'chrome'})}),errors=[]
try{
 const page=await browser.newPage({viewport:{width:390,height:850}});page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:4187/MOA/'+folder+'/index.html')
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');x.fillStyle='#bac6a9';x.fillRect(0,0,300,400);x.fillStyle='#f7f3d7';x.fillRect(139,80,22,180);x.fillRect(95,120,110,22);window.__photo=c.toDataURL('image/png');return window.__photo.split(',')[1]})
 const nav=page.getByRole('navigation',{name:'모아',exact:true})
 await nav.getByRole('button',{name:'피드',exact:true}).click()
 await page.getByRole('button',{name:'십자가 사진 올리기',exact:true}).click()
 await page.getByLabel('사진 선택').setInputFiles({name:'cross.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')})
 await page.getByRole('textbox',{name:'짧은 문장'}).fill('사진으로 함께 남긴 묵상')
 await page.getByRole('button',{name:'피드에 올리기',exact:true}).click()
 await page.waitForFunction(()=>Boolean(window.__writes))
 const writes=await page.evaluate(()=>window.__writes)
 assert.ok(writes['users/ai01/meditationEntries/photo-entry'].photoUrl)
 assert.equal(writes['crossPhotos/devotion_ai01_photo-entry/imageUrl'],writes['users/ai01/meditationEntries/photo-entry'].photoUrl)
 assert.equal(writes['users/ai01/meditationEntries/photo-entry'].authorUid,'ai01')
 await page.getByRole('button',{name:/작성자 보기/}).click()
 await page.getByRole('dialog',{name:'작성자의 나눔'}).waitFor()
 await page.getByRole('button',{name:'기도제목',exact:true}).click()
 await page.getByRole('heading',{name:'오늘의 공유 기도'}).waitFor()
 await page.screenshot({path:'test-results/faith-gallery/author-prayers-mobile.png'})
 await page.getByRole('button',{name:'작성자의 나눔 닫기',exact:true}).click()
 await page.screenshot({path:'test-results/faith-gallery/author-avatar-mobile.png'})
 await nav.getByRole('button',{name:'묵상·기도'}).click()
 await page.getByRole('tab',{name:'내 묵상'}).click()
 await page.getByText('사진으로 함께 남긴 묵상',{exact:true}).click()
 await page.getByAltText('묵상에 올린 사진').waitFor()
 await page.goto('http://127.0.0.1:4187/MOA/'+folder+'/index.html?uid=ordinary')
 await page.getByRole('navigation',{name:'모아',exact:true}).getByRole('button',{name:'피드',exact:true}).click()
 assert.equal(await page.getByRole('button',{name:'십자가 사진 올리기',exact:true}).count(),0)
 assert.deepEqual(errors,[])
 console.log('Photo upload: one atomic personal/public save, author avatar and shared prayers dialog, personal photo detail, and non-AI upload UI restriction passed in mobile Chromium.')
}finally{await browser.close();await server.close();await rm(folder,{recursive:true,force:true})}
